const router = require('express').Router();
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const { User, VolunteerProfile, Organization, CsrPartner } = require('../models/index');
const validate = require('../middleware/validate');

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
    const { email, password, role, orgName, companyName } = req.body;

    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(409).json({ success: false, message: 'An account with that email already exists. Please sign in or use a different email.' });

    const user = await User.create({ email, passwordHash: password, role });

    if (role === 'volunteer') {
      await VolunteerProfile.create({ userId: user.id });
    } else if (role === 'org') {
      await Organization.create({ userId: user.id, orgName: orgName || 'My Organization' });
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

router.get('/me', require('../middleware/auth').requireAuth, async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, { attributes: { exclude: ['passwordHash'] } });
    res.json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
