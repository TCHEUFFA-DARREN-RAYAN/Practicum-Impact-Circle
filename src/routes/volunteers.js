const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Op } = require('sequelize');
const { requireAuth, requireRole } = require('../middleware/auth');
const { User, VolunteerProfile, VolunteerCategoryHours, Category, Application, Task, Reward, Organization } = require('../models/index');
const { checkEligibility } = require('../services/points');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../src/uploads', String(req.user.id));
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png'];
    if (!allowed.includes(path.extname(file.originalname).toLowerCase()))
      return cb(new Error('Only PDF, JPG, and PNG files are allowed.'));
    cb(null, true);
  },
});

router.post('/register/step/:step', requireAuth, requireRole('volunteer'), async (req, res, next) => {
  try {
    const step = parseInt(req.params.step);
    const profile = await VolunteerProfile.findOne({ where: { userId: req.user.id } });
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found.' });

    if (step === 1) {
      await profile.update({
        firstName: req.body.firstName, lastName: req.body.lastName,
        phone: req.body.phone, dateOfBirth: req.body.dateOfBirth,
        address: req.body.address,
        province: req.body.province || null,
        city: req.body.city || null,
        hasDrivingLicense: !!req.body.hasDrivingLicense,
        registrationStep: Math.max(profile.registrationStep, 2),
      });
    } else if (step === 2) {
      await profile.update({
        skills: req.body.skills || [], interests: req.body.interests || [],
        languages: req.body.languages || [],
        weeklyAvailabilityHours: req.body.weeklyAvailabilityHours,
        weeklyAvailabilityDays: req.body.weeklyAvailabilityDays || [],
        registrationStep: Math.max(profile.registrationStep, 3),
      });
    } else if (step === 3) {
      await profile.update({
        previousVolunteeringHistory: req.body.previousVolunteeringHistory,
        preferredCategories: req.body.preferredCategories || [],
        references: req.body.references || [],
        registrationStep: Math.max(profile.registrationStep, 4),
      });
    } else if (step === 5) {
      if (!req.body.consent)
        return res.status(400).json({ success: false, message: 'You must accept the terms and conditions.' });
      await profile.update({ consentGiven: true, registrationStep: Math.max(profile.registrationStep, 6) });
      await User.update({ verificationStatus: 'pending' }, { where: { id: req.user.id } });
    }

    await profile.reload();
    res.json({ success: true, message: `Step ${step} saved.`, data: { profile } });
  } catch (err) { next(err); }
});

router.post('/register/step/4/documents', requireAuth, requireRole('volunteer'),
  upload.fields([
    { name: 'govId', maxCount: 1 },
    { name: 'backgroundCheck', maxCount: 1 },
    { name: 'additionalRefs', maxCount: 3 },
  ]),
  async (req, res, next) => {
    try {
      const profile = await VolunteerProfile.findOne({ where: { userId: req.user.id } });
      if (!profile) return res.status(404).json({ success: false, message: 'Profile not found.' });

      const updates = { registrationStep: Math.max(profile.registrationStep, 5) };
      if (req.files?.govId) updates.govId = req.files.govId[0].filename;
      if (req.files?.backgroundCheck) updates.backgroundCheck = req.files.backgroundCheck[0].filename;
      if (req.files?.additionalRefs) updates.additionalRefs = req.files.additionalRefs.map(f => f.filename);

      await profile.update(updates);
      res.json({ success: true, message: 'Documents uploaded.' });
    } catch (err) { next(err); }
  }
);

router.get('/me', requireAuth, requireRole('volunteer'), async (req, res, next) => {
  try {
    const [user, profile] = await Promise.all([
      User.findByPk(req.user.id, { attributes: { exclude: ['passwordHash'] } }),
      VolunteerProfile.findOne({ where: { userId: req.user.id } }),
    ]);
    res.json({ success: true, data: { user, profile } });
  } catch (err) { next(err); }
});

router.put('/me', requireAuth, requireRole('volunteer'), async (req, res, next) => {
  try {
    const allowed = ['firstName', 'lastName', 'phone', 'address', 'skills', 'interests',
      'languages', 'weeklyAvailabilityHours', 'weeklyAvailabilityDays',
      'previousVolunteeringHistory', 'preferredCategories', 'references', 'bio',
      'hasDrivingLicense', 'province', 'city'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    await VolunteerProfile.update(updates, { where: { userId: req.user.id } });
    const updated = await VolunteerProfile.findOne({ where: { userId: req.user.id } });
    res.json({ success: true, message: 'Profile updated.', data: { profile: updated } });
  } catch (err) { next(err); }
});

const resumeUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() !== '.pdf')
      return cb(new Error('Only PDF files are allowed for resumes.'));
    cb(null, true);
  },
});

router.post('/me/resume', requireAuth, requireRole('volunteer'), resumeUpload.single('resume'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });
    const profile = await VolunteerProfile.findOne({ where: { userId: req.user.id } });
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found.' });
    await profile.update({ resumeUrl: req.file.filename });
    res.json({ success: true, message: 'Resume uploaded.', data: { resumeUrl: req.file.filename } });
  } catch (err) { next(err); }
});

router.post('/me/documents', requireAuth, requireRole('volunteer'),
  upload.fields([
    { name: 'govId', maxCount: 1 },
    { name: 'backgroundCheck', maxCount: 1 },
  ]),
  async (req, res, next) => {
    try {
      const profile = await VolunteerProfile.findOne({ where: { userId: req.user.id } });
      if (!profile) return res.status(404).json({ success: false, message: 'Profile not found.' });

      const updates = {};
      if (req.files?.govId) updates.govId = req.files.govId[0].filename;
      if (req.files?.backgroundCheck) updates.backgroundCheck = req.files.backgroundCheck[0].filename;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ success: false, message: 'No files provided.' });
      }

      await profile.update(updates);
      await User.update({ verificationStatus: 'pending' }, { where: { id: req.user.id } });
      res.json({ success: true, message: 'Documents uploaded. Your verification is now under review.' });
    } catch (err) { next(err); }
  }
);

router.get('/me/dashboard', requireAuth, requireRole('volunteer'), async (req, res, next) => {
  try {
    const profile = await VolunteerProfile.findOne({ where: { userId: req.user.id } });
    const catHoursRows = await VolunteerCategoryHours.findAll({
      where: { volunteerId: req.user.id },
      include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'colorHex', 'icon'] }],
    });

    const categoryHours = {};
    catHoursRows.forEach(r => { categoryHours[r.category?.name || r.categoryId] = r.hours; });

    const applications = await Application.findAll({
      where: { volunteerId: req.user.id },
      include: [{
        model: require('../models/index').Gig, as: 'gig',
        attributes: ['id', 'title', 'estimatedHours', 'startDate', 'endDate',
          'locationType', 'locationAddress', 'timeOfDay', 'startTime', 'endTime',
          'isRecurring', 'recurrenceType', 'recurrenceDays'],
        include: [
          { model: Organization, as: 'org', attributes: ['orgName'] },
          { model: Category, as: 'category', attributes: ['id', 'name', 'colorHex'] },
        ],
      }],
      order: [['createdAt', 'DESC']],
    });

    const tasks = await Task.findAll({
      where: { volunteerId: req.user.id },
      include: [{
        model: require('../models/index').Gig, as: 'gig',
        attributes: ['id', 'title', 'estimatedHours', 'hoursPerOccurrence', 'startDate', 'endDate',
          'locationType', 'locationAddress', 'timeOfDay', 'startTime', 'endTime',
          'isRecurring', 'recurrenceType', 'recurrenceDays'],
        include: [
          { model: Organization, as: 'org', attributes: ['orgName'] },
          { model: Category, as: 'category', attributes: ['id', 'name', 'colorHex'] },
        ],
      }],
      order: [['createdAt', 'DESC']],
    });

    const allRewards = await Reward.findAll({ where: { isActive: true, isRetired: false } });
    const eligibleRewards = [];
    for (const reward of allRewards) {
      const { eligible } = await checkEligibility(req.user.id, reward.id);
      if (eligible) eligibleRewards.push(reward.toJSON());
    }

    res.json({
      success: true,
      data: {
        profile, applications, tasks, eligibleRewards, categoryHours,
        stats: {
          totalVerifiedHours: profile?.totalVerifiedHours || 0,
          totalPoints: profile?.totalPoints || 0,
          categoryHours,
          gigCount: applications.length,
          approvedCount: tasks.filter(t => t.status === 'approved').length,
        },
      },
    });
  } catch (err) { next(err); }
});

module.exports = router;
