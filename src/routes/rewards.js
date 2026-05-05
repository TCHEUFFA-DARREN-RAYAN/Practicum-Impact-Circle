const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { Reward, Redemption, VolunteerProfile, User, Category } = require('../models/index');
const { checkEligibility } = require('../services/points');
const { createNotification } = require('../services/notifications');
const { sendEmail, templates } = require('../services/email');

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const rewards = await Reward.findAll({
      where: { isActive: true, isRetired: false },
      include: [{ model: Category, as: 'category', attributes: ['name', 'colorHex', 'icon'] }],
    });

    if (req.user.role === 'volunteer') {
      const withEligibility = await Promise.all(
        rewards.map(async (r) => {
          const { eligible, reason } = await checkEligibility(req.user.id, r.id);
          return { ...r.toJSON(), eligible, ineligibilityReason: reason };
        })
      );
      return res.json({ success: true, data: { rewards: withEligibility } });
    }
    res.json({ success: true, data: { rewards } });
  } catch (err) { next(err); }
});

router.post('/:id/redeem', requireAuth, requireRole('volunteer'), async (req, res, next) => {
  try {
    const { eligible, reason } = await checkEligibility(req.user.id, req.params.id);
    if (!eligible) return res.status(400).json({ success: false, message: `Not eligible: ${reason}` });

    const reward = await Reward.findByPk(req.params.id);
    await VolunteerProfile.decrement('totalPoints', { by: reward.pointsRequired, where: { userId: req.user.id } });

    const redemption = await Redemption.create({ volunteerId: req.user.id, rewardId: reward.id, pointsSpent: reward.pointsRequired });

    const user = await User.findByPk(req.user.id);
    if (user) {
      const tpl = templates.rewardRedeemed(user.email.split('@')[0], reward.name);
      await sendEmail(user.email, tpl.subject, tpl.html);
    }
    await createNotification(req.user.id, `You redeemed "${reward.name}" for ${reward.pointsRequired} points!`, 'reward', '/rewards');
    res.json({ success: true, message: 'Reward redeemed!', data: { redemption, reward } });
  } catch (err) { next(err); }
});

router.get('/my-redemptions', requireAuth, requireRole('volunteer'), async (req, res, next) => {
  try {
    const redemptions = await Redemption.findAll({
      where: { volunteerId: req.user.id },
      include: [{ model: Reward, as: 'reward', attributes: ['name', 'description', 'type', 'sponsorName'] }],
      order: [['redeemedAt', 'DESC']],
    });
    res.json({ success: true, data: { redemptions } });
  } catch (err) { next(err); }
});

module.exports = router;
