const express = require('express');
const { body } = require('express-validator');
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/roleGuard');
const {
  createBooking,
  getMyBookings,
  getBookingStatus,
  getBookingQr,
  resendBookingEmail,
  verifyBookingPayment,
  markBookingPaymentFailed,
  scanBookingQr,
  ALLOWED_TIME_SLOTS
} = require('../controllers/bookingController');

const router = express.Router();

const createBookingValidation = [
  body('headDevoteeName')
    .trim()
    .notEmpty()
    .withMessage('Head devotee name is required.'),
  body('headDevoteeAadhaar')
    .matches(/^\d{12}$/)
    .withMessage('Head devotee Aadhaar must be a valid 12-digit number.'),
  body('bookingDate')
    .isISO8601()
    .withMessage('bookingDate must be a valid date (YYYY-MM-DD).'),
  body('timeSlot')
    .isString()
    .custom((value) => ALLOWED_TIME_SLOTS.includes(value))
    .withMessage('Invalid time slot.'),
  body('members')
    .isArray({ min: 1, max: 6 })
    .withMessage('Members must contain between 1 and 6 entries.'),
  body('members.*.name')
    .trim()
    .notEmpty()
    .withMessage('Each member must have a name.')
];

router.post(
  '/',
  protect,
  allowRoles('devotee', 'admin'),
  createBookingValidation,
  createBooking
);

router.get('/status', protect, allowRoles('devotee', 'admin'), getBookingStatus);
router.get('/mine', protect, getMyBookings);
router.post('/scan', protect, allowRoles('gate_officer', 'admin'), scanBookingQr);
router.post('/:id/resend-email', protect, allowRoles('devotee', 'admin'), resendBookingEmail);
router.post('/:id/verify-payment', protect, allowRoles('devotee', 'admin'), verifyBookingPayment);
router.post('/:id/payment-failed', protect, allowRoles('devotee', 'admin'), markBookingPaymentFailed);
router.get('/:id/qr', protect, allowRoles('devotee', 'admin'), getBookingQr);

module.exports = router;
