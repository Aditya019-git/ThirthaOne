const express = require('express');
const router = express.Router();
const { register, sendOTP, verifyOTP, getProfile } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const adminController = require('../controllers/adminController');

// Public routes (no token needed)
router.post('/register', register);
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);
router.get('/temple-status', adminController.getPublicTempleStatus);

// Protected route (token required)
router.get('/profile', protect, getProfile);

module.exports = router;