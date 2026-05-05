const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { Notification } = require('../models/index');

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const notifications = await Notification.findAll({ where: { userId: req.user.id }, order: [['createdAt', 'DESC']], limit: 50 });
    const unreadCount = await Notification.count({ where: { userId: req.user.id, isRead: false } });
    res.json({ success: true, data: { notifications, unreadCount } });
  } catch (err) { next(err); }
});

router.patch('/read', requireAuth, async (req, res, next) => {
  try {
    const where = { userId: req.user.id };
    if (req.body.id) where.id = req.body.id;
    await Notification.update({ isRead: true }, { where });
    res.json({ success: true, message: 'Notifications marked as read.' });
  } catch (err) { next(err); }
});

module.exports = router;
