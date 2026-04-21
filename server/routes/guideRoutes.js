const express = require('express');
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/roleGuard');
const {
  createGuideByAdmin,
  getGuidesForAdmin,
  updateGuideByAdmin,
  getGuideTemplateList,
  createGuideBooking,
  getGuideBookingById,
  getMyGuideBookings,
  updateGuideBookingStatus,
  cancelGuideBooking,
  reportGuideNoShow,
  reassignGuideBooking,
  submitGuideFeedback,
  getGuideReviews,
  verifyGuidePayment,
  runRefundEngineNow
} = require('../controllers/guideController');

const router = express.Router();

// Devotee flow
router.get('/template-list', protect, allowRoles('devotee', 'admin', 'guide'), getGuideTemplateList);
router.post('/book', protect, allowRoles('devotee', 'admin'), createGuideBooking);
router.get('/bookings/:id', protect, allowRoles('devotee', 'admin', 'guide'), getGuideBookingById);
router.get('/mine', protect, allowRoles('devotee', 'admin', 'guide'), getMyGuideBookings);
router.patch('/bookings/:id/status', protect, allowRoles('guide', 'admin'), updateGuideBookingStatus);
router.post('/bookings/:id/cancel', protect, allowRoles('devotee', 'admin'), cancelGuideBooking);
router.post('/bookings/:id/report-no-show', protect, allowRoles('devotee', 'admin'), reportGuideNoShow);
router.post('/bookings/:id/reassign', protect, allowRoles('devotee', 'admin'), reassignGuideBooking);
router.post('/bookings/:id/feedback', protect, allowRoles('devotee', 'admin'), submitGuideFeedback);
router.post('/bookings/:id/verify-payment', protect, allowRoles('devotee', 'admin'), verifyGuidePayment);

// Public or Devotee reads
router.get('/:id/reviews', protect, allowRoles('devotee', 'admin', 'guide'), getGuideReviews);

// Admin onboarding + management
router.post('/admin/guides', protect, allowRoles('admin'), createGuideByAdmin);
router.get('/admin/guides', protect, allowRoles('admin'), getGuidesForAdmin);
router.patch('/admin/guides/:id', protect, allowRoles('admin'), updateGuideByAdmin);
router.post('/admin/refund-engine/run', protect, allowRoles('admin'), runRefundEngineNow);

module.exports = router;
