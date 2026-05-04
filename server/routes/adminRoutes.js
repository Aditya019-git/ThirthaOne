const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/roleGuard');
const adminController = require('../controllers/adminController');

router.use(protect);
router.use(allowRoles('admin'));

// 1. Dash Metrics
router.get('/metrics', adminController.getDashboardMetrics);

// 2. Complaints & Penalty
router.get('/complaints', adminController.getComplaints);
router.patch('/complaints/:id/resolve', adminController.resolveComplaint);
router.delete('/complaints/:id', adminController.deleteComplaint);

// 3. Admin Refunds
router.post('/refund', adminController.processManualRefund);

// 4. Reports Generation
router.get('/reports/csv', adminController.generateCsvReport);

// 5. Gate Officer Management
router.get('/gate-officers', adminController.getGateOfficers);
router.post('/gate-officers', adminController.createGateOfficer);
router.delete('/gate-officers/:id', adminController.deleteGateOfficer);

module.exports = router;
