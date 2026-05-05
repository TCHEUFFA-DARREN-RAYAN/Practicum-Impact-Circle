const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  eventType: { type: String, required: true },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  actorRole: { type: String, default: 'anonymous' },
  method: { type: String, required: true },
  route: { type: String, required: true },
  targetEntity: { type: String, default: null },
  targetId: { type: String, default: null },
  statusCode: { type: Number },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  timestamp: { type: Date, default: Date.now, immutable: true },
}, { timestamps: false });

auditLogSchema.set('strict', true);

module.exports = mongoose.model('AuditLog', auditLogSchema);
