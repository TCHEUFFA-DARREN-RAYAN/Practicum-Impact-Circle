const mongoose = require('mongoose');

const hourRecordSchema = new mongoose.Schema({
  volunteerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  gigId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gig', required: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  hours: { type: Number, required: true, min: 0.5 },
  pointsAwarded: { type: Number, required: true, default: 0 },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  approvedAt: { type: Date, required: true },
  autoApproved: { type: Boolean, default: false },
}, { timestamps: true });

hourRecordSchema.index({ volunteerId: 1, categoryId: 1 });

module.exports = mongoose.model('HourRecord', hourRecordSchema);
