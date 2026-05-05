const mongoose = require('mongoose');

const gigSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  estimatedHours: { type: Number, required: true, min: 0.5 },
  location: {
    type: { type: String, enum: ['in-person', 'remote'], default: 'in-person' },
    address: { type: String, trim: true },
  },
  requiredSkills: [{ type: String, trim: true }],
  verifiedOnly: { type: Boolean, default: false },
  status: { type: String, enum: ['open', 'closed', 'cancelled'], default: 'open' },
  applicantCount: { type: Number, default: 0 },
}, { timestamps: true });

gigSchema.index({ status: 1, categoryId: 1 });
gigSchema.index({ orgId: 1 });

module.exports = mongoose.model('Gig', gigSchema);
