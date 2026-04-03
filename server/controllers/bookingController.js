const Booking = require('../models/Booking');
const DailyLimit = require('../models/DailyLimit');
const { validationResult } = require('express-validator');
const { generateBookingQrDataUrl } = require('../utils/qr');
const {
  formatDateKey,
  getTodayDateKey,
  getBookingStatusForDate
} = require('../utils/bookingRules');

const ALLOWED_TIME_SLOTS = [
  '06:00 AM - 08:00 AM',
  '08:00 AM - 10:00 AM',
  '10:00 AM - 12:00 PM',
  '04:00 PM - 06:00 PM'
];

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

    const booking = await Booking.create({
      user: req.user.id,
      headDevoteeName,
      headDevoteeAadhaar,
      members,
      memberCount,
      bookingDate: new Date(`${bookingDateKey}T00:00:00+05:30`),
      timeSlot,
      status: 'confirmed'
    });

    let qrReady = true;
    try {
      await ensureBookingQr(booking);
    } catch (qrError) {
      qrReady = false;
      console.error(`[BookingQR] Failed for booking ${booking._id}: ${qrError.message}`);
    }

    res.status(201).json({
      message: 'Booking created successfully.',
      bookingId: booking._id,
      booking: serializeBooking(booking),
      qrReady,
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
  ALLOWED_TIME_SLOTS
};
