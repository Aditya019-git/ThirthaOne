const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

const Booking = require('../models/Booking');
const PriestBooking = require('../models/PriestBooking');
const PriestProfile = require('../models/PriestProfile');
const GuideBooking = require('../models/GuideBooking');
const GuideProfile = require('../models/GuideProfile');
const Payment = require('../models/Payment');

const { getBookingStatusForDate, ensureDailyLimit, releaseDailyCapacity, normalizeMemberName, formatDateKey, getTodayDateKey, ALLOWED_TIME_SLOTS } = require('../utils/bookingRules');
const { getRitualByCode } = require('../utils/priestRules');
const { buildGuidePlacesFromCodes } = require('../utils/guideRules');
const { calculateBookingAmount, getRazorpayClient, hasRazorpayCredentials, toPaise, verifyRazorpaySignature } = require('../utils/razorpay');

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

      // assign random available priest for combo
      const docs = await PriestProfile.find({ isVerified: true });
      if (docs.length > 0) {
        assignedPriestProfile = docs[Math.floor(Math.random() * docs.length)];
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

      const docs = await GuideProfile.find({ isVerified: true });
      if (docs.length > 0) {
        assignedGuideProfile = docs[Math.floor(Math.random() * docs.length)];
      }
    }

    // 4. Razorpay combined checkout
    const totalAmount = vipAmount + priestAmount + guideAmount;

    if (!hasRazorpayCredentials()) {
      return res.status(503).json({ message: 'Razorpay credentials missing on server.' });
    }
    const razorpay = getRazorpayClient();

    const order = await razorpay.orders.create({
      amount: toPaise(totalAmount),
      currency: 'INR'
    });

    // 5. Create Payment
    const paymentRecord = await Payment.create({
      user: req.user.id,
      amount: totalAmount,
      currency: 'INR',
      type: 'combo',
      status: 'pending',
      razorpayOrderId: order.id,
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
    const booking = await Booking.create({
      user: req.user.id,
      headDevoteeName,
      headDevoteeAadhaar,
      bookingDate: new Date(`${bookingDateKey}T00:00:00+05:30`),
      timeSlot,
      members,
      memberCount,
      status: 'pending',
      paymentRequired: true,
      payment: paymentRecord._id
    });

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
        status: 'pending',
        payment: paymentRecord._id
      });
      priestBookingId = pb._id;
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
        status: 'pending',
        payment: paymentRecord._id
      });
      guideBookingId = gb._id;
    }

    return res.status(201).json({
      message: 'Combo booking initialized.',
      paymentRequired: true,
      bookingId: booking._id,
      priestBookingId,
      guideBookingId,
      payment: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID
      }
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
    await PriestBooking.updateMany({ payment: payment._id, status: 'pending' }, { status: 'confirmed' });
    await GuideBooking.updateMany({ payment: payment._id, status: 'pending' }, { status: 'confirmed' });

    return res.status(200).json({ message: 'Combo payment verified successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Server combo verify error.', error: err.message });
  }
};

module.exports = {
  bookCombo,
  verifyComboPayment
};
