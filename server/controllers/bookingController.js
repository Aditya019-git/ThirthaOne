const crypto = require('crypto');
const Booking = require('../models/Booking');
const DailyLimit = require('../models/DailyLimit');
const User = require('../models/User');
const Payment = require('../models/Payment');
const { validationResult } = require('express-validator');
const { generateBookingQrDataUrl } = require('../utils/qr');
const { sendBookingConfirmationEmail } = require('../utils/mailer');
const {
  isPaymentRequired,
  calculateBookingAmount,
  toPaise,
  getRazorpayClient
} = require('../utils/razorpay');
const {
  formatDateKey,
  getTodayDateKey,
  getBookingStatusForDate
} = require('../utils/bookingRules');

const ALLOWED_TIME_SLOTS = [
  '05:00 AM - 07:00 AM',
  '07:00 AM - 09:00 AM',
  '09:00 AM - 11:00 AM',
  '11:00 AM - 01:00 PM',
  '01:00 PM - 03:00 PM',
  '03:00 PM - 05:00 PM',
  '05:00 PM - 07:00 PM',
  '07:00 PM - 09:00 PM',
  '09:00 PM - 11:00 PM'
];
const PASS_CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const PASS_CODE_LENGTH = 8;

const serializeBooking = (bookingDoc) => {
  const booking = bookingDoc.toObject ? bookingDoc.toObject() : bookingDoc;
  return {
    ...booking,
    headDevoteeAadhaar: booking.headDevoteeAadhaar
      ? `XXXXXXXX${String(booking.headDevoteeAadhaar).slice(-4)}`
      : null
  };
};

const ensureBookingQr = async (booking) => {
  if (booking.qrCode) return booking;
  booking.qrCode = await generateBookingQrDataUrl(booking);
  await booking.save();
  return booking;
};

const secureCompare = (a = '', b = '') => {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
};

const verifyRazorpaySignature = ({ orderId, paymentId, signature }) => {
  const secret = process.env.RAZORPAY_KEY_SECRET || '';
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  return secureCompare(expected, signature);
};

const isMongoObjectId = (value = '') => /^[a-fA-F0-9]{24}$/.test(String(value).trim());

const normalizePassCode = (value = '') =>
  String(value)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

const generatePassCode = () => {
  let code = '';
  for (let i = 0; i < PASS_CODE_LENGTH; i += 1) {
    const idx = Math.floor(Math.random() * PASS_CODE_ALPHABET.length);
    code += PASS_CODE_ALPHABET[idx];
  }
  return code;
};

const generateAvailablePassCode = async () => {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const candidate = generatePassCode();
    const existing = await Booking.exists({ bookingCode: candidate });
    if (!existing) return candidate;
  }

  throw new Error('Unable to generate unique pass code.');
};

const parseScanLookup = ({ bookingId, bookingCode, passCode, qrData }) => {
  const directBookingId = String(bookingId || '').trim();
  if (directBookingId && isMongoObjectId(directBookingId)) {
    return { bookingId: directBookingId, bookingCode: '' };
  }

  const directPassCode = normalizePassCode(bookingCode || passCode || directBookingId);
  if (directPassCode) {
    if (isMongoObjectId(directPassCode)) {
      return { bookingId: directPassCode.toLowerCase(), bookingCode: '' };
    }
    return { bookingId: '', bookingCode: directPassCode };
  }

  const raw = String(qrData || '').trim();
  if (!raw) return { bookingId: '', bookingCode: '' };

  try {
    const parsed = JSON.parse(raw);
    const parsedBookingId = String(parsed?.bookingId || '').trim();
    if (parsedBookingId && isMongoObjectId(parsedBookingId)) {
      return { bookingId: parsedBookingId, bookingCode: '' };
    }

    const parsedPassCode = normalizePassCode(parsed?.bookingCode || parsed?.passCode || '');
    if (parsedPassCode) {
      if (isMongoObjectId(parsedPassCode)) {
        return { bookingId: parsedPassCode.toLowerCase(), bookingCode: '' };
      }
      return { bookingId: '', bookingCode: parsedPassCode };
    }
  } catch (_error) {
    // fallback: some scanners may send plain text pass code / booking id.
  }

  if (isMongoObjectId(raw)) {
    return { bookingId: raw, bookingCode: '' };
  }

  return { bookingId: '', bookingCode: normalizePassCode(raw) };
};

const applyEmailStatusToBooking = async (booking, delivery, fallbackError = '') => {
  if (delivery?.delivered) {
    booking.confirmationEmailStatus = 'sent';
    booking.confirmationEmailSentAt = new Date();
    booking.confirmationEmailLastError = undefined;
  } else if (delivery?.simulated) {
    booking.confirmationEmailStatus = 'simulated';
    booking.confirmationEmailLastError = delivery?.message || 'SMTP not configured.';
  } else {
    booking.confirmationEmailStatus = 'failed';
    booking.confirmationEmailLastError = delivery?.message || fallbackError || 'Email delivery failed.';
  }

  await booking.save();
};

const decrementDailyCountForBooking = async (booking) => {
  const bookingDateKey = formatDateKey(booking.bookingDate);
  if (!bookingDateKey || !booking.memberCount) return;

  await DailyLimit.findOneAndUpdate(
    { date: bookingDateKey, bookedCount: { $gte: booking.memberCount } },
    { $inc: { bookedCount: -booking.memberCount }, $set: { isOpen: true } }
  );
};

const finalizeBookingAfterPayment = async (booking) => {
  if (booking.status !== 'confirmed') {
    booking.status = 'confirmed';
    await booking.save();
  }

  let qrReady = true;
  try {
    await ensureBookingQr(booking);
  } catch (qrError) {
    qrReady = false;
    console.error(`[BookingQR] Failed after payment for booking ${booking._id}: ${qrError.message}`);
  }

  let emailDelivery = { delivered: false, simulated: false, message: 'No email found for this user.' };
  const owner = await User.findById(booking.user).select('name email');

  if (booking.confirmationEmailStatus === 'sent') {
    emailDelivery = { delivered: true, simulated: false, message: 'Confirmation email already sent.' };
  } else if (owner?.email) {
    emailDelivery = await sendBookingConfirmationEmail({
      to: owner.email,
      name: owner.name || booking.headDevoteeName,
      booking,
      qrCode: booking.qrCode
    });
    await applyEmailStatusToBooking(booking, emailDelivery);
  } else {
    booking.confirmationEmailStatus = 'no_email';
    booking.confirmationEmailLastError = 'No email present on devotee profile.';
    await booking.save();
  }

  return { qrReady, emailDelivery };
};

const createBooking = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed.', errors: errors.array() });
    }

    const { headDevoteeName, headDevoteeAadhaar, members, bookingDate, timeSlot } = req.body;
    const bookingDateKey = formatDateKey(bookingDate);

    if (!ALLOWED_TIME_SLOTS.includes(timeSlot)) {
      return res.status(400).json({
        message: 'Invalid time slot selected.',
        allowedSlots: ALLOWED_TIME_SLOTS
      });
    }

    if (!bookingDateKey) {
      return res.status(400).json({ message: 'Invalid booking date.' });
    }

    const todayKey = getTodayDateKey();
    if (bookingDateKey < todayKey) {
      return res.status(400).json({ message: 'Booking date cannot be in the past.' });
    }

    const bookingStatus = await getBookingStatusForDate(bookingDateKey);
    if (!bookingStatus.canBook) {
      return res.status(409).json({
        message: bookingStatus.message,
        status: bookingStatus
      });
    }

    const memberCount = members.length;

    // Atomic counter update to prevent overbooking beyond daily total limit.
    const dailyLimit = await DailyLimit.findOneAndUpdate(
      {
        date: bookingDateKey,
        isOpen: true,
        $expr: {
          $lte: [{ $add: ['$bookedCount', memberCount] }, '$totalLimit']
        }
      },
      { $inc: { bookedCount: memberCount } },
      { returnDocument: 'after' }
    );

    if (!dailyLimit) {
      return res.status(409).json({
        message: 'Daily VIP devotee limit reached. Please choose another date.'
      });
    }

    if (dailyLimit.bookedCount >= dailyLimit.totalLimit && dailyLimit.isOpen) {
      dailyLimit.isOpen = false;
      await dailyLimit.save();
    }

    const paymentFlowEnabled = isPaymentRequired();

    let booking = null;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const bookingCode = await generateAvailablePassCode();
      try {
        booking = await Booking.create({
          user: req.user.id,
          headDevoteeName,
          headDevoteeAadhaar,
          members,
          memberCount,
          bookingDate: new Date(`${bookingDateKey}T00:00:00+05:30`),
          timeSlot,
          bookingCode,
          status: paymentFlowEnabled ? 'pending' : 'confirmed'
        });
        break;
      } catch (createError) {
        if (createError?.code === 11000 && createError?.keyPattern?.bookingCode) {
          continue;
        }
        throw createError;
      }
    }

    if (!booking) {
      throw new Error('Unable to create booking pass code. Please retry.');
    }

    let qrReady = false;
    let emailDelivery = { delivered: false, simulated: false, message: 'Payment pending.' };
    let payment = null;

    if (paymentFlowEnabled) {
      const razorpay = getRazorpayClient();
      if (!razorpay) {
        await decrementDailyCountForBooking(booking);
        await Booking.findByIdAndUpdate(booking._id, { status: 'cancelled' });
        return res.status(500).json({ message: 'Razorpay is not configured correctly.' });
      }

      const amount = calculateBookingAmount(memberCount);
      payment = await Payment.create({
        booking: booking._id,
        user: req.user.id,
        amount,
        currency: 'INR',
        type: 'darshan',
        status: 'pending'
      });

      try {
        const order = await razorpay.orders.create({
          amount: toPaise(amount),
          currency: 'INR',
          receipt: `booking_${booking._id}`,
          notes: {
            bookingId: String(booking._id),
            userId: String(req.user.id),
            flow: 'vip_darshan'
          }
        });

        payment.razorpayOrderId = order.id;
        await payment.save();

        booking.payment = payment._id;
        await booking.save();

        return res.status(201).json({
          message: 'Booking created. Complete payment to confirm your pass.',
          bookingId: booking._id,
          booking: serializeBooking(booking),
          paymentRequired: true,
          payment: {
            keyId: process.env.RAZORPAY_KEY_ID,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            paymentRecordId: payment._id
          },
          status: {
            bookingDate: bookingDateKey,
            totalLimit: dailyLimit.totalLimit,
            bookedCount: dailyLimit.bookedCount,
            remainingCount: Math.max(0, dailyLimit.totalLimit - dailyLimit.bookedCount),
            isDateOpen: dailyLimit.isOpen
          }
        });
      } catch (orderError) {
        console.error(`[RazorpayOrder] Failed for booking ${booking._id}: ${orderError.message}`);
        payment.status = 'failed';
        await payment.save();
        booking.status = 'cancelled';
        booking.payment = payment._id;
        await booking.save();
        await decrementDailyCountForBooking(booking);
        return res.status(500).json({ message: 'Unable to create payment order. Please try again.' });
      }
    }

    const finalizeResult = await finalizeBookingAfterPayment(booking);
    qrReady = finalizeResult.qrReady;
    emailDelivery = finalizeResult.emailDelivery;

    return res.status(201).json({
      message: 'Booking created successfully.',
      bookingId: booking._id,
      booking: serializeBooking(booking),
      paymentRequired: false,
      qrReady,
      emailDelivery,
      status: {
        bookingDate: bookingDateKey,
        totalLimit: dailyLimit.totalLimit,
        bookedCount: dailyLimit.bookedCount,
        remainingCount: Math.max(0, dailyLimit.totalLimit - dailyLimit.bookedCount),
        isDateOpen: dailyLimit.isOpen
      }
    });
  } catch (error) {
    if (error?.name === 'ValidationError') {
      const firstField = Object.values(error.errors || {})[0];
      return res.status(400).json({
        message: firstField?.message || 'Invalid booking data.',
        error: error.message
      });
    }

    if (error?.code === 11000) {
      return res.status(409).json({
        message: 'Duplicate booking data conflict. Please retry.',
        error: error.message
      });
    }

    return res.status(500).json({ message: 'Server error.', error: error.message });
  }
};

const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json({ bookings: bookings.map(serializeBooking) });
  } catch (error) {
    res.status(500).json({ message: 'Server error.', error: error.message });
  }
};

const getBookingQr = async (req, res) => {
  try {
    const { id } = req.params;
    const query = req.user.role === 'admin' ? { _id: id } : { _id: id, user: req.user.id };
    const booking = await Booking.findOne(query);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    await ensureBookingQr(booking);

    return res.status(200).json({
      message: 'QR pass fetched successfully.',
      booking: serializeBooking(booking),
      qrCode: booking.qrCode
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error.', error: error.message });
  }
};

const resendBookingEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const query = req.user.role === 'admin' ? { _id: id } : { _id: id, user: req.user.id };
    const booking = await Booking.findOne(query).populate('user', 'name email');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    const ownerEmail = booking?.user?.email;
    const ownerName = booking?.user?.name || booking.headDevoteeName;

    if (!ownerEmail) {
      booking.confirmationEmailStatus = 'no_email';
      booking.confirmationEmailLastError = 'No email present on devotee profile.';
      await booking.save();
      return res.status(400).json({ message: 'No email found for this booking user.', booking: serializeBooking(booking) });
    }

    let qrReady = true;
    try {
      await ensureBookingQr(booking);
    } catch (qrError) {
      qrReady = false;
      console.error(`[BookingQR] Resend failed for booking ${booking._id}: ${qrError.message}`);
    }

    const delivery = await sendBookingConfirmationEmail({
      to: ownerEmail,
      name: ownerName,
      booking,
      qrCode: booking.qrCode
    });

    await applyEmailStatusToBooking(booking, delivery);

    return res.status(200).json({
      message: delivery.delivered
        ? 'Booking confirmation email resent successfully.'
        : delivery.simulated
          ? 'Email simulated because SMTP is not configured.'
          : 'Email resend failed.',
      delivery,
      qrReady,
      booking: serializeBooking(booking)
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error.', error: error.message });
  }
};

const verifyBookingPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: 'Payment verification details are required.' });
    }

    const query = req.user.role === 'admin' ? { _id: id } : { _id: id, user: req.user.id };
    const booking = await Booking.findOne(query).populate('payment');
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    if (!booking.payment) {
      return res.status(400).json({ message: 'No payment record found for this booking.' });
    }

    const payment = booking.payment;

    if (payment.status === 'paid' && booking.status === 'confirmed') {
      return res.status(200).json({
        message: 'Payment already verified.',
        booking: serializeBooking(booking),
        payment: {
          status: payment.status,
          razorpayOrderId: payment.razorpayOrderId,
          razorpayPaymentId: payment.razorpayPaymentId
        }
      });
    }

    if (payment.razorpayOrderId !== razorpay_order_id) {
      return res.status(400).json({ message: 'Razorpay order mismatch.' });
    }

    if (!verifyRazorpaySignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature
    })) {
      return res.status(400).json({ message: 'Invalid Razorpay signature.' });
    }

    const razorpay = getRazorpayClient();
    if (!razorpay) {
      return res.status(500).json({ message: 'Razorpay is not configured correctly.' });
    }

    let gatewayPayment;
    try {
      gatewayPayment = await razorpay.payments.fetch(razorpay_payment_id);
    } catch (fetchError) {
      return res.status(400).json({ message: 'Unable to validate payment with Razorpay.' });
    }

    if (gatewayPayment.order_id !== payment.razorpayOrderId) {
      return res.status(400).json({ message: 'Gateway payment order mismatch.' });
    }

    if (Number(gatewayPayment.amount) !== toPaise(payment.amount)) {
      return res.status(400).json({ message: 'Gateway payment amount mismatch.' });
    }

    if (gatewayPayment.status === 'authorized') {
      try {
        gatewayPayment = await razorpay.payments.capture(
          razorpay_payment_id,
          toPaise(payment.amount),
          payment.currency
        );
      } catch (captureError) {
        return res.status(400).json({ message: 'Payment authorization found but capture failed.' });
      }
    }

    if (gatewayPayment.status !== 'captured') {
      return res.status(400).json({ message: `Payment is not captured. Current status: ${gatewayPayment.status}` });
    }

    payment.status = 'paid';
    payment.razorpayPaymentId = razorpay_payment_id;
    payment.razorpaySignature = razorpay_signature;
    payment.paidAt = new Date();
    await payment.save();

    const finalizeResult = await finalizeBookingAfterPayment(booking);

    return res.status(200).json({
      message: 'Payment verified and booking confirmed.',
      booking: serializeBooking(booking),
      qrReady: finalizeResult.qrReady,
      emailDelivery: finalizeResult.emailDelivery
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error.', error: error.message });
  }
};

const markBookingPaymentFailed = async (req, res) => {
  try {
    const { id } = req.params;
    const reason = String(req.body?.reason || 'Payment not completed');
    const query = req.user.role === 'admin' ? { _id: id } : { _id: id, user: req.user.id };
    const booking = await Booking.findOne(query).populate('payment');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    if (booking.status !== 'pending') {
      return res.status(200).json({
        message: 'Booking already processed. No rollback required.',
        booking: serializeBooking(booking)
      });
    }

    if (booking.payment && booking.payment.status === 'pending') {
      booking.payment.status = 'failed';
      booking.payment.refundId = reason;
      await booking.payment.save();
    }

    booking.status = 'cancelled';
    await booking.save();
    await decrementDailyCountForBooking(booking);

    return res.status(200).json({
      message: 'Pending booking cancelled after payment failure.',
      booking: serializeBooking(booking)
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error.', error: error.message });
  }
};

const handleRazorpayWebhook = async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return res.status(400).json({ message: 'Webhook secret not configured.' });
    }

    const signature = req.headers['x-razorpay-signature'];
    if (!signature || !Buffer.isBuffer(req.body)) {
      return res.status(400).json({ message: 'Invalid webhook payload.' });
    }

    const expected = crypto.createHmac('sha256', webhookSecret).update(req.body).digest('hex');
    if (!secureCompare(expected, signature)) {
      return res.status(401).json({ message: 'Invalid webhook signature.' });
    }

    const eventData = JSON.parse(req.body.toString('utf8'));
    const event = eventData?.event;
    const paymentEntity = eventData?.payload?.payment?.entity;

    if (!paymentEntity?.order_id) {
      return res.status(200).json({ received: true });
    }

    const payment = await Payment.findOne({ razorpayOrderId: paymentEntity.order_id });
    if (!payment) {
      return res.status(200).json({ received: true });
    }

    const booking = payment.booking ? await Booking.findById(payment.booking) : null;

    if (event === 'payment.captured') {
      payment.status = 'paid';
      payment.razorpayPaymentId = paymentEntity.id;
      payment.paidAt = new Date();
      await payment.save();

      if (booking && booking.status === 'pending') {
        await finalizeBookingAfterPayment(booking);
      }
    }

    if (event === 'payment.failed') {
      payment.status = 'failed';
      payment.razorpayPaymentId = paymentEntity.id || payment.razorpayPaymentId;
      await payment.save();

      if (booking && booking.status === 'pending') {
        booking.status = 'cancelled';
        await booking.save();
        await decrementDailyCountForBooking(booking);
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    return res.status(500).json({ message: 'Server error.', error: error.message });
  }
};

const scanBookingQr = async (req, res) => {
  try {
    const lookup = parseScanLookup(req.body || {});
    if (!lookup.bookingId && !lookup.bookingCode) {
      return res.status(400).json({ message: 'bookingCode, bookingId, passCode, or qrData is required for scanning.' });
    }

    let booking = null;
    if (lookup.bookingId) {
      booking = await Booking.findById(lookup.bookingId).populate('user', 'name mobile email');
    }

    if (!booking && lookup.bookingCode) {
      booking = await Booking.findOne({ bookingCode: lookup.bookingCode }).populate('user', 'name mobile email');
    }

    if (!booking) {
      return res.status(404).json({ message: 'Pass not found. Check pass code or QR and try again.' });
    }

    if (booking.status === 'visited') {
      return res.status(409).json({
        message: 'Pass already scanned. Duplicate entry is not allowed.',
        booking: serializeBooking(booking)
      });
    }

    if (booking.status !== 'confirmed') {
      return res.status(400).json({
        message: `Pass is not valid for entry. Current status: ${booking.status}.`,
        booking: serializeBooking(booking)
      });
    }

    booking.status = 'visited';
    booking.visitedAt = new Date();
    booking.visitedBy = req.user?.id || booking.visitedBy;
    await booking.save();

    return res.status(200).json({
      message: 'Entry approved. Pass marked as visited.',
      booking: serializeBooking(booking)
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error.', error: error.message });
  }
};

const getBookingStatus = async (req, res) => {
  try {
    const requestedDate = req.query.bookingDate || new Date();
    const bookingDateKey = formatDateKey(requestedDate);

    if (!bookingDateKey) {
      return res.status(400).json({ message: 'bookingDate must be a valid date (YYYY-MM-DD).' });
    }

    if (bookingDateKey < getTodayDateKey()) {
      return res.status(400).json({ message: 'Status can only be checked for today or future dates.' });
    }

    const status = await getBookingStatusForDate(bookingDateKey);
    return res.status(200).json({
      ...status,
      allowedSlots: ALLOWED_TIME_SLOTS
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error.', error: error.message });
  }
};

module.exports = {
  createBooking,
  getMyBookings,
  getBookingStatus,
  getBookingQr,
  resendBookingEmail,
  verifyBookingPayment,
  markBookingPaymentFailed,
  handleRazorpayWebhook,
  scanBookingQr,
  ALLOWED_TIME_SLOTS
};
