const mongoose = require('mongoose');

const guideProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    age: {
      type: Number,
      min: 18,
      max: 90
    },
    photoUrl: {
      type: String,
      default: ''
    },
    bio: {
      type: String,
      default: ''
    },
    yearsExperience: {
      type: Number,
      default: 0,
      min: 0
    },
    destinations: {
      type: [String],
      default: []
    },
    bankDetails: {
      accountName: { type: String, default: '' },
      bankName: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      ifsc: { type: String, default: '' }
    },
    isVerified: {
      type: Boolean,
      default: true
    },
    verifiedAt: {
      type: Date
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    displayOrder: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

guideProfileSchema.index({ isVerified: 1, isActive: 1, displayOrder: 1, createdAt: 1 });

module.exports = mongoose.model('GuideProfile', guideProfileSchema);

