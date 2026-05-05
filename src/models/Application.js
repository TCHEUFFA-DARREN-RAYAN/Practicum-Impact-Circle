const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  gigId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gig', required: true },
  volunteerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  personalStatement: { type: String, required: true, trim: true, minlength: 20 },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  decisionReason: { type: String, default: null },
  decidedAt: { type: Date, default: null },
}, { timestamps: true });

applicationSchema.index({ gigId: 1, volunteerId: 1 }, { unique: true });
applicationSchema.index({ volunteerId: 1 });

module.exports = mongoose.model('Application', applicationSchema);
