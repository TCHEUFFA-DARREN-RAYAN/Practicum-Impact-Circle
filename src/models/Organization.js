const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  orgName: { type: String, required: true, trim: true },
  missionStatement: { type: String, trim: true },
  categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  contactName: { type: String, trim: true },
  contactEmail: { type: String, trim: true, lowercase: true },
  contactPhone: { type: String, trim: true },
  address: { type: String, trim: true },
  website: { type: String, trim: true },
  logoUrl: { type: String, default: null },
  totalFacilitatedHours: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Organization', organizationSchema);
