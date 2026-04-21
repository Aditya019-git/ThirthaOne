const mongoose = require('mongoose');

const guidePlaceSchema = new mongoose.Schema(
  {
    code: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true }
  },
  { _id: false }
);

const guideBookingSchema = new mongoose.Schema({
  devotee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  guide: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'   // assigned via round-robin
  },
  guideProfile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GuideProfile'
  },
  places: {
    type: [guidePlaceSchema],
    default: []
  },
  totalAmount: {
    type: Number,
    required: true
  },
  bookingDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: [
      'pending',
      'confirmed',
      'declined',
      'no_show_reported',
      'completed',
      'cancelled',
      'refunded'
    ],
    default: 'pending'
  },
  statusNote: {
    type: String,
    default: ''
  },
  feedback: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GuideFeedback'
  },
  payment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment'
  }
}, { timestamps: true });

guideBookingSchema.index({ guide: 1, bookingDate: 1 });
guideBookingSchema.index({ devotee: 1, createdAt: -1 });
guideBookingSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('GuideBooking', guideBookingSchema);
