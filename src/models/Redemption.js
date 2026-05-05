const mongoose = require('mongoose');

const redemptionSchema = new mongoose.Schema({
  volunteerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rewardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Reward', required: true },
  pointsSpent: { type: Number, required: true },
  redeemedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['active', 'used', 'expired'], default: 'active' },
}, { timestamps: true });

module.exports = mongoose.model('Redemption', redemptionSchema);
