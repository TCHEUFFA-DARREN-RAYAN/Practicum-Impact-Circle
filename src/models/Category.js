const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String, trim: true },
  pointsPerHour: { type: Number, default: 10 },
  isActive: { type: Boolean, default: true },
  colorHex: { type: String, default: '#2563eb' },
  icon: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);
