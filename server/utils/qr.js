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

const buildUpiPayLink = ({ upiId, payeeName = '', amount, note = '' }) => {
  const params = new URLSearchParams();
  params.set('pa', String(upiId || '').trim());
  if (payeeName) params.set('pn', String(payeeName).trim());
  if (typeof amount === 'number' && Number.isFinite(amount) && amount > 0) {
    params.set('am', String(amount.toFixed(2)));
  }
  params.set('cu', 'INR');
  if (note) params.set('tn', String(note).trim().slice(0, 80));
  return `upi://pay?${params.toString()}`;
};

const generateUpiQrDataUrl = async ({ upiId, payeeName = '', amount, note = '' }) => {
  const link = buildUpiPayLink({ upiId, payeeName, amount, note });
  return QRCode.toDataURL(link, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 320
  });
};

module.exports = { generateBookingQrDataUrl, buildUpiPayLink, generateUpiQrDataUrl };
