const User = require('../models/User');
const Booking = require('../models/Booking');
const PriestProfile = require('../models/PriestProfile');
const PriestBooking = require('../models/PriestBooking');
const PriestFeedback = require('../models/PriestFeedback');
const Payment = require('../models/Payment');
const {
  isPaymentRequired,
  toPaise,
  getRazorpayClient,
  hasRazorpayCredentials
} = require('../utils/razorpay');
const {
  ALLOWED_PRIEST_TIME_SLOTS,
  PRIEST_SLOT_CAPACITY,
  PRIEST_PENDING_PAYMENT_EXPIRY_MINUTES,
  RITUAL_MENU,
  getRitualByCode,
  isPriestBookingDateAllowed
} = require('../utils/priestRules');
const { buildUpiPayLink, generateUpiQrDataUrl } = require('../utils/qr');
const { formatDateKey } = require('../utils/bookingRules');

const normalizeEmail = (value = '') => String(value).trim().toLowerCase();
const normalizeMobile = (value = '') => String(value).replace(/\D/g, '');
const normalizeStatus = (value = '') => String(value).trim().toLowerCase();
const MAX_PRIEST_PHOTO_DATA_URL_LENGTH = 3 * 1024 * 1024;

const sanitizePhotoDataUrl = (value = '') => String(value || '').trim();
const isImageDataUrl = (value = '') => /^data:image\/(png|jpe?g|webp);base64,/i.test(value);
const MAX_PAYMENT_SCREENSHOT_DATA_URL_LENGTH = 3 * 1024 * 1024;
const PRIEST_BOOKING_ACTIVE_STATUSES = ['pending', 'payment_submitted', 'confirmed', 'completed'];
const PRIEST_SLOT_OCCUPIED_STATUSES = ['pending', 'payment_submitted', 'confirmed', 'completed'];

const sanitizeUtr = (value = '') => String(value || '').trim();
const isValidUtr = (value = '') => /^[A-Za-z0-9]{6,40}$/.test(String(value || '').trim());

const sanitizeUpiId = (value = '') => String(value || '').trim();
const isValidUpiId = (value = '') => {
  const raw = String(value || '').trim();
  if (!raw) return false;
  if (raw.length < 6 || raw.length > 80) return false;
  return raw.includes('@');
};

const priestBookingPopulate = [
  { path: 'devotee', select: 'name mobile email' },
  { path: 'priest', select: 'name mobile' },
  { path: 'priestProfile', select: 'age photoUrl isVerified upiId upiName bankDetails' },
  {
    path: 'darshanbooking',
    select: 'bookingCode headDevoteeName bookingDate timeSlot memberCount status'
  }
];

const serializePriestProfile = (profileDoc) => {
  const profile = profileDoc?.toObject ? profileDoc.toObject() : profileDoc;
  if (!profile) return null;

  return {
    id: profile._id,
    userId: profile.user?._id || profile.user,
    name: profile.user?.name || '',
    email: profile.user?.email || '',
    mobile: profile.user?.mobile || '',
    age: profile.age,
    photoUrl: profile.photoUrl || '',
    bio: profile.bio || '',
    yearsExperience: profile.yearsExperience || 0,
    upiId: profile.upiId || '',
    upiName: profile.upiName || '',
    bankDetails: profile.bankDetails || {},
    isVerified: Boolean(profile.isVerified),
    verifiedAt: profile.verifiedAt || null,
    isActive: Boolean(profile.isActive),
    displayOrder: profile.displayOrder || 0
  };
};

const serializePriestBooking = (bookingDoc) => {
  const item = bookingDoc?.toObject ? bookingDoc.toObject() : bookingDoc;
  if (!item) return null;

  return {
    id: item._id,
    ritualType: item.ritualType,
    devoteeName: item.devotee?.name || '-',
    devoteeMobile: item.devotee?.mobile || '-',
    devoteeEmail: item.devotee?.email || '-',
    priestName: item.priest?.name || '-',
    priestMobile: item.priest?.mobile || '-',
    priestProfileId: item.priestProfile?._id || item.priestProfile || null,
    priestAge: item.priestProfile?.age || null,
    bookingDate: item.bookingDate,
    timeSlot: item.timeSlot,
    basePrice: item.basePrice,
    surcharge: item.surcharge,
    totalAmount: item.totalAmount,
    status: item.status,
    createdAt: item.createdAt,
    feedbackId: item.feedback || null,
    paymentProof: item.paymentProof
      ? {
          method: item.paymentProof.method || 'upi',
          utr: item.paymentProof.utr || '',
          screenshotDataUrl: item.paymentProof.screenshotDataUrl || '',
          submittedAt: item.paymentProof.submittedAt || null
        }
      : null,
    linkedVipPass: item.darshanbooking
      ? {
          id: item.darshanbooking?._id || null,
          bookingCode: item.darshanbooking?.bookingCode || '-',
          headDevoteeName: item.darshanbooking?.headDevoteeName || '-',
          bookingDate: item.darshanbooking?.bookingDate || null,
          timeSlot: item.darshanbooking?.timeSlot || '-',
          memberCount: item.darshanbooking?.memberCount || 0,
          status: item.darshanbooking?.status || '-'
        }
      : null
  };
};

const cancelExpiredPendingPriestBookings = async (dateKey) => {
  const expiryMinutes = Number(PRIEST_PENDING_PAYMENT_EXPIRY_MINUTES) || 0;
  if (expiryMinutes <= 0) return 0;

  const cutoff = new Date(Date.now() - expiryMinutes * 60 * 1000);
  const start = new Date(`${dateKey}T00:00:00+05:30`);
  const end = new Date(`${dateKey}T23:59:59+05:30`);

  const result = await PriestBooking.updateMany(
    {
      bookingDate: { $gte: start, $lt: end },
      status: 'pending',
      createdAt: { $lt: cutoff }
    },
    { $set: { status: 'cancelled' } }
  );

  return result?.modifiedCount || result?.nModified || 0;
};

const createPriestByAdmin = async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = normalizeEmail(req.body.email);
    const mobile = normalizeMobile(req.body.mobile);
    const age = Number(req.body.age);
    const photoDataUrl = sanitizePhotoDataUrl(req.body.photoDataUrl || req.body.photoUrl || '');
    const bio = String(req.body.bio || '').trim();
    const yearsExperience = Number(req.body.yearsExperience || 0);
    const upiId = sanitizeUpiId(req.body.upiId || '');
    const upiName = String(req.body.upiName || '').trim();
    const bankDetailsInput = req.body.bankDetails && typeof req.body.bankDetails === 'object'
      ? req.body.bankDetails
      : {};
    const bankDetails = {
      accountName: String(bankDetailsInput.accountName || req.body.bankAccountName || '').trim(),
      bankName: String(bankDetailsInput.bankName || req.body.bankName || '').trim(),
      accountNumber: String(bankDetailsInput.accountNumber || req.body.bankAccountNumber || '').trim(),
      ifsc: String(bankDetailsInput.ifsc || req.body.bankIfsc || '').trim().toUpperCase()
    };

    if (!name) {
      return res.status(400).json({ message: 'Priest name is required.' });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Valid priest email is required.' });
    }
    if (!mobile || !/^\d{10}$/.test(mobile)) {
      return res.status(400).json({ message: 'Valid 10-digit priest mobile is required.' });
    }
    if (!Number.isFinite(age) || age < 18 || age > 90) {
      return res.status(400).json({ message: 'Priest age must be between 18 and 90.' });
    }
    if (!isValidUpiId(upiId)) {
      return res.status(400).json({ message: 'Valid priest UPI ID is required (example: name@bank).' });
    }
    if (photoDataUrl) {
      if (!isImageDataUrl(photoDataUrl)) {
        return res.status(400).json({ message: 'Priest photo must be a valid PNG/JPG/WEBP image upload.' });
      }
      if (photoDataUrl.length > MAX_PRIEST_PHOTO_DATA_URL_LENGTH) {
        return res.status(400).json({ message: 'Priest photo size is too large. Please upload a smaller image.' });
      }
    }

    const existing = await User.findOne({ $or: [{ email }, { mobile }] });
    if (existing) {
      return res.status(409).json({ message: 'A user already exists with this email or mobile.' });
    }

    // Not used in OTP login flow, but created for staff-account integrity.
    const generatedPassword = `Priest@${Math.random().toString(36).slice(2, 10)}!`;
    const priestUser = await User.create({
      name,
      email,
      mobile,
      role: 'priest',
      password: generatedPassword
    });

    const profile = await PriestProfile.create({
      user: priestUser._id,
      age,
      photoUrl: photoDataUrl,
      bio,
      yearsExperience: Number.isFinite(yearsExperience) ? Math.max(0, yearsExperience) : 0,
      upiId,
      upiName,
      bankDetails,
      isActive: true,
      isVerified: true,
      verifiedAt: new Date(),
      verifiedBy: req.user.id
    });

    const populated = await PriestProfile.findById(profile._id).populate('user', 'name email mobile role');
    return res.status(201).json({
      message: 'Verified priest added successfully by admin.',
      priest: serializePriestProfile(populated),
      onboarding: {
        loginMethod: 'OTP (mobile/email)',
        tempPassword: generatedPassword
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error.', error: error.message });
  }
};

const getPriestsForAdmin = async (_req, res) => {
  try {
    const priests = await PriestProfile.find({})
      .populate('user', 'name email mobile role')
      .sort({ displayOrder: 1, createdAt: 1 });

    return res.status(200).json({ priests: priests.map(serializePriestProfile) });
  } catch (error) {
    return res.status(500).json({ message: 'Server error.', error: error.message });
  }
};

const updatePriestByAdmin = async (req, res) => {
  try {
    const profile = await PriestProfile.findById(req.params.id).populate('user', 'name email mobile role');
    if (!profile) {
      return res.status(404).json({ message: 'Priest profile not found.' });
    }

    if (typeof req.body.name === 'string') {
      profile.user.name = req.body.name.trim() || profile.user.name;
      await profile.user.save();
    }
    if (typeof req.body.age !== 'undefined') {
      const nextAge = Number(req.body.age);
      if (!Number.isFinite(nextAge) || nextAge < 18 || nextAge > 90) {
        return res.status(400).json({ message: 'Priest age must be between 18 and 90.' });
      }
      profile.age = nextAge;
    }
    if (typeof req.body.photoDataUrl === 'string' || typeof req.body.photoUrl === 'string') {
      const nextPhoto = sanitizePhotoDataUrl(req.body.photoDataUrl || req.body.photoUrl || '');
      if (nextPhoto) {
        if (!isImageDataUrl(nextPhoto)) {
          return res.status(400).json({ message: 'Priest photo must be a valid PNG/JPG/WEBP image upload.' });
        }
        if (nextPhoto.length > MAX_PRIEST_PHOTO_DATA_URL_LENGTH) {
          return res.status(400).json({ message: 'Priest photo size is too large. Please upload a smaller image.' });
        }
      }
      profile.photoUrl = nextPhoto;
    }
    if (typeof req.body.clearPhoto !== 'undefined' && Boolean(req.body.clearPhoto)) {
      profile.photoUrl = '';
    }
    if (typeof req.body.bio === 'string') {
      profile.bio = req.body.bio.trim();
    }
    if (typeof req.body.yearsExperience !== 'undefined') {
      const yrs = Number(req.body.yearsExperience);
      if (!Number.isFinite(yrs) || yrs < 0) {
        return res.status(400).json({ message: 'yearsExperience must be 0 or greater.' });
      }
      profile.yearsExperience = yrs;
    }
    if (typeof req.body.upiId === 'string') {
      const nextUpi = sanitizeUpiId(req.body.upiId);
      if (!isValidUpiId(nextUpi)) {
        return res.status(400).json({ message: 'upiId must be a valid UPI ID (example: name@bank).' });
      }
      profile.upiId = nextUpi;
    }
    if (typeof req.body.upiName === 'string') {
      profile.upiName = String(req.body.upiName || '').trim();
    }
    if (typeof req.body.bankDetails !== 'undefined' && req.body.bankDetails && typeof req.body.bankDetails === 'object') {
      const input = req.body.bankDetails;
      profile.bankDetails = {
        accountName: String(input.accountName || '').trim(),
        bankName: String(input.bankName || '').trim(),
        accountNumber: String(input.accountNumber || '').trim(),
        ifsc: String(input.ifsc || '').trim().toUpperCase()
      };
    }
    if (typeof req.body.isActive !== 'undefined') {
      profile.isActive = Boolean(req.body.isActive);
    }
    if (typeof req.body.displayOrder !== 'undefined') {
      const order = Number(req.body.displayOrder);
      if (!Number.isFinite(order)) {
        return res.status(400).json({ message: 'displayOrder must be a valid number.' });
      }
      profile.displayOrder = order;
    }
    if (typeof req.body.isVerified !== 'undefined') {
      const nextVerified = Boolean(req.body.isVerified);
      profile.isVerified = nextVerified;
      profile.verifiedAt = nextVerified ? new Date() : null;
      profile.verifiedBy = nextVerified ? req.user.id : null;
    }

    await profile.save();
    const refreshed = await PriestProfile.findById(profile._id).populate('user', 'name email mobile role');
    return res.status(200).json({
      message: 'Priest profile updated successfully.',
      priest: serializePriestProfile(refreshed)
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error.', error: error.message });
  }
};

const getRitualMenu = async (_req, res) => {
  return res.status(200).json({
    message: 'Priest ritual menu fetched successfully.',
    rules: {
      bookingMode: 'same-day',
      darshanWindow: '06:00 AM to 02:00 PM IST',
      allowedTimeSlots: ALLOWED_PRIEST_TIME_SLOTS
    },
    rituals: RITUAL_MENU
  });
};

const getPriestTemplateList = async (_req, res) => {
  try {
    const priests = await PriestProfile.find({ isActive: true, isVerified: true, upiId: { $ne: '' } })
      .populate('user', 'name mobile')
      .sort({ displayOrder: 1, createdAt: 1 });

    const list = priests.map((item) => ({
      id: item._id,
      userId: item.user?._id || null,
      name: item.user?.name || '',
      mobile: item.user?.mobile || '',
      age: item.age,
      photoUrl: item.photoUrl || '',
      bio: item.bio || '',
      yearsExperience: item.yearsExperience || 0,
      isVerified: Boolean(item.isVerified),
      upiId: item.upiId || '',
      upiName: item.upiName || '',
      bankDetails: item.bankDetails || {}
    }));

    return res.status(200).json({ priests: list });
  } catch (error) {
    return res.status(500).json({ message: 'Server error.', error: error.message });
  }
};

const createPriestBooking = async (req, res) => {
  try {
    const ritualCode = String(req.body.ritualCode || '').trim().toUpperCase();
    const priestProfileId = String(req.body.priestProfileId || '').trim();
    const bookingDate = req.body.bookingDate;
    const timeSlot = String(req.body.timeSlot || '').trim();

    const ritual = getRitualByCode(ritualCode);
    if (!ritual) {
      return res.status(400).json({ message: 'Invalid ritual code selected.' });
    }

    if (!ALLOWED_PRIEST_TIME_SLOTS.includes(timeSlot)) {
      return res.status(400).json({
        message: 'Invalid time slot selected.',
        allowedTimeSlots: ALLOWED_PRIEST_TIME_SLOTS
      });
    }

    const dateCheck = isPriestBookingDateAllowed(bookingDate);
    if (!dateCheck.ok) {
      return res.status(400).json({ message: dateCheck.message });
    }

    const profile = await PriestProfile.findById(priestProfileId).populate('user', 'name role mobile');
    if (!profile || !profile.isActive || !profile.isVerified) {
      return res.status(404).json({ message: 'Selected priest is unavailable right now.' });
    }
    if (!isValidUpiId(profile.upiId)) {
      return res.status(409).json({ message: 'Selected priest does not have UPI details configured yet.' });
    }

    const devoteeVipBooking = await Booking.findOne({
      user: req.user.id,
      bookingDate: {
        $gte: new Date(`${dateCheck.dateKey}T00:00:00+05:30`),
        $lt: new Date(`${dateCheck.dateKey}T23:59:59+05:30`)
      },
      status: { $in: ['confirmed', 'visited'] }
    }).sort({ createdAt: -1 });

    if (!devoteeVipBooking) {
      return res.status(409).json({
        message: 'VIP pass is required before booking priest ritual for today.'
      });
    }

    await cancelExpiredPendingPriestBookings(dateCheck.dateKey);

    const existingPriestBooking = await PriestBooking.findOne({
      darshanbooking: devoteeVipBooking._id,
      status: { $in: PRIEST_BOOKING_ACTIVE_STATUSES }
    });
    if (existingPriestBooking) {
      return res.status(409).json({
        message: 'A priest ritual is already linked with your latest VIP pass.'
      });
    }

    const basePrice = ritual.basePrice;
    const surcharge = 0;
    const totalAmount = basePrice;

    const slotStart = new Date(`${dateCheck.dateKey}T00:00:00+05:30`);
    const slotEnd = new Date(`${dateCheck.dateKey}T23:59:59+05:30`);
    const usedCount = await PriestBooking.countDocuments({
      bookingDate: { $gte: slotStart, $lt: slotEnd },
      priestProfile: profile._id,
      timeSlot,
      status: { $in: PRIEST_SLOT_OCCUPIED_STATUSES }
    });

    if (usedCount >= PRIEST_SLOT_CAPACITY) {
      return res.status(409).json({
        message: 'Selected abhishek slot is full for this priest. Please choose another time slot.'
      });
    }

    let paymentRecord;
    const paymentRequired = isPaymentRequired();

    if (paymentRequired) {
      if (!hasRazorpayCredentials()) {
        return res.status(503).json({ message: 'Razorpay credentials missing on server.' });
      }
      const razorpay = getRazorpayClient();
      if (!razorpay) {
        return res.status(503).json({ message: 'Unable to initialize Razorpay.' });
      }

      paymentRecord = await Payment.create({
        user: req.user.id,
        amount: totalAmount,
        currency: 'INR',
        type: 'priest',
        status: 'pending',
        staffCut: totalAmount * 0.65,
        templeCut: totalAmount * 0.35,
      });

      const order = await razorpay.orders.create({
        amount: toPaise(totalAmount),
        currency: 'INR',
        receipt: String(paymentRecord._id)
      });

      paymentRecord.razorpayOrderId = order.id;
      await paymentRecord.save();
    }

    const priestBooking = await PriestBooking.create({
      devotee: req.user.id,
      priest: profile.user?._id,
      priestProfile: profile._id,
      darshanbooking: devoteeVipBooking._id,
      ritualType: ritual.name,
      basePrice,
      surcharge,
      totalAmount,
      bookingDate: new Date(`${dateCheck.dateKey}T00:00:00+05:30`),
      timeSlot,
      status: paymentRequired ? 'pending' : 'confirmed',
      payment: paymentRecord ? paymentRecord._id : undefined
    });

    const savedBooking = await PriestBooking.findById(priestBooking._id)
      .populate(priestBookingPopulate);

    if (!savedBooking) {
      return res.status(500).json({ message: 'Unable to load created priest booking.' });
    }

    if (paymentRequired) {
      return res.status(201).json({
        message: 'Priest booking request created. Complete payment to confirm.',
        booking: {
          ...serializePriestBooking(savedBooking),
          ritualCode: ritual.code,
          linkedVipBookingId: devoteeVipBooking._id,
          slotStatus: {
            capacity: PRIEST_SLOT_CAPACITY,
            used: usedCount + 1,
            remaining: Math.max(0, PRIEST_SLOT_CAPACITY - (usedCount + 1))
          }
        },
        paymentRequired: true,
        payment: {
          keyId: process.env.RAZORPAY_KEY_ID,
          orderId: paymentRecord.razorpayOrderId,
          amount: toPaise(totalAmount),
          currency: 'INR'
        }
      });
    }

    return res.status(201).json({
      message: 'Priest booking confirmed.',
      booking: {
        ...serializePriestBooking(savedBooking),
        ritualCode: ritual.code,
        linkedVipBookingId: devoteeVipBooking._id,
        slotStatus: {
          capacity: PRIEST_SLOT_CAPACITY,
          used: usedCount + 1,
          remaining: Math.max(0, PRIEST_SLOT_CAPACITY - (usedCount + 1))
        }
      },
      paymentRequired: false
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error.', error: error.message });
  }
};

const getPriestSlotStatus = async (req, res) => {
  try {
    const bookingDate = req.query.bookingDate || new Date();
    const priestProfileId = String(req.query.priestProfileId || '').trim();

    const dateCheck = isPriestBookingDateAllowed(bookingDate);
    if (!dateCheck.ok) {
      return res.status(400).json({ message: dateCheck.message });
    }

    await cancelExpiredPendingPriestBookings(dateCheck.dateKey);

    const start = new Date(`${dateCheck.dateKey}T00:00:00+05:30`);
    const end = new Date(`${dateCheck.dateKey}T23:59:59+05:30`);

    const baseQuery = {
      bookingDate: { $gte: start, $lt: end },
      status: { $in: PRIEST_SLOT_OCCUPIED_STATUSES }
    };

    if (priestProfileId) {
      const priest = await PriestProfile.findById(priestProfileId).select('_id isActive isVerified');
      if (!priest) {
        return res.status(404).json({ message: 'Priest profile not found.' });
      }
      if (!priest.isActive || !priest.isVerified) {
        return res.status(409).json({ message: 'Selected priest is unavailable right now.' });
      }
      baseQuery.priestProfile = priestProfileId;
    }

    const slots = {};
    for (const slot of ALLOWED_PRIEST_TIME_SLOTS) {
      const used = await PriestBooking.countDocuments({ ...baseQuery, timeSlot: slot });
      const remaining = Math.max(0, PRIEST_SLOT_CAPACITY - used);
      slots[slot] = {
        used,
        remaining,
        capacity: PRIEST_SLOT_CAPACITY,
        isFull: used >= PRIEST_SLOT_CAPACITY
      };
    }

    return res.status(200).json({
      bookingDate: dateCheck.dateKey,
      priestProfileId: priestProfileId || null,
      capacityPerSlot: PRIEST_SLOT_CAPACITY,
      pendingExpiryMinutes: PRIEST_PENDING_PAYMENT_EXPIRY_MINUTES,
      slots
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error.', error: error.message });
  }
};

const verifyPriestPayment = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const query = req.user.role === 'admin'
      ? { _id: bookingId }
      : { _id: bookingId, devotee: req.user.id };

    const booking = await PriestBooking.findOne(query);
    if (!booking) {
      return res.status(404).json({ message: 'Priest booking not found.' });
    }

    if (!booking.payment) {
      return res.status(400).json({ message: 'No payment record exists for this booking.' });
    }

    const payment = await Payment.findById(booking.payment);
    if (!payment) {
      return res.status(404).json({ message: 'Payment record not found.' });
    }

    if (payment.status === 'paid' && booking.status === 'confirmed') {
      return res.status(200).json({
        message: 'Payment already verified.',
        booking: serializePriestBooking(booking)
      });
    }

    const orderId = String(req.body.razorpay_order_id || '').trim();
    const paymentId = String(req.body.razorpay_payment_id || '').trim();
    const signature = String(req.body.razorpay_signature || '').trim();

    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({ message: 'Invalid payment verification payload.' });
    }
    
    // Assume verification success for Razorpay if using mock/basic or implement real verify.
    // For TirthOne standard: verifyRazorpaySignature
    const { verifyRazorpaySignature } = require('../utils/razorpay');
    const secret = process.env.RAZORPAY_KEY_SECRET;
    const signatureOk = verifyRazorpaySignature({ orderId, paymentId, signature, secret });

    if (!signatureOk) {
      payment.status = 'failed';
      payment.failureReason = 'Signature verification failed.';
      await payment.save();

      booking.status = 'cancelled';
      await booking.save();
      return res.status(400).json({ message: 'Payment signature verification failed.' });
    }

    payment.status = 'paid';
    payment.razorpayOrderId = orderId;
    payment.razorpayPaymentId = paymentId;
    payment.razorpaySignature = signature;
    payment.paidAt = new Date();
    
    // Temple gets 35%, Priest gets 65%
    payment.templeCut = payment.amount * 0.35;
    payment.staffCut = payment.amount * 0.65;
    
    await payment.save();

    booking.status = 'confirmed';
    await booking.save();

    const refreshed = await PriestBooking.findById(booking._id).populate(priestBookingPopulate);
    return res.status(200).json({
      message: 'Payment verified successfully. Priest booking confirmed.',
      booking: serializePriestBooking(refreshed)
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error.', error: error.message });
  }
};

const submitPriestPaymentProof = async (req, res) => {
  try {
    const utr = sanitizeUtr(req.body.utr || '');
    const screenshotDataUrl = sanitizePhotoDataUrl(req.body.screenshotDataUrl || req.body.paymentScreenshotDataUrl || '');
    const method = String(req.body.method || 'upi').trim().toLowerCase();

    if (!isValidUtr(utr)) {
      return res.status(400).json({ message: 'UTR/RRN must be 6 to 40 letters/numbers (no spaces).' });
    }
    if (!screenshotDataUrl) {
      return res.status(400).json({ message: 'Payment screenshot is required.' });
    }
    if (!isImageDataUrl(screenshotDataUrl)) {
      return res.status(400).json({ message: 'Payment screenshot must be a valid PNG/JPG/WEBP image upload.' });
    }
    if (screenshotDataUrl.length > MAX_PAYMENT_SCREENSHOT_DATA_URL_LENGTH) {
      return res.status(400).json({ message: 'Payment screenshot is too large. Please upload a smaller image.' });
    }

    const bookingId = req.params.id;
    const query = req.user.role === 'admin'
      ? { _id: bookingId }
      : { _id: bookingId, devotee: req.user.id };

    const booking = await PriestBooking.findOne(query);
    if (!booking) {
      return res.status(404).json({ message: 'Priest booking not found.' });
    }

    if (booking.status !== 'pending') {
      return res.status(409).json({ message: 'Payment proof can be submitted only for pending bookings.' });
    }

    const expiryMinutes = Number(PRIEST_PENDING_PAYMENT_EXPIRY_MINUTES) || 0;
    if (expiryMinutes > 0) {
      const cutoff = new Date(Date.now() - expiryMinutes * 60 * 1000);
      if (booking.createdAt && booking.createdAt < cutoff) {
        booking.status = 'cancelled';
        await booking.save();
        return res.status(409).json({ message: 'This booking request expired. Please book again.' });
      }
    }

    booking.paymentProof = {
      method: ['upi', 'bank_transfer', 'cash', 'other'].includes(method) ? method : 'upi',
      utr,
      screenshotDataUrl,
      submittedAt: new Date()
    };
    booking.status = 'payment_submitted';
    await booking.save();

    const refreshed = await PriestBooking.findById(booking._id).populate(priestBookingPopulate);
    return res.status(200).json({
      message: 'Payment proof submitted. Priest will accept your booking soon.',
      booking: serializePriestBooking(refreshed)
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error.', error: error.message });
  }
};

const submitPriestFeedback = async (req, res) => {
  try {
    const rating = Number(req.body.rating);
    const comment = String(req.body.comment || '').trim();

    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'rating must be between 1 and 5.' });
    }

    const bookingId = req.params.id;
    const booking = await PriestBooking.findOne({ _id: bookingId, devotee: req.user.id })
      .populate('priest', 'name')
      .populate('priestProfile', 'age photoUrl');

    if (!booking) {
      return res.status(404).json({ message: 'Priest booking not found.' });
    }
    if (String(booking.status || '').toLowerCase() !== 'completed') {
      return res.status(409).json({ message: 'Feedback is available only after the ritual is marked completed.' });
    }
    if (booking.feedback) {
      return res.status(409).json({ message: 'Feedback already submitted for this booking.' });
    }

    const feedback = await PriestFeedback.create({
      priestBooking: booking._id,
      devotee: booking.devotee,
      priest: booking.priest,
      priestProfile: booking.priestProfile || null,
      rating,
      comment
    });

    booking.feedback = feedback._id;
    await booking.save();

    return res.status(201).json({
      message: 'Thank you! Your feedback has been submitted.',
      feedback: {
        id: feedback._id,
        rating: feedback.rating,
        comment: feedback.comment,
        createdAt: feedback.createdAt
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error.', error: error.message });
  }
};

const getPriestReviews = async (req, res) => {
  try {
    const priestProfileId = req.params.id;
    const profile = await PriestProfile.findById(priestProfileId);
    if (!profile) return res.status(404).json({ message: 'Priest not found.' });

    const reviews = await PriestFeedback.find({ priest: profile.user })
      .populate('devotee', 'name')
      .sort({ createdAt: -1 })
      .limit(20);

    const mapped = reviews.map(r => ({
      _id: r._id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      devoteeName: r.devotee?.name || 'Anonymous'
    }));

    return res.status(200).json({ reviews: mapped });
  } catch (error) {
    return res.status(500).json({ message: 'Server error.', error: error.message });
  }
};

const getPriestBookingById = async (req, res) => {
  try {
    const bookingId = String(req.params.id || '').trim();
    if (!bookingId) {
      return res.status(400).json({ message: 'Booking id is required.' });
    }

    const baseQuery = { _id: bookingId };
    if (req.user.role === 'devotee') {
      baseQuery.devotee = req.user.id;
    }
    if (req.user.role === 'priest') {
      baseQuery.priest = req.user.id;
    }

    const booking = await PriestBooking.findOne(baseQuery).populate(priestBookingPopulate);
    if (!booking) {
      return res.status(404).json({ message: 'Priest booking not found.' });
    }

    const serialized = serializePriestBooking(booking);
    const status = normalizeStatus(serialized?.status || '');

    let payment = null;
    if (['pending', 'payment_submitted', 'confirmed'].includes(status)) {
      const upiId = booking.priestProfile?.upiId || '';
      const payeeName = booking.priestProfile?.upiName || booking.priest?.name || 'Priest';
      const amount = Number(booking.totalAmount) || 0;
      if (isValidUpiId(upiId) && amount > 0) {
        const note = `${booking.ritualType || 'Abhishek'} (${formatDateKey(booking.bookingDate)}, ${booking.timeSlot})`;
        payment = {
          method: 'upi',
          upiId,
          upiName: payeeName,
          currency: 'INR',
          amount,
          payLink: buildUpiPayLink({ upiId, payeeName, amount, note }),
          qrCodeDataUrl: await generateUpiQrDataUrl({ upiId, payeeName, amount, note }),
          bankDetails: booking.priestProfile?.bankDetails || {}
        };
      }
    }

    return res.status(200).json({
      message: 'Priest booking fetched successfully.',
      booking: {
        ...serialized,
        payment
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error.', error: error.message });
  }
};

const getMyPriestBookings = async (req, res) => {
  try {
    const todayCheck = isPriestBookingDateAllowed(new Date());
    if (todayCheck.ok) {
      await cancelExpiredPendingPriestBookings(todayCheck.dateKey);
    }

    const query = req.user.role === 'admin'
      ? {}
      : req.user.role === 'priest'
        ? { priest: req.user.id }
        : { devotee: req.user.id };

    const bookings = await PriestBooking.find(query)
      .populate(priestBookingPopulate)
      .sort({ createdAt: -1 })
      .limit(80);

    return res.status(200).json({ bookings: bookings.map(serializePriestBooking) });
  } catch (error) {
    return res.status(500).json({ message: 'Server error.', error: error.message });
  }
};

const updatePriestBookingStatus = async (req, res) => {
  try {
    const status = normalizeStatus(req.body.status);
    const allowed = ['confirmed', 'completed', 'cancelled'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: `status must be one of: ${allowed.join(', ')}` });
    }

    const booking = await PriestBooking.findById(req.params.id)
      .populate(priestBookingPopulate);

    if (!booking) {
      return res.status(404).json({ message: 'Priest booking not found.' });
    }

    if (req.user.role === 'priest' && String(booking.priest?._id || booking.priest) !== String(req.user.id)) {
      return res.status(403).json({ message: 'You can update only your assigned seva queue items.' });
    }

    const currentStatus = normalizeStatus(booking.status);

    if (status === 'confirmed') {
      if (currentStatus !== 'payment_submitted') {
        return res.status(409).json({ message: 'Payment proof must be submitted before accepting this booking.' });
      }
    }

    if (status === 'completed') {
      if (currentStatus !== 'confirmed') {
        return res.status(409).json({ message: 'Only confirmed bookings can be marked completed.' });
      }
    }

    if (status === 'cancelled') {
      if (currentStatus === 'completed') {
        return res.status(409).json({ message: 'Completed bookings cannot be cancelled.' });
      }
    }

    booking.status = status;
    await booking.save();

    return res.status(200).json({
      message: 'Seva queue status updated successfully.',
      booking: serializePriestBooking(booking)
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error.', error: error.message });
  }
};

module.exports = {
  createPriestByAdmin,
  getPriestsForAdmin,
  updatePriestByAdmin,
  getRitualMenu,
  getPriestTemplateList,
  getPriestSlotStatus,
  createPriestBooking,
  submitPriestPaymentProof,
  verifyPriestPayment,
  getPriestBookingById,
  getMyPriestBookings,
  updatePriestBookingStatus,
  submitPriestFeedback,
  getPriestReviews
};
