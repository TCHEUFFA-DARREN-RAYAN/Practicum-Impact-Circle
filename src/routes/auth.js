const router = require('express').Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { Op } = require('sequelize');
const { body } = require('express-validator');
const { User, VolunteerProfile, Organization, CsrPartner } = require('../models/index');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { sendEmail, templates, publicAppUrl } = require('../services/email');

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../src/uploads', String(req.user.id));
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${Date.now()}${ext}`);
  },
});
const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    if (!allowed.includes(path.extname(file.originalname).toLowerCase()))
      return cb(new Error('Only image files are allowed (JPG, PNG, GIF, WEBP).'));
    cb(null, true);
  },
});

const issueToken = (user) =>
  jwt.sign({ id: user.id, role: user.role, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

router.post('/register', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required.'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter.')
    .matches(/[0-9]/).withMessage('Password must contain a number.'),
  body('role').isIn(['volunteer', 'org', 'csr']).withMessage('Invalid role.'),
], validate, async (req, res, next) => {
  try {
    const { email, password, role, orgName, companyName,
      missionStatement, contactName, contactEmail, contactPhone, address, website, categories,
      province, city } = req.body;

    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(409).json({ success: false, message: 'An account with that email already exists. Please sign in or use a different email.' });

    const user = await User.create({ email, passwordHash: password, role });

    if (role === 'volunteer') {
      await VolunteerProfile.create({ userId: user.id });
    } else if (role === 'org') {
      await Organization.create({
        userId: user.id,
        orgName: orgName || 'My Organization',
        missionStatement: missionStatement || null,
        contactName: contactName || null,
        contactEmail: contactEmail || email,
        contactPhone: contactPhone || null,
        address: address || null,
        website: website || null,
        categories: categories || [],
        province: province || null,
        city: city || null,
      });
    } else if (role === 'csr') {
      await CsrPartner.create({ userId: user.id, companyName: companyName || 'My Company' });
    }

    const token = issueToken(user);
    res.status(201).json({ success: true, message: 'Account created.', data: { token, user: user.toSafeObject() } });
  } catch (err) {
    next(err);
  }
});

router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required.'),
  body('password').notEmpty().withMessage('Password is required.'),
], validate, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }
    await user.update({ lastLoginAt: new Date() });
    const token = issueToken(user);
    res.json({ success: true, message: 'Login successful.', data: { token, user: user.toSafeObject() } });
  } catch (err) {
    next(err);
  }
});

router.get('/check-email', async (req, res, next) => {
  try {
    const email = (req.query.email || '').toLowerCase().trim();
    if (!email) return res.json({ success: true, data: { exists: false } });
    const user = await User.findOne({ where: { email } });
    res.json({ success: true, data: { exists: !!user } });
  } catch (err) { next(err); }
});

/** True if token matches a non-expired reset row (for reset-password page UX) */
router.get('/password-reset-status', async (req, res, next) => {
  try {
    const token = (req.query.token || '').trim();
    if (!token) return res.json({ success: true, data: { valid: false } });
    const user = await User.findOne({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: { [Op.gt]: new Date() },
      },
    });
    res.json({ success: true, data: { valid: !!user } });
  } catch (err) { next(err); }
});

router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required.'),
], validate, async (req, res, next) => {
  try {
    const email = req.body.email.toLowerCase().trim();
    const generic = {
      success: true,
      message: 'If an account exists for that email, a reset link has been sent.',
    };

    const user = await User.findOne({ where: { email } });
    if (!user) return res.json(generic);

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000);
    await user.update({ resetPasswordToken: token, resetPasswordExpires: expires });

    const resetUrl = `${publicAppUrl()}/reset-password?token=${encodeURIComponent(token)}`;
    const { subject, html } = templates.passwordReset(resetUrl);

    try {
      await sendEmail(user.email, subject, html);
    } catch (mailErr) {
      console.error('[AUTH] forgot-password email failed:', mailErr.message);
      await user.update({ resetPasswordToken: null, resetPasswordExpires: null });
      if (process.env.NODE_ENV !== 'production') {
        return res.status(503).json({
          success: false,
          message: 'Email could not be sent. For local testing set EMAIL_USE_ETHEREAL=true in .env, restart the server, and try again.',
          details: mailErr.message,
        });
      }
    }

    return res.json(generic);
  } catch (err) { next(err); }
});

router.post('/reset-password', [
  body('token').notEmpty().withMessage('Reset token is required.'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter.')
    .matches(/[0-9]/).withMessage('Password must contain a number.'),
], validate, async (req, res, next) => {
  try {
    const { token, password } = req.body;
    const user = await User.findOne({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: { [Op.gt]: new Date() },
      },
    });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'This reset link is invalid or has expired. Please request a new password reset.',
      });
    }

    await user.update({
      passwordHash: password,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    });

    res.json({ success: true, message: 'Your password has been updated. You can sign in now.' });
  } catch (err) { next(err); }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, { attributes: { exclude: ['passwordHash'] } });
    res.json({ success: true, data: { user } });
  } catch (err) { next(err); }
});

router.post('/change-password', requireAuth, [
  body('currentPassword').notEmpty().withMessage('Current password is required.'),
  body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter.')
    .matches(/[0-9]/).withMessage('Password must contain a number.'),
], validate, async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    const valid = await user.comparePassword(req.body.currentPassword);
    if (!valid) return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    await user.update({ passwordHash: req.body.newPassword });
    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) { next(err); }
});

router.put('/update-email', requireAuth, [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required.'),
  body('password').notEmpty().withMessage('Password is required to confirm this change.'),
], validate, async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    const valid = await user.comparePassword(req.body.password);
    if (!valid) return res.status(400).json({ success: false, message: 'Password is incorrect.' });
    const existing = await User.findOne({ where: { email: req.body.email } });
    if (existing && existing.id !== user.id)
      return res.status(409).json({ success: false, message: 'That email is already in use.' });
    await user.update({ email: req.body.email });
    await user.reload();
    const token = issueToken(user);
    res.json({ success: true, message: 'Email updated.', data: { token, user: user.toSafeObject() } });
  } catch (err) { next(err); }
});

router.post('/avatar', requireAuth, avatarUpload.single('avatar'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });
    await User.update({ avatarUrl: req.file.filename }, { where: { id: req.user.id } });
    const user = await User.findByPk(req.user.id, { attributes: { exclude: ['passwordHash'] } });
    res.json({ success: true, message: 'Avatar updated.', data: { avatarUrl: req.file.filename, user: user.toSafeObject() } });
  } catch (err) { next(err); }
});

module.exports = router;
