const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  name: { type: String, required: true }
});

const bookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  headDevoteeName: {
    type: String,
    required: true
  },
  headDevoteeAadhaar: {
    type: String,
    required: true,
    match: [/^\d{12}$/, 'Head devotee Aadhaar must be 12 digits']
  },
  members: {
    type: [memberSchema],
    validate: {
      validator: function(v) {
        return v.length >= 1 && v.length <= 6;
      },
      message: 'Booking must have between 1 and 6 members'
    }
  },
  memberCount: {
    type: Number,
    min: 1,
    max: 6
  },
  bookingDate: {
    type: Date,
    required: true
  },
  timeSlot: {
    type: String,
    required: true   // e.g. "6:00 AM - 8:00 AM"
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'visited', 'missed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  qrCode: {
    type: String    // base64 QR image string
  },
  confirmationEmailStatus: {
    type: String,
    default: 'pending'
  },
  confirmationEmailSentAt: {
    type: Date
  },
  confirmationEmailLastError: {
    type: String
  },
  payment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment'
  }
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
