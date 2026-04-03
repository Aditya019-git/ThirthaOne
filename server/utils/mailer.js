const nodemailer = require('nodemailer');

const hasEmailConfig = () => {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    process.env.SMTP_FROM
  );
};

let transporter;

const getTransporter = () => {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  return transporter;
};

const sendOtpEmail = async ({ to, name, otp, expiresAt }) => {
  if (!hasEmailConfig()) {
    console.log(`[DEV EMAIL OTP] to=${to} otp=${otp} expiresAt=${expiresAt.toISOString()}`);
    return { delivered: false, simulated: true };
  }

  try {
    const mailer = getTransporter();
    await mailer.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject: 'Your TirthOne OTP',
      text: `Namaste ${name || 'Devotee'}, your OTP is ${otp}. It expires in 5 minutes.`,
      html: `<p>Namaste ${name || 'Devotee'},</p><p>Your OTP is <strong>${otp}</strong>.</p><p>It expires in 5 minutes.</p>`
    });

    return { delivered: true, simulated: false };
  } catch (error) {
    console.error('Email OTP send failed:', error.message);
    return { delivered: false, simulated: false };
  }
};

module.exports = { sendOtpEmail, hasEmailConfig };
