const mongoose = require('mongoose');

const priestFeedbackSchema = new mongoose.Schema(
  {
    priestBooking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PriestBooking',
      required: true,
      unique: true
    },
    devotee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    priest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    priestProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PriestProfile'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true
    },
    comment: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

priestFeedbackSchema.index({ priest: 1, createdAt: -1 });
priestFeedbackSchema.index({ devotee: 1, createdAt: -1 });

module.exports = mongoose.model('PriestFeedback', priestFeedbackSchema);

