const mongoose = require('mongoose');

const volunteerProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  firstName: { type: String, trim: true },
  lastName: { type: String, trim: true },
  phone: { type: String, trim: true },
  dateOfBirth: { type: Date },
  address: { type: String, trim: true },
  skills: [{ type: String, trim: true }],
  interests: [{ type: String, trim: true }],
  languages: [{ type: String, trim: true }],
  weeklyAvailabilityHours: { type: Number, default: 0 },
  weeklyAvailabilityDays: [{ type: String }],
  previousVolunteeringHistory: { type: String, trim: true },
  preferredCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  references: [{
    name: String,
    relationship: String,
    email: String,
    phone: String,
  }],
  documents: {
    govId: { type: String, default: null },
    backgroundCheck: { type: String, default: null },
    additionalRefs: [{ type: String }],
  },
  totalVerifiedHours: { type: Number, default: 0 },
  totalPoints: { type: Number, default: 0 },
  categoryHours: { type: Map, of: Number, default: {} },
  badges: [{ type: String }],
  registrationStep: { type: Number, default: 1, min: 1, max: 5 },
  consentGiven: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('VolunteerProfile', volunteerProfileSchema);
