const mongoose = require('mongoose');

const guideFeedbackSchema = new mongoose.Schema(
  {
    guideBooking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GuideBooking',
      required: true,
      unique: true
    },
    devotee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    guide: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    guideProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GuideProfile'
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

guideFeedbackSchema.index({ guide: 1, createdAt: -1 });
guideFeedbackSchema.index({ devotee: 1, createdAt: -1 });

module.exports = mongoose.model('GuideFeedback', guideFeedbackSchema);

