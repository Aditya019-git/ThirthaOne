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

const formatBookingDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
};

const dataUrlToBuffer = (dataUrl) => {
  const match = /^data:image\/png;base64,(.+)$/i.exec(String(dataUrl || ''));
  if (!match) return null;
  return Buffer.from(match[1], 'base64');
};

const sendBookingConfirmationEmail = async ({ to, name, booking, qrCode }) => {
  if (!hasEmailConfig()) {
    console.log(`[DEV BOOKING EMAIL] to=${to} bookingId=${booking?._id}`);
    return { delivered: false, simulated: true, message: 'SMTP not configured.' };
  }

  try {
    const mailer = getTransporter();
    const qrBuffer = dataUrlToBuffer(qrCode);

    await mailer.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject: `Booking Confirmed | TirthOne | ${booking?._id}`,
      text: [
        `Namaste ${name || 'Devotee'},`,
        '',
        'Your VIP Darshan booking is confirmed.',
        `Booking ID: ${booking?._id}`,
        `Date: ${formatBookingDate(booking?.bookingDate)}`,
        `Slot: ${booking?.timeSlot || '-'}`,
        `Total People: ${booking?.memberCount || '-'}`,
        '',
        'Please carry the head devotee original Aadhaar at entry gate.'
      ].join('\n'),
      html: [
        `<p>Namaste ${name || 'Devotee'},</p>`,
        '<p>Your VIP Darshan booking is <strong>confirmed</strong>.</p>',
        `<p><strong>Booking ID:</strong> ${booking?._id || '-'}</p>`,
        `<p><strong>Date:</strong> ${formatBookingDate(booking?.bookingDate)}</p>`,
        `<p><strong>Slot:</strong> ${booking?.timeSlot || '-'}</p>`,
        `<p><strong>Total People:</strong> ${booking?.memberCount || '-'}</p>`,
        '<p>Please carry the head devotee original Aadhaar at entry gate.</p>',
        '<p>Jai Bhimashankar.</p>'
      ].join(''),
      attachments: qrBuffer
        ? [
            {
              filename: `vip-darshan-qr-${booking?._id || 'pass'}.png`,
              content: qrBuffer,
              contentType: 'image/png'
            }
          ]
        : []
    });

    return { delivered: true, simulated: false, message: 'Booking confirmation email sent.' };
  } catch (error) {
    console.error('Booking confirmation email failed:', error.message);
    return { delivered: false, simulated: false, message: error.message };
  }
};

const formatGuidePlaces = (places = []) => {
  const list = Array.isArray(places) ? places : [];
  if (!list.length) return '-';
  return list
    .map((p) => {
      const name = p?.name || p?.code || '-';
      const price = Number(p?.price);
      return Number.isFinite(price) ? `${name} (Rs. ${price})` : name;
    })
    .join(', ');
};

const sendGuideTripUpdateEmail = async ({ to, name, booking, subject, statusLabel, note }) => {
  if (!to) {
    return { delivered: false, simulated: false, reason: 'Recipient email is missing.' };
  }

  const devoteeName = name || booking?.devotee?.name || booking?.headDevoteeName || 'Devotee';
  const guideName = booking?.guide?.name || 'Guide';
  const bookingDate = booking?.bookingDate
    ? new Date(booking.bookingDate).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
    : '-';
  const places = formatGuidePlaces(booking?.places);
  const amount = Number(booking?.totalAmount) || 0;
  const status = statusLabel || String(booking?.status || 'updated').replace(/_/g, ' ');
  const safeNote = String(note || booking?.statusNote || '').trim();
  const subjectLine = subject || `TirthOne Guide Trip Update: ${status}`;

  if (!hasEmailConfig()) {
    console.log(`[DEV GUIDE EMAIL] to=${to} status=${status} date=${bookingDate} guide=${guideName} amount=${amount}`);
    return { delivered: false, simulated: true };
  }

  try {
    const mailer = getTransporter();
    const html = `
      <p>Namaste ${devoteeName},</p>
      <p>Your guide trip has an update.</p>
      <p><strong>Status:</strong> ${status}</p>
      <p><strong>Guide:</strong> ${guideName}</p>
      <p><strong>Date:</strong> ${bookingDate}</p>
      <p><strong>Destinations:</strong> ${places}</p>
      <p><strong>Total:</strong> Rs. ${amount}</p>
      ${safeNote ? `<p><strong>Note:</strong> ${safeNote}</p>` : ''}
      <p>Jai Bhimashankar.</p>
    `;

    const text = [
      `Namaste ${devoteeName},`,
      'Your guide trip has an update.',
      `Status: ${status}`,
      `Guide: ${guideName}`,
      `Date: ${bookingDate}`,
      `Destinations: ${places}`,
      `Total: Rs. ${amount}`,
      safeNote ? `Note: ${safeNote}` : null,
      'Jai Bhimashankar.'
    ].filter(Boolean).join('\n');

    await mailer.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject: subjectLine,
      text,
      html
    });

    return { delivered: true, simulated: false };
  } catch (error) {
    console.error('Guide trip update email failed:', error.message);
    return { delivered: false, simulated: false, reason: error.message };
  }
};

module.exports = { sendOtpEmail, sendBookingConfirmationEmail, sendGuideTripUpdateEmail, hasEmailConfig };
