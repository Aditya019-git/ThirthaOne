const { formatDateKey, getTodayDateKey } = require('./bookingRules');

const PRIEST_DARSHAN_START_HOUR_IST = 6;
const PRIEST_DARSHAN_END_HOUR_IST = 14;
const PRIEST_SLOT_CAPACITY = 5;
const PRIEST_PENDING_PAYMENT_EXPIRY_MINUTES = 15;

const ALLOWED_PRIEST_TIME_SLOTS = [
  '06:00 AM - 07:00 AM',
  '07:00 AM - 08:00 AM',
  '08:00 AM - 09:00 AM',
  '09:00 AM - 10:00 AM',
  '10:00 AM - 11:00 AM',
  '11:00 AM - 12:00 PM',
  '12:00 PM - 01:00 PM',
  '01:00 PM - 02:00 PM'
];

const RITUAL_MENU = [
  { code: 'JALABHISHEK', name: 'जलाभिषेक (Jalabhishek)', basePrice: 2100, description: '10 mins' },
  { code: 'RUDRA_ABHISHEK', name: 'रुद्राभिषेक (Rudra Abhishek)', basePrice: 3100, description: '15 mins | Panchamrut Pooja' },
  { code: 'MAHAPOOJA', name: 'महापूजा (Mahapooja)', basePrice: 51000, description: '20 mins | Panchamrut + Rudra Avartan' },
  { code: 'LAGHU_RUDRA', name: 'लघु रुद्र (Laghu Rudra)', basePrice: 7100, description: 'Panchamrut Pooja + 1 Brahman Bhojan' },
  { code: 'MAHA_RUDRA', name: 'महारुद्र (Maha Rudra)', basePrice: 21000, description: '11 Brahman Bhojan + Vastra Daan (Pancha & Saree)' }
];

const getRitualByCode = (code) =>
  RITUAL_MENU.find((item) => item.code === String(code || '').trim().toUpperCase()) || null;

const isPriestBookingDateAllowed = (bookingDateValue) => {
  const dateKey = formatDateKey(bookingDateValue);
  if (!dateKey) return { ok: false, message: 'Invalid booking date.' };

  const todayKey = getTodayDateKey();
  if (dateKey !== todayKey) {
    return {
      ok: false,
      message: 'Priest ritual booking is same-day only.'
    };
  }

  return { ok: true, dateKey };
};

module.exports = {
  PRIEST_DARSHAN_START_HOUR_IST,
  PRIEST_DARSHAN_END_HOUR_IST,
  PRIEST_SLOT_CAPACITY,
  PRIEST_PENDING_PAYMENT_EXPIRY_MINUTES,
  ALLOWED_PRIEST_TIME_SLOTS,
  RITUAL_MENU,
  getRitualByCode,
  isPriestBookingDateAllowed
};
