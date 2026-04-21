const express = require('express');
const router = express.Router();
const { bookCombo, verifyComboPayment } = require('../controllers/comboController');
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/roleGuard');

router.post('/book', protect, allowRoles('devotee', 'admin'), bookCombo);
router.post('/verify-payment/:id', protect, allowRoles('devotee', 'admin'), verifyComboPayment);

module.exports = router;
