const mongoose = require('mongoose');

const VALID_TRANSITIONS = {
  accepted: ['inProgress'],
  inProgress: ['completed'],
  completed: ['approved', 'rejected'],
};

const taskSchema = new mongoose.Schema({
  applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true },
  gigId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gig', required: true },
  volunteerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  status: {
    type: String,
    enum: ['accepted', 'inProgress', 'completed', 'approved', 'rejected'],
    default: 'accepted',
  },
  hoursLogged: { type: Number, default: 0 },
  submittedAt: { type: Date, default: null },
  verifiedAt: { type: Date, default: null },
  autoApprovedAt: { type: Date, default: null },
  rejectionReason: { type: String, default: null },
  remindersSent: [{ type: Number }],
}, { timestamps: true });

taskSchema.methods.canTransitionTo = function (newStatus) {
  const allowed = VALID_TRANSITIONS[this.status] || [];
  return allowed.includes(newStatus);
};

taskSchema.index({ volunteerId: 1 });
taskSchema.index({ orgId: 1, status: 1 });
taskSchema.index({ submittedAt: 1, status: 1 });

module.exports = mongoose.model('Task', taskSchema);
