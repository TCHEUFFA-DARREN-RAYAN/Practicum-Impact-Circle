const { DataTypes, Sequelize: Sq } = require('sequelize');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { sequelize } = require('../config/db');

/* ───────────────────────────────── USER ──────────────────────────────────── */
const User = sequelize.define('User', {
  id:                 { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  email:              { type: DataTypes.STRING(191), allowNull: false, unique: true },
  passwordHash:       { type: DataTypes.STRING(255), allowNull: false },
  role:               { type: DataTypes.ENUM('volunteer', 'org', 'admin', 'csr'), allowNull: false },
  verificationStatus: { type: DataTypes.ENUM('pending', 'verified', 'rejected'), defaultValue: 'pending' },
  rejectionReason:    { type: DataTypes.TEXT, allowNull: true },
  isBlocked:          { type: DataTypes.BOOLEAN, defaultValue: false },
  /* Password reset — columns must exist in MySQL; run doc/mysql-add-password-reset.sql if missing */
  resetPasswordToken:   { type: DataTypes.STRING(255), allowNull: true },
  resetPasswordExpires: { type: DataTypes.DATE, allowNull: true },
  avatarUrl:            { type: DataTypes.STRING(255), allowNull: true },
  lastLoginAt:          { type: DataTypes.DATE, allowNull: true },
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
  resumeUrl:                    { type: DataTypes.STRING(255), allowNull: true },
  bio:                          { type: DataTypes.TEXT, allowNull: true },
  hasDrivingLicense:            { type: DataTypes.BOOLEAN, defaultValue: false },
  province:                     { type: DataTypes.STRING(100), allowNull: true },
  city:                         { type: DataTypes.STRING(100), allowNull: true },
  gender:                       { type: DataTypes.STRING(30), allowNull: true },
  country:                      { type: DataTypes.STRING(100), allowNull: true },
  backgroundCheckStatus:        { type: DataTypes.ENUM('not_submitted', 'pending', 'approved', 'expired'), defaultValue: 'not_submitted' },
  backgroundCheckExpiry:        { type: DataTypes.DATEONLY, allowNull: true },
  backgroundCheckReminded:      { type: DataTypes.DATE, allowNull: true },
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
  province:              { type: DataTypes.STRING(100), allowNull: true },
  city:                  { type: DataTypes.STRING(100), allowNull: true },
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
  id:               { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  orgId:            { type: DataTypes.INTEGER, allowNull: false },
  title:            { type: DataTypes.STRING(255), allowNull: false },
  description:      { type: DataTypes.TEXT, allowNull: false },
  categoryId:       { type: DataTypes.INTEGER, allowNull: false },
  startDate:        { type: DataTypes.DATEONLY, allowNull: false },
  endDate:          { type: DataTypes.DATEONLY, allowNull: false },
  estimatedHours:   { type: DataTypes.FLOAT, allowNull: false },
  locationType:     { type: DataTypes.ENUM('in-person', 'remote'), defaultValue: 'in-person' },
  locationAddress:  { type: DataTypes.STRING(255) },
  requiredSkills:   { type: DataTypes.JSON, defaultValue: [] },
  verifiedOnly:     { type: DataTypes.BOOLEAN, defaultValue: false },
  status:           { type: DataTypes.ENUM('open', 'closed', 'cancelled'), defaultValue: 'open' },
  applicantCount:   { type: DataTypes.INTEGER, defaultValue: 0 },
  /* Time of day */
  timeOfDay:        { type: DataTypes.ENUM('morning', 'afternoon', 'evening', 'flexible'), allowNull: true },
  startTime:        { type: DataTypes.STRING(10), allowNull: true },
  endTime:          { type: DataTypes.STRING(10), allowNull: true },
  /* Recurrence */
  isRecurring:      { type: DataTypes.BOOLEAN, defaultValue: false },
  recurrenceType:   { type: DataTypes.ENUM('daily', 'weekly', 'monthly'), allowNull: true },
  recurrenceDays:   { type: DataTypes.JSON, defaultValue: [] },
  hoursPerOccurrence: { type: DataTypes.FLOAT, allowNull: true },
  /* Capacity & engagement */
  maxVolunteers:    { type: DataTypes.INTEGER, allowNull: true },
  viewCount:        { type: DataTypes.INTEGER, defaultValue: 0 },
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
  accepted: ['inProgress', 'approved', 'rejected'],
  inProgress: ['completed', 'approved', 'rejected'],
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
  orgRating:       { type: DataTypes.INTEGER, allowNull: true },
  orgFeedback:     { type: DataTypes.TEXT, allowNull: true },
  attendedAt:      { type: DataTypes.DATE, allowNull: true },
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
  type:    { type: DataTypes.ENUM('verification', 'application', 'task', 'points', 'reward', 'general', 'attendance', 'reminder'), defaultValue: 'general' },
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

/* ─────────────────────────── CONVERSATION / CHAT ───────────────────────── */
const Conversation = sequelize.define('Conversation', {
  id:       { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user1Id:  { type: DataTypes.INTEGER, allowNull: false },
  user2Id:  { type: DataTypes.INTEGER, allowNull: false },
}, { timestamps: true });

const ChatMessage = sequelize.define('ChatMessage', {
  id:             { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  conversationId: { type: DataTypes.INTEGER, allowNull: false },
  senderId:       { type: DataTypes.INTEGER, allowNull: false },
  body:           { type: DataTypes.TEXT, allowNull: false },
  isRead:         { type: DataTypes.BOOLEAN, defaultValue: false },
}, { timestamps: true, updatedAt: false });

/* ─────────────────────────── ANNOUNCEMENT ───────────────────────────────── */
const Announcement = sequelize.define('Announcement', {
  id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title:       { type: DataTypes.STRING(255), allowNull: false },
  body:        { type: DataTypes.TEXT, allowNull: false },
  targetGroup: { type: DataTypes.ENUM('all', 'volunteers', 'orgs', 'inactive'), allowNull: false },
  sentBy:      { type: DataTypes.INTEGER, allowNull: true },
  recipientCount: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { updatedAt: false });

/* ─────────────────────────── ATTENDANCE (QR Check-in/out) ────────────────── */
const Attendance = sequelize.define('Attendance', {
  id:            { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  gigId:        { type: DataTypes.INTEGER, allowNull: false },
  volunteerId:  { type: DataTypes.INTEGER, allowNull: false },
  checkInAt:    { type: DataTypes.DATE, allowNull: false },
  checkOutAt:   { type: DataTypes.DATE, allowNull: true },
  hoursWorked:  { type: DataTypes.FLOAT, allowNull: true },
  autoCheckedOut: { type: DataTypes.BOOLEAN, defaultValue: false },
});

/* ─────────────────────────── GIG QR CODE ─────────────────────────────────── */
const GigQrCode = sequelize.define('GigQrCode', {
  id:       { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  gigId:    { type: DataTypes.INTEGER, allowNull: false, unique: true },
  token:    { type: DataTypes.STRING(64), allowNull: false, unique: true, defaultValue: () => uuidv4() },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
});

/* ─────────────────────────── ORG ROLE (Role-based access) ────────────────── */
const OrgRole = sequelize.define('OrgRole', {
  id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  orgId:       { type: DataTypes.INTEGER, allowNull: false },
  name:        { type: DataTypes.STRING(100), allowNull: false },
  permissions: { type: DataTypes.JSON, defaultValue: [] },
});

/* ─────────────────────────── ORG MEMBER ──────────────────────────────────── */
const OrgMember = sequelize.define('OrgMember', {
  id:        { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  orgId:     { type: DataTypes.INTEGER, allowNull: false },
  userId:    { type: DataTypes.INTEGER, allowNull: false },
  roleId:    { type: DataTypes.INTEGER, allowNull: true },
  inviteEmail: { type: DataTypes.STRING(191), allowNull: true },
  status:    { type: DataTypes.ENUM('active', 'invited', 'removed'), defaultValue: 'invited' },
});

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

Conversation.hasMany(ChatMessage, { foreignKey: 'conversationId', as: 'messages' });
ChatMessage.belongsTo(Conversation, { foreignKey: 'conversationId' });

User.hasMany(ChatMessage, { foreignKey: 'senderId', as: 'sentMessages' });
ChatMessage.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

/* Attendance */
Gig.hasMany(Attendance, { foreignKey: 'gigId', as: 'attendances' });
Attendance.belongsTo(Gig, { foreignKey: 'gigId', as: 'gig' });
User.hasMany(Attendance, { foreignKey: 'volunteerId', as: 'attendances' });
Attendance.belongsTo(User, { foreignKey: 'volunteerId', as: 'volunteer' });

/* GigQrCode */
Gig.hasOne(GigQrCode, { foreignKey: 'gigId', as: 'qrCode' });
GigQrCode.belongsTo(Gig, { foreignKey: 'gigId' });

/* OrgRole & OrgMember */
Organization.hasMany(OrgRole, { foreignKey: 'orgId', as: 'roles' });
OrgRole.belongsTo(Organization, { foreignKey: 'orgId' });
Organization.hasMany(OrgMember, { foreignKey: 'orgId', as: 'members' });
OrgMember.belongsTo(Organization, { foreignKey: 'orgId' });
OrgMember.belongsTo(OrgRole, { foreignKey: 'roleId', as: 'role' });
OrgMember.belongsTo(User, { foreignKey: 'userId', as: 'user' });

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
  Conversation,
  ChatMessage,
  Announcement,
  Attendance,
  GigQrCode,
  OrgRole,
  OrgMember,
};
