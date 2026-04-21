const express = require('express');
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/roleGuard');
const {
  createPriestByAdmin,
  getPriestsForAdmin,
  updatePriestByAdmin,
  getRitualMenu,
  getPriestTemplateList,
  getPriestSlotStatus,
  createPriestBooking,
  submitPriestPaymentProof,
  getPriestBookingById,
  getMyPriestBookings,
  updatePriestBookingStatus,
  submitPriestFeedback,
  verifyPriestPayment,
  getPriestReviews
} = require('../controllers/priestController');

const router = express.Router();

router.get('/services', protect, allowRoles('devotee', 'admin', 'priest'), getRitualMenu);
router.get('/template-list', protect, allowRoles('devotee', 'admin'), getPriestTemplateList);
router.get('/slot-status', protect, allowRoles('devotee', 'admin', 'priest'), getPriestSlotStatus);
router.post('/book', protect, allowRoles('devotee', 'admin'), createPriestBooking);
router.get('/bookings/:id', protect, allowRoles('devotee', 'admin', 'priest'), getPriestBookingById);
router.post('/bookings/:id/payment-proof', protect, allowRoles('devotee', 'admin'), submitPriestPaymentProof);
router.get('/mine', protect, allowRoles('devotee', 'admin', 'priest'), getMyPriestBookings);
router.patch('/bookings/:id/status', protect, allowRoles('priest', 'admin'), updatePriestBookingStatus);
router.post('/bookings/:id/feedback', protect, allowRoles('devotee', 'admin'), submitPriestFeedback);
router.post('/bookings/:id/verify-payment', protect, allowRoles('devotee', 'admin'), verifyPriestPayment);

router.get('/:id/reviews', protect, allowRoles('devotee', 'admin', 'priest'), getPriestReviews);

router.post('/admin/priests', protect, allowRoles('admin'), createPriestByAdmin);
router.get('/admin/priests', protect, allowRoles('admin'), getPriestsForAdmin);
router.patch('/admin/priests/:id', protect, allowRoles('admin'), updatePriestByAdmin);

module.exports = router;
