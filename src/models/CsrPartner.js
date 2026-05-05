const mongoose = require('mongoose');

const csrPartnerSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  companyName: { type: String, required: true, trim: true },
  industry: { type: String, trim: true },
  contactName: { type: String, trim: true },
  contactEmail: { type: String, trim: true, lowercase: true },
  contactPhone: { type: String, trim: true },
  website: { type: String, trim: true },
  logoUrl: { type: String, default: null },
  sponsoredCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  employeeIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  totalSponsoredRewards: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('CsrPartner', csrPartnerSchema);
