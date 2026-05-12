const { DataTypes, Sequelize: Sq } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/db');

/* ───────────────────────────────── USER ──────────────────────────────────── */
const User = sequelize.define('User', {
  id:                 { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  email:              { type: DataTypes.STRING(191), allowNull: false, unique: true },
  passwordHash:       { type: DataTypes.STRING(255), allowNull: false },
  role:               { type: DataTypes.ENUM('volunteer', 'org', 'admin', 'csr'), allowNull: false },
  verificationStatus: { type: DataTypes.ENUM('pending', 'verified', 'rejected'), defaultValue: 'pending' },
  rejectionReason:    { type: DataTypes.TEXT, allowNull: true },
  /* Password reset — columns must exist in MySQL; run doc/mysql-add-password-reset.sql if missing */
  resetPasswordToken:   { type: DataTypes.STRING(255), allowNull: true },
  resetPasswordExpires: { type: DataTypes.DATE, allowNull: true },
});

User.beforeCreate(async (u) => { u.passwordHash = await bcrypt.hash(u.passwordHash, 12); });
User.beforeUpdate(async (u) => { if (u.changed('passwordHash')) u.passwordHash = await bcrypt.hash(u.passwordHash, 12); });
User.prototype.comparePassword = function (plain) { return bcrypt.compare(plain, this.passwordHash); };
User.prototype.toSafeObject = function () {
  const { passwordHash, ...rest } = this.toJSON(); return rest;
};

/* ──────────────────────────── VOLUNTEER PROFILE ─────────────────────────── */
const VolunteerProfile = sequelize.define('VolunteerProfile', {
  id:                           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId:                       { type: DataTypes.INTEGER, allowNull: false, unique: true },
  firstName:                    { type: DataTypes.STRING(100) },
  lastName:                     { type: DataTypes.STRING(100) },
  phone:                        { type: DataTypes.STRING(30) },
  dateOfBirth:                  { type: DataTypes.DATEONLY },
  address:                      { type: DataTypes.STRING(255) },
  skills:                       { type: DataTypes.JSON, defaultValue: [] },
  interests:                    { type: DataTypes.JSON, defaultValue: [] },
  languages:                    { type: DataTypes.JSON, defaultValue: [] },
  weeklyAvailabilityHours:      { type: DataTypes.FLOAT, defaultValue: 0 },
  weeklyAvailabilityDays:       { type: DataTypes.JSON, defaultValue: [] },
  previousVolunteeringHistory:  { type: DataTypes.TEXT },
  preferredCategories:          { type: DataTypes.JSON, defaultValue: [] },
  references:                   { type: DataTypes.JSON, defaultValue: [] },
  govId:                        { type: DataTypes.STRING(255), allowNull: true },
  backgroundCheck:              { type: DataTypes.STRING(255), allowNull: true },
  additionalRefs:               { type: DataTypes.JSON, defaultValue: [] },
  totalVerifiedHours:           { type: DataTypes.FLOAT, defaultValue: 0 },
  totalPoints:                  { type: DataTypes.INTEGER, defaultValue: 0 },
  badges:                       { type: DataTypes.JSON, defaultValue: [] },
  registrationStep:             { type: DataTypes.INTEGER, defaultValue: 1 },
  consentGiven:                 { type: DataTypes.BOOLEAN, defaultValue: false },
});

/* ────────────────────── VOLUNTEER CATEGORY HOURS ────────────────────────── */
const VolunteerCategoryHours = sequelize.define('VolunteerCategoryHours', {
  id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  volunteerId: { type: DataTypes.INTEGER, allowNull: false },
  categoryId:  { type: DataTypes.INTEGER, allowNull: false },
  hours:       { type: DataTypes.FLOAT, defaultValue: 0 },
});

/* ─────────────────────────── ORGANIZATION ───────────────────────────────── */
const Organization = sequelize.define('Organization', {
  id:                    { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId:                { type: DataTypes.INTEGER, allowNull: false, unique: true },
  orgName:               { type: DataTypes.STRING(200), allowNull: false },
  missionStatement:      { type: DataTypes.TEXT },
  categories:            { type: DataTypes.JSON, defaultValue: [] },
  contactName:           { type: DataTypes.STRING(150) },
  contactEmail:          { type: DataTypes.STRING(191) },
  contactPhone:          { type: DataTypes.STRING(30) },
  address:               { type: DataTypes.STRING(255) },
  website:               { type: DataTypes.STRING(255) },
  logoUrl:               { type: DataTypes.STRING(255) },
  totalFacilitatedHours: { type: DataTypes.FLOAT, defaultValue: 0 },
});

/* ─────────────────────────── CSR PARTNER ────────────────────────────────── */
const CsrPartner = sequelize.define('CsrPartner', {
  id:                   { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId:               { type: DataTypes.INTEGER, allowNull: false, unique: true },
  companyName:          { type: DataTypes.STRING(200), allowNull: false },
  industry:             { type: DataTypes.STRING(150) },
  contactName:          { type: DataTypes.STRING(150) },
  contactEmail:         { type: DataTypes.STRING(191) },
  contactPhone:         { type: DataTypes.STRING(30) },
  website:              { type: DataTypes.STRING(255) },
  logoUrl:              { type: DataTypes.STRING(255) },
  sponsoredCategories:  { type: DataTypes.JSON, defaultValue: [] },
  totalSponsoredRewards:{ type: DataTypes.INTEGER, defaultValue: 0 },
});

/* ──────────────────────────── CSR EMPLOYEES ─────────────────────────────── */
const CsrEmployee = sequelize.define('CsrEmployee', {
  id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  csrPartnerId: { type: DataTypes.INTEGER, allowNull: false },
  userId:       { type: DataTypes.INTEGER, allowNull: false },
});

/* ──────────────────────────── CATEGORY ──────────────────────────────────── */
const Category = sequelize.define('Category', {
  id:            { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name:          { type: DataTypes.STRING(100), allowNull: false, unique: true },
  description:   { type: DataTypes.TEXT },
  pointsPerHour: { type: DataTypes.FLOAT, defaultValue: 10 },
  isActive:      { type: DataTypes.BOOLEAN, defaultValue: true },
  colorHex:      { type: DataTypes.STRING(10), defaultValue: '#2563eb' },
  icon:          { type: DataTypes.STRING(10), defaultValue: '' },
});

/* ──────────────────────────────── GIG ───────────────────────────────────── */
const Gig = sequelize.define('Gig', {
  id:             { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  orgId:          { type: DataTypes.INTEGER, allowNull: false },
  title:          { type: DataTypes.STRING(255), allowNull: false },
  description:    { type: DataTypes.TEXT, allowNull: false },
  categoryId:     { type: DataTypes.INTEGER, allowNull: false },
  startDate:      { type: DataTypes.DATEONLY, allowNull: false },
  endDate:        { type: DataTypes.DATEONLY, allowNull: false },
  estimatedHours: { type: DataTypes.FLOAT, allowNull: false },
  locationType:   { type: DataTypes.ENUM('in-person', 'remote'), defaultValue: 'in-person' },
  locationAddress:{ type: DataTypes.STRING(255) },
  requiredSkills: { type: DataTypes.JSON, defaultValue: [] },
  verifiedOnly:   { type: DataTypes.BOOLEAN, defaultValue: false },
  status:         { type: DataTypes.ENUM('open', 'closed', 'cancelled'), defaultValue: 'open' },
  applicantCount: { type: DataTypes.INTEGER, defaultValue: 0 },
});

/* ─────────────────────────── APPLICATION ────────────────────────────────── */
const Application = sequelize.define('Application', {
  id:                { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  gigId:             { type: DataTypes.INTEGER, allowNull: false },
  volunteerId:       { type: DataTypes.INTEGER, allowNull: false },
  personalStatement: { type: DataTypes.TEXT, allowNull: false },
  status:            { type: DataTypes.ENUM('pending', 'approved', 'rejected'), defaultValue: 'pending' },
  decisionReason:    { type: DataTypes.TEXT },
  decidedAt:         { type: DataTypes.DATE },
});

/* ──────────────────────────────── TASK ──────────────────────────────────── */
const VALID_TRANSITIONS = {
  accepted: ['inProgress'],
  inProgress: ['completed'],
  completed: ['approved', 'rejected'],
};

const Task = sequelize.define('Task', {
  id:              { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  applicationId:   { type: DataTypes.INTEGER, allowNull: false },
  gigId:           { type: DataTypes.INTEGER, allowNull: false },
  volunteerId:     { type: DataTypes.INTEGER, allowNull: false },
  orgId:           { type: DataTypes.INTEGER, allowNull: false },
  status:          { type: DataTypes.ENUM('accepted', 'inProgress', 'completed', 'approved', 'rejected'), defaultValue: 'accepted' },
  hoursLogged:     { type: DataTypes.FLOAT, defaultValue: 0 },
  submittedAt:     { type: DataTypes.DATE },
  verifiedAt:      { type: DataTypes.DATE },
  autoApprovedAt:  { type: DataTypes.DATE },
  rejectionReason: { type: DataTypes.TEXT },
  remindersSent:   { type: DataTypes.JSON, defaultValue: [] },
});

Task.prototype.canTransitionTo = function (next) {
  return (VALID_TRANSITIONS[this.status] || []).includes(next);
};

/* ─────────────────────────── HOUR RECORD ────────────────────────────────── */
const HourRecord = sequelize.define('HourRecord', {
  id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  volunteerId:  { type: DataTypes.INTEGER, allowNull: false },
  taskId:       { type: DataTypes.INTEGER, allowNull: false },
  gigId:        { type: DataTypes.INTEGER, allowNull: false },
  categoryId:   { type: DataTypes.INTEGER, allowNull: false },
  hours:        { type: DataTypes.FLOAT, allowNull: false },
  pointsAwarded:{ type: DataTypes.INTEGER, defaultValue: 0 },
  approvedBy:   { type: DataTypes.INTEGER },
  approvedAt:   { type: DataTypes.DATE, allowNull: false },
  autoApproved: { type: DataTypes.BOOLEAN, defaultValue: false },
});

/* ──────────────────────────────── REWARD ────────────────────────────────── */
const Reward = sequelize.define('Reward', {
  id:                    { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name:                  { type: DataTypes.STRING(255), allowNull: false },
  description:           { type: DataTypes.TEXT, allowNull: false },
  categoryId:            { type: DataTypes.INTEGER, allowNull: false },
  sponsorName:           { type: DataTypes.STRING(200) },
  sponsorId:             { type: DataTypes.INTEGER },
  pointsRequired:        { type: DataTypes.INTEGER, defaultValue: 0 },
  categoryHoursRequired: { type: DataTypes.FLOAT, defaultValue: 0 },
  type:                  { type: DataTypes.ENUM('discount', 'eventPass', 'perk', 'badge', 'certificate'), defaultValue: 'perk' },
  isActive:              { type: DataTypes.BOOLEAN, defaultValue: true },
  isRetired:             { type: DataTypes.BOOLEAN, defaultValue: false },
  quantity:              { type: DataTypes.INTEGER },
  imageUrl:              { type: DataTypes.STRING(255) },
});

/* ─────────────────────────── REDEMPTION ────────────────────────────────── */
const Redemption = sequelize.define('Redemption', {
  id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  volunteerId: { type: DataTypes.INTEGER, allowNull: false },
  rewardId:    { type: DataTypes.INTEGER, allowNull: false },
  pointsSpent: { type: DataTypes.INTEGER, allowNull: false },
  redeemedAt:  { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  status:      { type: DataTypes.ENUM('active', 'used', 'expired'), defaultValue: 'active' },
});

/* ─────────────────────────── NOTIFICATION ───────────────────────────────── */
const Notification = sequelize.define('Notification', {
  id:      { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId:  { type: DataTypes.INTEGER, allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
  type:    { type: DataTypes.ENUM('verification', 'application', 'task', 'points', 'reward', 'general'), defaultValue: 'general' },
  link:    { type: DataTypes.STRING(255) },
  isRead:  { type: DataTypes.BOOLEAN, defaultValue: false },
});

/* ─────────────────────────── AUDIT LOG ──────────────────────────────────── */
const AuditLog = sequelize.define('AuditLog', {
  id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  eventType:    { type: DataTypes.STRING(100), allowNull: false },
  actorId:      { type: DataTypes.INTEGER },
  actorRole:    { type: DataTypes.STRING(20), defaultValue: 'anonymous' },
  method:       { type: DataTypes.STRING(10), allowNull: false },
  route:        { type: DataTypes.STRING(255), allowNull: false },
  targetEntity: { type: DataTypes.STRING(100) },
  targetId:     { type: DataTypes.STRING(100) },
  statusCode:   { type: DataTypes.INTEGER },
  metadata:     { type: DataTypes.JSON, defaultValue: {} },
  timestamp:    { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { updatedAt: false });

/* ─────────────────────────── ASSOCIATIONS ───────────────────────────────── */
User.hasOne(VolunteerProfile, { foreignKey: 'userId', as: 'volunteerProfile' });
VolunteerProfile.belongsTo(User, { foreignKey: 'userId' });

User.hasOne(Organization, { foreignKey: 'userId', as: 'organization' });
Organization.belongsTo(User, { foreignKey: 'userId' });

User.hasOne(CsrPartner, { foreignKey: 'userId', as: 'csrPartner' });
CsrPartner.belongsTo(User, { foreignKey: 'userId' });

Organization.hasMany(Gig, { foreignKey: 'orgId' });
Gig.belongsTo(Organization, { foreignKey: 'orgId', as: 'org' });

Category.hasMany(Gig, { foreignKey: 'categoryId' });
Gig.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });

Gig.hasMany(Application, { foreignKey: 'gigId' });
Application.belongsTo(Gig, { foreignKey: 'gigId', as: 'gig' });

User.hasMany(Application, { foreignKey: 'volunteerId' });
Application.belongsTo(User, { foreignKey: 'volunteerId', as: 'volunteer' });

Application.hasOne(Task, { foreignKey: 'applicationId' });
Task.belongsTo(Application, { foreignKey: 'applicationId' });

Gig.hasMany(Task, { foreignKey: 'gigId' });
Task.belongsTo(Gig, { foreignKey: 'gigId', as: 'gig' });

User.hasMany(Task, { foreignKey: 'volunteerId' });
Task.belongsTo(User, { foreignKey: 'volunteerId', as: 'volunteer' });

Organization.hasMany(Task, { foreignKey: 'orgId' });
Task.belongsTo(Organization, { foreignKey: 'orgId', as: 'org' });

Category.hasMany(HourRecord, { foreignKey: 'categoryId' });
HourRecord.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });

Category.hasMany(Reward, { foreignKey: 'categoryId' });
Reward.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });

User.hasMany(Redemption, { foreignKey: 'volunteerId' });
Redemption.belongsTo(User, { foreignKey: 'volunteerId' });

Reward.hasMany(Redemption, { foreignKey: 'rewardId' });
Redemption.belongsTo(Reward, { foreignKey: 'rewardId', as: 'reward' });

User.hasMany(Notification, { foreignKey: 'userId' });
Notification.belongsTo(User, { foreignKey: 'userId' });

VolunteerCategoryHours.belongsTo(User, { foreignKey: 'volunteerId' });
VolunteerCategoryHours.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });

module.exports = {
  sequelize,
  User,
  VolunteerProfile,
  VolunteerCategoryHours,
  Organization,
  CsrPartner,
  CsrEmployee,
  Category,
  Gig,
  Application,
  Task,
  HourRecord,
  Reward,
  Redemption,
  Notification,
  AuditLog,
};
