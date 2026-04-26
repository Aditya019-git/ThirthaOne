const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/roleGuard');
const { getPayoutSummary, settlePayouts } = require('../controllers/payoutController');

router.get('/summary', protect, allowRoles('admin'), getPayoutSummary);
router.post('/settle/:staffId', protect, allowRoles('admin'), settlePayouts);

module.exports = router;
