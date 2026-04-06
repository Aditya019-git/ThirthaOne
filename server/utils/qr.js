const QRCode = require('qrcode');

const maskAadhaar = (aadhaar = '') => {
  const clean = String(aadhaar).replace(/\D/g, '');
  if (clean.length !== 12) return '************';
  return `XXXXXXXX${clean.slice(-4)}`;
};

const buildBookingQrPayload = (booking) => ({
  bookingId: String(booking._id),
  bookingCode: booking.bookingCode || '',
  passCode: booking.bookingCode || '',
  headDevoteeName: booking.headDevoteeName,
  headDevoteeAadhaarMasked: maskAadhaar(booking.headDevoteeAadhaar),
  memberCount: booking.memberCount,
  members: (booking.members || []).map((m) => m.name),
  bookingDate: booking.bookingDate,
  timeSlot: booking.timeSlot,
  status: booking.status
});

const generateBookingQrDataUrl = async (booking) => {
  const payload = buildBookingQrPayload(booking);
  return QRCode.toDataURL(JSON.stringify(payload), {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 340
  });
};

module.exports = { generateBookingQrDataUrl };
