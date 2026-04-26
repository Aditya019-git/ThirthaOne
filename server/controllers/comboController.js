const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

const Booking = require('../models/Booking');
const PriestBooking = require('../models/PriestBooking');
const PriestProfile = require('../models/PriestProfile');
const GuideBooking = require('../models/GuideBooking');
const GuideProfile = require('../models/GuideProfile');
const Payment = require('../models/Payment');
const Payout = require('../models/Payout');

const { getBookingStatusForDate, ensureDailyLimit, releaseDailyCapacity, normalizeMemberName, formatDateKey, getTodayDateKey, ALLOWED_TIME_SLOTS } = require('../utils/bookingRules');
const { getRitualByCode } = require('../utils/priestRules');
const { buildGuidePlacesFromCodes } = require('../utils/guideRules');
const { calculateBookingAmount, getRazorpayClient, hasRazorpayConfig, isPaymentRequired, toPaise, verifyRazorpaySignature } = require('../utils/razorpay');

const PASS_CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const PASS_CODE_LENGTH = 8;

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

const bookCombo = async (req, res) => {
  try {
    const { headDevoteeName, headDevoteeAadhaar, bookingDate, timeSlot, members = [] } = req.body;
    const { priestAddon, guideAddon } = req.body;
    
    const bookingDateKey = formatDateKey(bookingDate);
    const memberCount = members.length;

    // 1. VIP Pass validations
    if (!headDevoteeName) return res.status(400).json({ message: 'Head devotee name is required.' });
    if (!bookingDateKey || bookingDateKey < getTodayDateKey()) return res.status(400).json({ message: 'Invalid booking date.' });
    if (memberCount < 1 || memberCount > 6) return res.status(400).json({ message: 'Booking must contain between 1 and 6 devotees.' });

    const status = await getBookingStatusForDate(bookingDateKey);
    if (!status.canBook) return res.status(409).json({ message: status.message, status });

    await ensureDailyLimit(bookingDateKey);

    let vipAmount = calculateBookingAmount(memberCount);

    // 2. Priest Addon Calculation
    let priestAmount = 0;
    let priestStaffCut = 0;
    let priestTempleCut = 0;
    let ritual = null;
    let assignedPriestProfile = null;

    if (priestAddon && priestAddon.enabled) {
      ritual = getRitualByCode(priestAddon.ritualType);
      if (!ritual) return res.status(400).json({ message: 'Invalid or missing priest ritual selected.' });
      
      priestAmount = ritual.basePrice;
      priestStaffCut = priestAmount * 0.65;
      priestTempleCut = priestAmount * 0.35;

      if (priestAddon.priestId) {
        assignedPriestProfile = await PriestProfile.findById(priestAddon.priestId);
      } else {
        // assign random available priest for combo
        const docs = await PriestProfile.find({ isVerified: true });
        if (docs.length > 0) {
          assignedPriestProfile = docs[Math.floor(Math.random() * docs.length)];
        }
      }
    }

    // 3. Guide Addon Calculation
    let guideAmount = 0;
    let guideStaffCut = 0;
    let guideTempleCut = 0;
    let places = [];
    let assignedGuideProfile = null;

    if (guideAddon && guideAddon.enabled) {
      if (!guideAddon.placeCodes || !guideAddon.placeCodes.length) {
        return res.status(400).json({ message: 'Select at least one place for the guide.' });
      }

      const resPlaces = buildGuidePlacesFromCodes(guideAddon.placeCodes);
      places = resPlaces.places;
      guideAmount = resPlaces.totalAmount;
      guideStaffCut = guideAmount * 0.85;
      guideTempleCut = guideAmount * 0.15;

      if (guideAddon.guideId) {
        assignedGuideProfile = await GuideProfile.findById(guideAddon.guideId);
      } else {
        const docs = await GuideProfile.find({ isVerified: true });
        if (docs.length > 0) {
          assignedGuideProfile = docs[Math.floor(Math.random() * docs.length)];
        }
      }
    }

    // 4. Razorpay combined checkout
    const totalAmount = vipAmount + priestAmount + guideAmount;

    const paymentFlowEnabled = isPaymentRequired();
    let orderId = 'mock_order_' + Date.now();
    let paymentAmount = toPaise(totalAmount);
    let paymentCurrency = 'INR';

    if (paymentFlowEnabled && totalAmount > 0) {
      if (!hasRazorpayConfig()) {
        return res.status(503).json({ message: 'Razorpay credentials missing on server.' });
      }
      const razorpay = getRazorpayClient();
      const order = await razorpay.orders.create({
        amount: toPaise(totalAmount),
        currency: 'INR'
      });
      orderId = order.id;
      paymentAmount = order.amount;
      paymentCurrency = order.currency;
    }

    // 5. Create Payment
    const paymentRecord = await Payment.create({
      user: req.user.id,
      amount: totalAmount,
      currency: 'INR',
      type: 'combo',
      status: (paymentFlowEnabled && totalAmount > 0) ? 'pending' : 'paid',
      razorpayOrderId: orderId,
      comboBreakdown: {
        vipAmount,
        priestAmount,
        priestStaffCut,
        priestTempleCut,
        guideAmount,
        guideStaffCut,
        guideTempleCut
      }
    });

    // 6. DB Doc Creations
    // Darshan Booking
    let booking = null;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const bookingCode = await generateAvailablePassCode();
      try {
        booking = await Booking.create({
          user: req.user.id,
          headDevoteeName,
          headDevoteeAadhaar,
          bookingDate: new Date(`${bookingDateKey}T00:00:00+05:30`),
          timeSlot,
          members,
          memberCount,
          bookingCode,
          status: (paymentFlowEnabled && totalAmount > 0) ? 'pending' : 'confirmed',
          paymentRequired: (paymentFlowEnabled && totalAmount > 0),
          payment: paymentRecord._id
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

    let priestBookingId = null;
    let guideBookingId = null;

    // Priest Booking
    if (priestAddon && priestAddon.enabled) {
      const pb = await PriestBooking.create({
        devotee: req.user.id,
        darshanbooking: booking._id,
        priest: assignedPriestProfile ? assignedPriestProfile.user : undefined,
        priestProfile: assignedPriestProfile ? assignedPriestProfile._id : undefined,
        ritualType: ritual.name,
        basePrice: priestAmount,
        surcharge: 0,
        totalAmount: priestAmount,
        bookingDate: new Date(`${bookingDateKey}T00:00:00+05:30`),
        timeSlot: timeSlot,
        status: (paymentFlowEnabled && totalAmount > 0) ? 'pending' : 'confirmed',
        payment: paymentRecord._id
      });
      priestBookingId = pb._id;
      if (!(paymentFlowEnabled && totalAmount > 0) && priestStaffCut > 0 && pb.priest) {
        await Payout.create({
          staffType: 'priest',
          staffId: pb.priest,
          amount: priestStaffCut,
          sourceType: 'booking',
          referenceId: pb._id,
          status: 'pending'
        });
      }
    }

    // Guide Booking
    if (guideAddon && guideAddon.enabled) {
      const gb = await GuideBooking.create({
        devotee: req.user.id,
        guide: assignedGuideProfile ? assignedGuideProfile.user : undefined,
        guideProfile: assignedGuideProfile ? assignedGuideProfile._id : undefined,
        places,
        bookingDate: new Date(`${bookingDateKey}T00:00:00+05:30`),
        totalAmount: guideAmount,
        status: (paymentFlowEnabled && totalAmount > 0) ? 'pending' : 'confirmed',
        payment: paymentRecord._id
      });
      guideBookingId = gb._id;
      if (!(paymentFlowEnabled && totalAmount > 0) && guideStaffCut > 0 && gb.guide) {
        await Payout.create({
          staffType: 'guide',
          staffId: gb.guide,
          amount: guideStaffCut,
          sourceType: 'booking',
          referenceId: gb._id,
          status: 'pending'
        });
      }
    }

    return res.status(201).json({
      message: 'Combo booking initialized.',
      paymentRequired: (paymentFlowEnabled && totalAmount > 0),
      bookingId: booking._id,
      priestBookingId,
      guideBookingId,
      payment: (paymentFlowEnabled && totalAmount > 0) ? {
        orderId: orderId,
        amount: paymentAmount,
        currency: paymentCurrency,
        keyId: process.env.RAZORPAY_KEY_ID
      } : null
    });

  } catch (err) {
    res.status(500).json({ message: 'Server combo error.', error: err.message });
  }
};

const verifyComboPayment = async (req, res) => {
  try {
    const { id } = req.params; // booking id
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const booking = await Booking.findById(id).populate('payment');
    if (!booking) return res.status(404).json({ message: 'Darshan booking not found.' });

    const payment = booking.payment;
    if (!payment) return res.status(400).json({ message: 'Payment record missing.' });

    if (!verifyRazorpaySignature({ orderId: razorpay_order_id, paymentId: razorpay_payment_id, signature: razorpay_signature })) {
      payment.status = 'failed';
      await payment.save();
      
      booking.status = 'cancelled';
      await booking.save();
      await releaseDailyCapacity(formatDateKey(booking.bookingDate), booking.memberCount);

      // Cancel sub-bookings
      await PriestBooking.updateMany({ payment: payment._id, status: 'pending' }, { status: 'cancelled' });
      await GuideBooking.updateMany({ payment: payment._id, status: 'pending' }, { status: 'cancelled' });

      return res.status(400).json({ message: 'Invalid payment signature.' });
    }

    payment.razorpayPaymentId = razorpay_payment_id;
    payment.razorpaySignature = razorpay_signature;
    payment.status = 'paid';
    payment.paidAt = new Date();
    await payment.save();

    booking.status = 'confirmed';
    await booking.save();

    // Confirm sub-bookings
    const pbs = await PriestBooking.find({ payment: payment._id, status: 'pending' });
    for (const pb of pbs) {
      pb.status = 'confirmed';
      await pb.save();
      if (payment.comboBreakdown && payment.comboBreakdown.get('priestStaffCut') > 0 && pb.priest) {
        await Payout.create({
          staffType: 'priest',
          staffId: pb.priest,
          amount: payment.comboBreakdown.get('priestStaffCut'),
          sourceType: 'booking',
          referenceId: pb._id,
          status: 'pending'
        });
      }
    }

    const gbs = await GuideBooking.find({ payment: payment._id, status: 'pending' });
    for (const gb of gbs) {
      gb.status = 'confirmed';
      await gb.save();
      if (payment.comboBreakdown && payment.comboBreakdown.get('guideStaffCut') > 0 && gb.guide) {
        await Payout.create({
          staffType: 'guide',
          staffId: gb.guide,
          amount: payment.comboBreakdown.get('guideStaffCut'),
          sourceType: 'booking',
          referenceId: gb._id,
          status: 'pending'
        });
      }
    }

    return res.status(200).json({ message: 'Combo payment verified successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Server combo verify error.', error: err.message });
  }
};

module.exports = {
  bookCombo,
  verifyComboPayment
};
