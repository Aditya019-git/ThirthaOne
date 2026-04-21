const User = require('../models/User');
const GuideProfile = require('../models/GuideProfile');
const GuideBooking = require('../models/GuideBooking');
const GuideFeedback = require('../models/GuideFeedback');
const Payment = require('../models/Payment');
const { GUIDE_PLACES_CATALOG, buildGuidePlacesFromCodes, normalizePlaceCode } = require('../utils/guideRules');
const { sendGuideTripUpdateEmail } = require('../utils/mailer');
const { autoRefundGuideBookings } = require('../jobs/refundEngineCron');
const {
  isPaymentRequired,
  toPaise,
  getRazorpayClient,
  hasRazorpayCredentials,
  verifyRazorpaySignature
} = require('../utils/razorpay');

const normalizeEmail = (value = '') => String(value).trim().toLowerCase();
const normalizeMobile = (value = '') => String(value).replace(/\D/g, '');
const normalizeStatus = (value = '') => String(value).trim().toLowerCase();

const MAX_GUIDE_PHOTO_DATA_URL_LENGTH = 3 * 1024 * 1024;
const sanitizePhotoDataUrl = (value = '') => String(value || '').trim();
const isImageDataUrl = (value = '') => /^data:image\/(png|jpe?g|webp);base64,/i.test(value);

const guideBookingPopulate = [
  { path: 'devotee', select: 'name mobile email' },
  { path: 'guide', select: 'name mobile email' },
  { path: 'guideProfile', select: 'photoUrl bio age yearsExperience destinations isVerified isActive displayOrder' },
  { path: 'payment', select: 'status amount currency paidAt refundedAt type' }
];

const serializeGuideBooking = (bookingDoc) => {
  const item = bookingDoc?.toObject ? bookingDoc.toObject() : bookingDoc;
  if (!item) return null;

  return {
    id: item._id,
    bookingDate: item.bookingDate,
    places: Array.isArray(item.places) ? item.places : [],
    totalAmount: item.totalAmount,
    status: item.status,
    statusNote: item.statusNote || '',
    createdAt: item.createdAt,
    feedbackId: item.feedback || null,
    devotee: item.devotee
      ? {
          id: item.devotee?._id || null,
          name: item.devotee?.name || '',
          mobile: item.devotee?.mobile || '',
          email: item.devotee?.email || ''
        }
      : null,
    guide: item.guide
      ? {
          id: item.guide?._id || null,
          name: item.guide?.name || '',
          mobile: item.guide?.mobile || '',
          email: item.guide?.email || ''
        }
      : null,
    guideProfile: item.guideProfile
      ? {
          id: item.guideProfile?._id || null,
          photoUrl: item.guideProfile?.photoUrl || '',
          bio: item.guideProfile?.bio || '',
          age: item.guideProfile?.age ?? null,
          yearsExperience: item.guideProfile?.yearsExperience ?? 0,
          destinations: Array.isArray(item.guideProfile?.destinations) ? item.guideProfile.destinations : [],
          isVerified: Boolean(item.guideProfile?.isVerified),
          isActive: Boolean(item.guideProfile?.isActive)
        }
      : null,
    payment: item.payment
      ? {
          id: item.payment?._id || item.payment,
          type: item.payment?.type || 'guide',
          status: item.payment?.status || 'pending',
          amount: item.payment?.amount ?? item.totalAmount ?? 0,
          currency: item.payment?.currency || 'INR',
          paidAt: item.payment?.paidAt || null,
          refundedAt: item.payment?.refundedAt || null
        }
      : null
  };
};

const getRatingStatsMap = async () => {
  const rows = await GuideFeedback.aggregate([
    {
      $group: {
        _id: '$guide',
        avgRating: { $avg: '$rating' },
        reviewCount: { $sum: 1 }
      }
    }
  ]);

  const map = new Map();
  rows.forEach((row) => {
    map.set(String(row._id), {
      avgRating: Number(row.avgRating) || 0,
      reviewCount: Number(row.reviewCount) || 0
    });
  });
  return map;
};

const serializeGuideProfile = (profileDoc, ratingMap) => {
  const profile = profileDoc?.toObject ? profileDoc.toObject() : profileDoc;
  if (!profile) return null;

  const userId = profile.user?._id || profile.user;
  const stats = ratingMap?.get(String(userId)) || { avgRating: 0, reviewCount: 0 };

  return {
    id: profile._id,
    userId,
    name: profile.user?.name || '',
    email: profile.user?.email || '',
    mobile: profile.user?.mobile || '',
    age: typeof profile.age === 'number' ? profile.age : null,
    photoUrl: profile.photoUrl || '',
    bio: profile.bio || '',
    yearsExperience: profile.yearsExperience || 0,
    destinations: Array.isArray(profile.destinations) ? profile.destinations : [],
    isVerified: Boolean(profile.isVerified),
    verifiedAt: profile.verifiedAt || null,
    isActive: Boolean(profile.isActive),
    displayOrder: profile.displayOrder || 0,
    rating: {
      avg: stats.avgRating,
      count: stats.reviewCount
    }
  };
};

const createGuideByAdmin = async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = normalizeEmail(req.body.email);
    const mobile = normalizeMobile(req.body.mobile);
    const age = typeof req.body.age === 'undefined' || req.body.age === '' ? null : Number(req.body.age);
    const yearsExperience = Number(req.body.yearsExperience || 0);
    const photoDataUrl = sanitizePhotoDataUrl(req.body.photoDataUrl || req.body.photoUrl || '');
    const bio = String(req.body.bio || '').trim();
    const destinations = Array.isArray(req.body.destinations) ? req.body.destinations : [];

    if (!name) return res.status(400).json({ message: 'Guide name is required.' });
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Valid guide email is required.' });
    }
    if (!mobile || !/^\d{10}$/.test(mobile)) {
      return res.status(400).json({ message: 'Valid 10-digit guide mobile is required.' });
    }
    if (age !== null) {
      if (!Number.isFinite(age) || age < 18 || age > 90) {
        return res.status(400).json({ message: 'Guide age must be between 18 and 90.' });
      }
    }
    if (!Number.isFinite(yearsExperience) || yearsExperience < 0 || yearsExperience > 70) {
      return res.status(400).json({ message: 'yearsExperience must be between 0 and 70.' });
    }
    if (photoDataUrl) {
      if (!isImageDataUrl(photoDataUrl)) {
        return res.status(400).json({ message: 'Guide photo must be a valid PNG/JPG/WEBP image upload.' });
      }
      if (photoDataUrl.length > MAX_GUIDE_PHOTO_DATA_URL_LENGTH) {
        return res.status(400).json({ message: 'Guide photo size is too large. Please upload a smaller image.' });
      }
    }
    if (bio.length > 500) {
      return res.status(400).json({ message: 'Bio must be 500 characters or less.' });
    }

    const normalizedDestinations = [...new Set(destinations.map(normalizePlaceCode).filter(Boolean))];
    const invalidDest = normalizedDestinations.find(
      (code) => !GUIDE_PLACES_CATALOG.some((p) => p.code === code)
    );
    if (invalidDest) {
      return res.status(400).json({ message: `Invalid destination code: ${invalidDest}` });
    }

    const existing = await User.findOne({ $or: [{ email }, { mobile }] });
    if (existing) {
      return res.status(409).json({ message: 'A user already exists with this email or mobile.' });
    }

    const generatedPassword = `Guide@${Math.random().toString(36).slice(2, 10)}!`;
    const guideUser = await User.create({
      name,
      email,
      mobile,
      role: 'guide',
      password: generatedPassword
    });

    const profile = await GuideProfile.create({
      user: guideUser._id,
      age: age === null ? undefined : age,
      photoUrl: photoDataUrl,
      bio,
      yearsExperience: Number.isFinite(yearsExperience) ? Math.max(0, yearsExperience) : 0,
      destinations: normalizedDestinations,
      isActive: true,
      isVerified: true,
      verifiedAt: new Date(),
      verifiedBy: req.user.id
    });

    const ratingMap = await getRatingStatsMap();
    const populated = await GuideProfile.findById(profile._id).populate('user', 'name email mobile role');
    return res.status(201).json({
      message: 'Verified guide added successfully by admin.',
      guide: serializeGuideProfile(populated, ratingMap),
      onboarding: {
        loginMethod: 'OTP (mobile/email)',
        tempPassword: generatedPassword
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error.', error: error.message });
  }
};

const getGuidesForAdmin = async (_req, res) => {
  try {
    const ratingMap = await getRatingStatsMap();
    const guides = await GuideProfile.find({})
      .populate('user', 'name email mobile role')
      .sort({ displayOrder: 1, createdAt: 1 });

    return res.status(200).json({
      guides: guides.map((g) => serializeGuideProfile(g, ratingMap)),
      placesCatalog: GUIDE_PLACES_CATALOG
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error.', error: error.message });
  }
};

const updateGuideByAdmin = async (req, res) => {
  try {
    const profile = await GuideProfile.findById(req.params.id).populate('user', 'name email mobile role');
    if (!profile) return res.status(404).json({ message: 'Guide profile not found.' });

    if (typeof req.body.name === 'string') {
      profile.user.name = req.body.name.trim() || profile.user.name;
      await profile.user.save();
    }
    if (typeof req.body.age !== 'undefined') {
      const nextAge = req.body.age === null || req.body.age === '' ? null : Number(req.body.age);
      if (nextAge !== null) {
        if (!Number.isFinite(nextAge) || nextAge < 18 || nextAge > 90) {
          return res.status(400).json({ message: 'Guide age must be between 18 and 90.' });
        }
      }
      profile.age = nextAge === null ? undefined : nextAge;
    }
    if (typeof req.body.photoDataUrl === 'string' || typeof req.body.photoUrl === 'string') {
      const nextPhoto = sanitizePhotoDataUrl(req.body.photoDataUrl || req.body.photoUrl || '');
      if (nextPhoto) {
        if (!isImageDataUrl(nextPhoto)) {
          return res.status(400).json({ message: 'Guide photo must be a valid PNG/JPG/WEBP image upload.' });
        }
        if (nextPhoto.length > MAX_GUIDE_PHOTO_DATA_URL_LENGTH) {
          return res.status(400).json({ message: 'Guide photo size is too large. Please upload a smaller image.' });
        }
      }
      profile.photoUrl = nextPhoto;
    }
    if (typeof req.body.clearPhoto !== 'undefined' && Boolean(req.body.clearPhoto)) {
      profile.photoUrl = '';
    }
    if (typeof req.body.bio === 'string') {
      const nextBio = String(req.body.bio || '').trim();
      if (nextBio.length > 500) {
        return res.status(400).json({ message: 'Bio must be 500 characters or less.' });
      }
      profile.bio = nextBio;
    }
    if (typeof req.body.yearsExperience !== 'undefined') {
      const yrs = Number(req.body.yearsExperience);
      if (!Number.isFinite(yrs) || yrs < 0) {
        return res.status(400).json({ message: 'yearsExperience must be 0 or greater.' });
      }
      profile.yearsExperience = yrs;
    }
    if (Array.isArray(req.body.destinations)) {
      const next = [...new Set(req.body.destinations.map(normalizePlaceCode).filter(Boolean))];
      const invalid = next.find((code) => !GUIDE_PLACES_CATALOG.some((p) => p.code === code));
      if (invalid) return res.status(400).json({ message: `Invalid destination code: ${invalid}` });
      profile.destinations = next;
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
    const ratingMap = await getRatingStatsMap();
    const refreshed = await GuideProfile.findById(profile._id).populate('user', 'name email mobile role');
    return res.status(200).json({
      message: 'Guide profile updated successfully.',
      guide: serializeGuideProfile(refreshed, ratingMap)
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error.', error: error.message });
  }
};

const getGuideTemplateList = async (_req, res) => {
  try {
    const ratingMap = await getRatingStatsMap();
    const guides = await GuideProfile.find({ isActive: true, isVerified: true })
      .populate('user', 'name email mobile')
      .sort({ displayOrder: 1, createdAt: 1 });

    const list = guides.map((item) => serializeGuideProfile(item, ratingMap));
    return res.status(200).json({
      guides: list,
      placesCatalog: GUIDE_PLACES_CATALOG
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error.', error: error.message });
  }
};

const createGuideBooking = async (req, res) => {
  try {
    const guideProfileId = String(req.body.guideProfileId || '').trim();
    const bookingDateKey = String(req.body.bookingDate || '').trim();
    const placeCodes = Array.isArray(req.body.places)
      ? req.body.places
      : Array.isArray(req.body.placeCodes)
        ? req.body.placeCodes
        : [];

    if (!guideProfileId) return res.status(400).json({ message: 'guideProfileId is required.' });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(bookingDateKey)) {
      return res.status(400).json({ message: 'bookingDate must be a valid date (YYYY-MM-DD).' });
    }

    const guideProfile = await GuideProfile.findById(guideProfileId).populate('user', 'name email mobile');
    if (!guideProfile || !guideProfile.user) {
      return res.status(404).json({ message: 'Guide profile not found.' });
    }
    if (!guideProfile.isActive || !guideProfile.isVerified) {
      return res.status(409).json({ message: 'Selected guide is not available for booking.' });
    }

    const { places, totalAmount } = buildGuidePlacesFromCodes(placeCodes);
    if (!places.length || totalAmount <= 0) {
      return res.status(400).json({ message: 'Select at least one destination to continue.' });
    }

    const guideDest = Array.isArray(guideProfile.destinations) ? guideProfile.destinations : [];
    if (guideDest.length > 0) {
      const outside = places.find((p) => !guideDest.includes(p.code));
      if (outside) {
        return res.status(400).json({
          message: `This guide does not cover "${outside.name}". Please choose a different guide or destination.`
        });
      }
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
        type: 'guide',
        status: 'pending',
        staffCut: totalAmount * 0.85,
        templeCut: totalAmount * 0.15,
      });

      const order = await razorpay.orders.create({
        amount: toPaise(totalAmount),
        currency: 'INR',
        receipt: String(paymentRecord._id)
      });

      paymentRecord.razorpayOrderId = order.id;
      await paymentRecord.save();
    } else {
      paymentRecord = await Payment.create({
        user: req.user.id,
        amount: totalAmount,
        currency: 'INR',
        type: 'guide',
        status: 'paid',
        paidAt: new Date(),
        staffCut: totalAmount * 0.85,
        templeCut: totalAmount * 0.15,
      });
    }

    const booking = await GuideBooking.create({
      devotee: req.user.id,
      guide: guideProfile.user._id,
      guideProfile: guideProfile._id,
      places,
      totalAmount,
      bookingDate: new Date(`${bookingDateKey}T00:00:00+05:30`),
      status: paymentRequired ? 'pending' : 'pending', // Even without payment, it requires guide confirmation
      statusNote: 'Waiting for guide confirmation.',
      payment: paymentRecord._id
    });

    const populated = await GuideBooking.findById(booking._id).populate(guideBookingPopulate);
    
    if (paymentRequired) {
      return res.status(201).json({
        message: 'Guide request created. Complete payment to proceed.',
        booking: serializeGuideBooking(populated),
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
      message: 'Guide request created. Your guide will confirm soon.',
      booking: serializeGuideBooking(populated)
    });
  } catch (error) {
    if (error?.code === 'INVALID_PLACE') {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Server error.', error: error.message });
  }
};

const verifyGuidePayment = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const query = req.user.role === 'admin'
      ? { _id: bookingId }
      : { _id: bookingId, devotee: req.user.id };

    const booking = await GuideBooking.findOne(query);
    if (!booking) {
      return res.status(404).json({ message: 'Guide booking not found.' });
    }

    if (!booking.payment) {
      return res.status(400).json({ message: 'No payment record exists for this booking.' });
    }

    const payment = await Payment.findById(booking.payment);
    if (!payment) {
      return res.status(404).json({ message: 'Payment record not found.' });
    }

    if (payment.status === 'paid') {
      return res.status(200).json({
        message: 'Payment already verified.',
        booking: serializeGuideBooking(booking)
      });
    }

    const orderId = String(req.body.razorpay_order_id || '').trim();
    const paymentId = String(req.body.razorpay_payment_id || '').trim();
    const signature = String(req.body.razorpay_signature || '').trim();

    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({ message: 'Invalid payment verification payload.' });
    }
    
    const secret = process.env.RAZORPAY_KEY_SECRET;
    const signatureOk = verifyRazorpaySignature({ orderId, paymentId, signature, secret });

    if (!signatureOk) {
      payment.status = 'failed';
      payment.failureReason = 'Signature verification failed.';
      await payment.save();

      booking.status = 'declined';
      booking.statusNote = 'Payment failed.';
      await booking.save();
      return res.status(400).json({ message: 'Payment signature verification failed.' });
    }

    payment.status = 'paid';
    payment.razorpayOrderId = orderId;
    payment.razorpayPaymentId = paymentId;
    payment.razorpaySignature = signature;
    payment.paidAt = new Date();
    await payment.save();

    const refreshed = await GuideBooking.findById(booking._id).populate(guideBookingPopulate);
    return res.status(200).json({
      message: 'Payment verified successfully. Guide will confirm soon.',
      booking: serializeGuideBooking(refreshed)
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error.', error: error.message });
  }
};

const getGuideBookingById = async (req, res) => {
  try {
    const bookingId = String(req.params.id || '').trim();
    if (!bookingId) return res.status(400).json({ message: 'Booking id is required.' });

    const baseQuery = { _id: bookingId };
    if (req.user.role === 'devotee') baseQuery.devotee = req.user.id;
    if (req.user.role === 'guide') baseQuery.guide = req.user.id;

    const booking = await GuideBooking.findOne(baseQuery).populate(guideBookingPopulate);
    if (!booking) return res.status(404).json({ message: 'Guide booking not found.' });

    return res.status(200).json({
      message: 'Guide booking fetched successfully.',
      booking: serializeGuideBooking(booking),
      placesCatalog: GUIDE_PLACES_CATALOG
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error.', error: error.message });
  }
};

const getMyGuideBookings = async (req, res) => {
  try {
    const query = req.user.role === 'admin'
      ? {}
      : req.user.role === 'guide'
        ? { guide: req.user.id }
        : { devotee: req.user.id };

    const bookings = await GuideBooking.find(query)
      .populate(guideBookingPopulate)
      .sort({ createdAt: -1 })
      .limit(80);

    return res.status(200).json({
      bookings: bookings.map(serializeGuideBooking),
      placesCatalog: GUIDE_PLACES_CATALOG
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error.', error: error.message });
  }
};

const updateGuideBookingStatus = async (req, res) => {
  try {
    const status = normalizeStatus(req.body.status);
    const allowed = ['confirmed', 'declined', 'completed'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: `status must be one of: ${allowed.join(', ')}` });
    }

    const booking = await GuideBooking.findById(req.params.id).populate(guideBookingPopulate);
    if (!booking) return res.status(404).json({ message: 'Guide booking not found.' });

    if (req.user.role === 'guide' && String(booking.guide?._id || booking.guide) !== String(req.user.id)) {
      return res.status(403).json({ message: 'You can update only your assigned trip requests.' });
    }

    const current = normalizeStatus(booking.status);
    const note = String(req.body.note || req.body.reason || '').trim();

    if (status === 'confirmed') {
      if (current !== 'pending') {
        return res.status(409).json({ message: 'Only pending requests can be confirmed.' });
      }
      booking.status = 'confirmed';
      booking.statusNote = 'Confirmed by guide.';
    }

    if (status === 'declined') {
      if (current !== 'pending') {
        return res.status(409).json({ message: 'Only pending requests can be declined.' });
      }
      booking.status = 'declined';
      booking.statusNote = note || 'Guide is not available. Please choose another guide or cancel for refund.';
    }

    if (status === 'completed') {
      if (current !== 'confirmed') {
        return res.status(409).json({ message: 'Only confirmed trips can be completed.' });
      }
      booking.status = 'completed';
      booking.statusNote = 'Trip completed.';
    }

    await booking.save();
    const refreshed = await GuideBooking.findById(booking._id).populate(guideBookingPopulate);

    // Best-effort email notification to devotee.
    const devoteeEmail = refreshed?.devotee?.email || '';
    if (devoteeEmail) {
      const statusLabel = String(refreshed.status || '').replace(/_/g, ' ');
      const subject = `TirthOne Guide Trip: ${statusLabel}`;
      const noteToSend = status === 'declined'
        ? (note || refreshed.statusNote)
        : refreshed.statusNote;
      await sendGuideTripUpdateEmail({
        to: devoteeEmail,
        name: refreshed?.devotee?.name || '',
        booking: refreshed,
        subject,
        statusLabel,
        note: noteToSend
      });
    }

    return res.status(200).json({
      message: 'Trip status updated.',
      booking: serializeGuideBooking(refreshed)
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error.', error: error.message });
  }
};

const refundGuidePaymentIfAny = async (booking) => {
  if (!booking?.payment) return null;
  const payment = await Payment.findById(booking.payment);
  if (!payment) return null;

  if (payment.status !== 'refunded') {
    payment.status = 'refunded';
    payment.refundedAt = new Date();
    await payment.save();
  }
  return payment;
};

const cancelGuideBooking = async (req, res) => {
  try {
    const booking = await GuideBooking.findById(req.params.id).populate(guideBookingPopulate);
    if (!booking) return res.status(404).json({ message: 'Guide booking not found.' });

    if (req.user.role === 'devotee' && String(booking.devotee?._id || booking.devotee) !== String(req.user.id)) {
      return res.status(403).json({ message: 'You can cancel only your own trip bookings.' });
    }

    const current = normalizeStatus(booking.status);
    if (['completed', 'refunded'].includes(current)) {
      return res.status(409).json({ message: 'This trip can no longer be cancelled.' });
    }

    await refundGuidePaymentIfAny(booking);
    booking.status = 'refunded';
    booking.statusNote = 'Trip cancelled and refunded to devotee.';
    await booking.save();

    const refreshed = await GuideBooking.findById(booking._id).populate(guideBookingPopulate);

    const devoteeEmail = refreshed?.devotee?.email || '';
    if (devoteeEmail) {
      await sendGuideTripUpdateEmail({
        to: devoteeEmail,
        name: refreshed?.devotee?.name || '',
        booking: refreshed,
        subject: 'TirthOne Guide Trip: Refunded',
        statusLabel: 'refunded',
        note: refreshed.statusNote
      });
    }

    return res.status(200).json({
      message: 'Trip cancelled and refunded.',
      booking: serializeGuideBooking(refreshed)
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error.', error: error.message });
  }
};

const reportGuideNoShow = async (req, res) => {
  try {
    const booking = await GuideBooking.findById(req.params.id).populate(guideBookingPopulate);
    if (!booking) return res.status(404).json({ message: 'Guide booking not found.' });

    if (req.user.role === 'devotee' && String(booking.devotee?._id || booking.devotee) !== String(req.user.id)) {
      return res.status(403).json({ message: 'You can report only your own trip bookings.' });
    }

    const current = normalizeStatus(booking.status);
    if (current !== 'confirmed') {
      return res.status(409).json({ message: 'No-show can be reported only for confirmed trips.' });
    }

    booking.status = 'complaint_raised';
    booking.statusNote = 'Devotee reported that guide did not attend. (Complaint Raised)';
    await booking.save();

    const refreshed = await GuideBooking.findById(booking._id).populate(guideBookingPopulate);
    return res.status(200).json({
      message: 'Complaint reported successfully. Admin will process the refund.',
      booking: serializeGuideBooking(refreshed)
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error.', error: error.message });
  }
};

const reassignGuideBooking = async (req, res) => {
  try {
    const booking = await GuideBooking.findById(req.params.id).populate(guideBookingPopulate);
    if (!booking) return res.status(404).json({ message: 'Guide booking not found.' });

    if (req.user.role === 'devotee' && String(booking.devotee?._id || booking.devotee) !== String(req.user.id)) {
      return res.status(403).json({ message: 'You can update only your own trip bookings.' });
    }

    const current = normalizeStatus(booking.status);
    if (['completed', 'refunded'].includes(current)) {
      return res.status(409).json({ message: 'This trip can no longer be reassigned.' });
    }
    if (!['declined', 'no_show_reported', 'pending'].includes(current)) {
      return res.status(409).json({ message: 'This trip can be reassigned only after decline/no-show or while pending.' });
    }

    const nextGuideProfileId = String(req.body.guideProfileId || '').trim();
    if (!nextGuideProfileId) return res.status(400).json({ message: 'guideProfileId is required.' });

    const guideProfile = await GuideProfile.findById(nextGuideProfileId).populate('user', 'name email mobile');
    if (!guideProfile || !guideProfile.user) {
      return res.status(404).json({ message: 'Guide profile not found.' });
    }
    if (!guideProfile.isActive || !guideProfile.isVerified) {
      return res.status(409).json({ message: 'Selected guide is not available for booking.' });
    }

    const existingPlaces = Array.isArray(booking.places) ? booking.places : [];
    const guideDest = Array.isArray(guideProfile.destinations) ? guideProfile.destinations : [];
    if (guideDest.length > 0) {
      const outside = existingPlaces.find((p) => !guideDest.includes(p.code));
      if (outside) {
        return res.status(400).json({
          message: `This guide does not cover "${outside.name}". Please choose a different guide.`
        });
      }
    }

    booking.guide = guideProfile.user._id;
    booking.guideProfile = guideProfile._id;
    booking.status = 'pending';
    booking.statusNote = 'Reassigned. Waiting for guide confirmation.';
    await booking.save();

    const refreshed = await GuideBooking.findById(booking._id).populate(guideBookingPopulate);
    return res.status(200).json({
      message: 'Guide reassigned successfully.',
      booking: serializeGuideBooking(refreshed)
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error.', error: error.message });
  }
};

const submitGuideFeedback = async (req, res) => {
  try {
    const rating = Number(req.body.rating);
    const comment = String(req.body.comment || '').trim();

    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'rating must be a number between 1 and 5.' });
    }
    if (comment.length > 500) {
      return res.status(400).json({ message: 'comment must be 500 characters or less.' });
    }

    const booking = await GuideBooking.findById(req.params.id).populate(guideBookingPopulate);
    if (!booking) return res.status(404).json({ message: 'Guide booking not found.' });

    if (req.user.role === 'devotee' && String(booking.devotee?._id || booking.devotee) !== String(req.user.id)) {
      return res.status(403).json({ message: 'You can rate only your own trips.' });
    }

    const current = normalizeStatus(booking.status);
    if (current !== 'completed') {
      return res.status(409).json({ message: 'Feedback can be submitted only after trip completion.' });
    }

    const existing = await GuideFeedback.findOne({ guideBooking: booking._id });
    if (existing) {
      return res.status(409).json({ message: 'Feedback already submitted for this trip.' });
    }

    const feedback = await GuideFeedback.create({
      guideBooking: booking._id,
      devotee: booking.devotee?._id || booking.devotee,
      guide: booking.guide?._id || booking.guide,
      guideProfile: booking.guideProfile?._id || booking.guideProfile,
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

const getGuideReviews = async (req, res) => {
  try {
    const guideProfileId = req.params.id;
    const profile = await GuideProfile.findById(guideProfileId);
    if (!profile) return res.status(404).json({ message: 'Guide not found.' });

    const reviews = await GuideFeedback.find({ guide: profile.user })
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

const runRefundEngineNow = async (_req, res) => {
  try {
    const result = await autoRefundGuideBookings();
    return res.status(200).json({
      message: 'Refund engine executed.',
      result
    });
  } catch (error) {
    return res.status(500).json({ message: 'Refund engine failed.', error: error.message });
  }
};

module.exports = {
  createGuideByAdmin,
  getGuidesForAdmin,
  updateGuideByAdmin,
  getGuideTemplateList,
  createGuideBooking,
  verifyGuidePayment,
  getGuideBookingById,
  getMyGuideBookings,
  updateGuideBookingStatus,
  cancelGuideBooking,
  reportGuideNoShow,
  reassignGuideBooking,
  submitGuideFeedback,
  getGuideReviews,
  runRefundEngineNow
};
