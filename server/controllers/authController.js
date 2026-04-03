const User = require('../models/User');
const { generateOTP, otpExpiry } = require('../utils/otp');
const { generateToken } = require('../utils/jwt');
const { sendOtpEmail } = require('../utils/mailer');
const { sendOtpSms } = require('../utils/sms');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_REGEX = /^\d{10}$/;
const VALID_AUTH_METHODS = ['email', 'mobile'];

const normalizeEmail = (value = '') => value.trim().toLowerCase();
const normalizeMobile = (value = '') => value.replace(/\D/g, '');

const getAuthMethod = (value) => {
  const method = String(value || '').trim().toLowerCase();
  return VALID_AUTH_METHODS.includes(method) ? method : null;
};

const buildIdentifierQuery = ({ authMethod, email, mobile }) => {
  if (authMethod === 'email') return { email };
  if (authMethod === 'mobile') return { mobile };
  return null;
};

const register = async (req, res) => {
  try {
    const { name, password, role } = req.body;
    const email = normalizeEmail(req.body.email);
    const mobile = normalizeMobile(req.body.mobile);
    const desiredRole = role || 'devotee';

    if (!name) {
      return res.status(400).json({ message: 'Name is required.' });
    }

    if (!email && !mobile) {
      return res.status(400).json({ message: 'At least one of email or mobile is required.' });
    }

    if (email && !EMAIL_REGEX.test(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }

    if (mobile && !MOBILE_REGEX.test(mobile)) {
      return res.status(400).json({ message: 'Mobile number must be 10 digits.' });
    }

    const uniqueChecks = [];
    if (email) uniqueChecks.push({ email });
    if (mobile) uniqueChecks.push({ mobile });

    if (uniqueChecks.length > 0) {
      const existingUser = await User.findOne({ $or: uniqueChecks });
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists with this email or mobile.' });
      }
    }

    if (desiredRole !== 'devotee' && !password) {
      return res.status(400).json({ message: 'Password is required for staff/admin account creation.' });
    }

    const restrictedRoles = ['priest', 'guide', 'gate_officer', 'admin'];
    if (restrictedRoles.includes(desiredRole)) {
      return res.status(403).json({ message: 'Cannot self-register as this role. Contact admin.' });
    }

    const user = await User.create({
      name,
      email: email || undefined,
      mobile: mobile || undefined,
      password: desiredRole === 'devotee' ? undefined : password,
      role: desiredRole
    });

    const token = generateToken(user);
    res.status(201).json({
      message: 'Registration successful.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error.', error: error.message });
  }
};

const sendOTP = async (req, res) => {
  try {
    const authMethod = getAuthMethod(req.body.authMethod);
    const email = normalizeEmail(req.body.email);
    const mobile = normalizeMobile(req.body.mobile);

    if (!authMethod) {
      return res.status(400).json({ message: 'authMethod must be "email" or "mobile".' });
    }

    if (authMethod === 'email') {
      if (!email || !EMAIL_REGEX.test(email)) {
        return res.status(400).json({ message: 'Valid email is required for email OTP login.' });
      }
    } else if (authMethod === 'mobile') {
      if (!mobile || !MOBILE_REGEX.test(mobile)) {
        return res.status(400).json({ message: 'Valid 10-digit mobile is required for mobile OTP login.' });
      }
    }

    const identifierQuery = buildIdentifierQuery({ authMethod, email, mobile });
    const user = await User.findOne(identifierQuery);
    if (!user) {
      return res.status(404).json({ message: `No account found for this ${authMethod}.` });
    }

    if (user.isBlocked) {
      return res.status(403).json({ message: 'Your account is blocked. Please contact temple admin.' });
    }

    const otp = generateOTP();
    const expiresAt = otpExpiry();
    user.otp = { code: otp, expiresAt };
    await user.save();

    let delivery = { delivered: false, simulated: false };
    if (authMethod === 'email') {
      if (!user.email) {
        return res.status(400).json({ message: 'This account has no email. Choose mobile OTP.' });
      }
      delivery = await sendOtpEmail({
        to: user.email,
        name: user.name,
        otp,
        expiresAt
      });
    } else {
      if (!user.mobile) {
        return res.status(400).json({ message: 'This account has no mobile. Choose email OTP.' });
      }
      delivery = await sendOtpSms({
        mobile: user.mobile,
        otp
      });
    }

    const response = {
      message: delivery.delivered
        ? `OTP sent successfully via ${authMethod}.`
        : `OTP generated. ${authMethod.toUpperCase()} delivery fallback is active.`,
      authMethod,
      expiresAt,
      delivery
    };

    if (process.env.NODE_ENV !== 'production') {
      response.otp = otp;
    }

    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ message: 'Server error.', error: error.message });
  }
};

const verifyOTP = async (req, res) => {
  try {
    const authMethod = getAuthMethod(req.body.authMethod);
    const email = normalizeEmail(req.body.email);
    const mobile = normalizeMobile(req.body.mobile);
    const otp = String(req.body.otp || '').trim();

    if (!authMethod) {
      return res.status(400).json({ message: 'authMethod must be "email" or "mobile".' });
    }

    if (!otp) {
      return res.status(400).json({ message: 'OTP is required.' });
    }

    if (authMethod === 'email' && !email) {
      return res.status(400).json({ message: 'Email is required for email OTP verification.' });
    }
    if (authMethod === 'mobile' && !mobile) {
      return res.status(400).json({ message: 'Mobile is required for mobile OTP verification.' });
    }

    const user = await User.findOne(buildIdentifierQuery({ authMethod, email, mobile }));
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (!user.otp?.code || !user.otp?.expiresAt) {
      return res.status(400).json({ message: 'No active OTP. Please request a new OTP.' });
    }

    if (user.otp.code !== otp) {
      return res.status(400).json({ message: 'Invalid OTP.' });
    }

    if (new Date(user.otp.expiresAt) < new Date()) {
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    user.otp = { code: null, expiresAt: null };
    await user.save();

    const token = generateToken(user);
    res.status(200).json({
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error.', error: error.message });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -otp');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Server error.', error: error.message });
  }
};

module.exports = { register, sendOTP, verifyOTP, getProfile };
