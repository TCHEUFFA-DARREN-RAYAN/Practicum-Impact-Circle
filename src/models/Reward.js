const mongoose = require('mongoose');

const rewardSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  sponsorName: { type: String, trim: true },
  sponsorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  pointsRequired: { type: Number, required: true, min: 0 },
  categoryHoursRequired: { type: Number, required: true, min: 0 },
  type: { type: String, enum: ['discount', 'eventPass', 'perk', 'badge', 'certificate'], default: 'perk' },
  isActive: { type: Boolean, default: true },
  isRetired: { type: Boolean, default: false },
  quantity: { type: Number, default: null },
  imageUrl: { type: String, default: null },
}, { timestamps: true });

rewardSchema.index({ isActive: 1, isRetired: 1 });

module.exports = mongoose.model('Reward', rewardSchema);
