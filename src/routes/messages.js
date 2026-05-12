const router = require('express').Router();
const { Op } = require('sequelize');
const { requireAuth } = require('../middleware/auth');
const { Conversation, ChatMessage, User, VolunteerProfile, Organization } = require('../models/index');

function withPartnerInfo(user) {
  const base = { id: user.id, email: user.email, role: user.role, avatarUrl: user.avatarUrl };
  if (user.volunteerProfile) {
    base.name = [user.volunteerProfile.firstName, user.volunteerProfile.lastName].filter(Boolean).join(' ') || user.email;
  } else if (user.organization) {
    base.name = user.organization.orgName || user.email;
    base.logoUrl = user.organization.logoUrl;
  } else {
    base.name = user.email;
  }
  return base;
}

/* GET /api/messages/conversations — list all my conversations */
router.get('/conversations', requireAuth, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const convs = await Conversation.findAll({
      where: { [Op.or]: [{ user1Id: uid }, { user2Id: uid }] },
      order: [['updatedAt', 'DESC']],
    });

    const partnerIds = convs.map(c => (c.user1Id === uid ? c.user2Id : c.user1Id));
    const partners = await User.findAll({
      where: { id: { [Op.in]: partnerIds } },
      attributes: ['id', 'email', 'role', 'avatarUrl'],
      include: [
        { model: VolunteerProfile, as: 'volunteerProfile', attributes: ['firstName', 'lastName'], required: false },
        { model: Organization, as: 'organization', attributes: ['orgName', 'logoUrl'], required: false },
      ],
    });
    const pMap = {};
    partners.forEach(p => { pMap[p.id] = withPartnerInfo(p); });

    const result = await Promise.all(convs.map(async c => {
      const partnerId = c.user1Id === uid ? c.user2Id : c.user1Id;
      const last = await ChatMessage.findOne({
        where: { conversationId: c.id },
        order: [['createdAt', 'DESC']],
      });
      const unread = await ChatMessage.count({
        where: { conversationId: c.id, senderId: { [Op.ne]: uid }, isRead: false },
      });
      return {
        id: c.id,
        partner: pMap[partnerId] || { id: partnerId, name: 'Unknown', email: '' },
        lastMessage: last ? { body: last.body, createdAt: last.createdAt, mine: last.senderId === uid } : null,
        unread,
        updatedAt: c.updatedAt,
      };
    }));

    res.json({ success: true, data: { conversations: result } });
  } catch (err) { next(err); }
});

/* POST /api/messages/conversations — start or get existing conversation */
router.post('/conversations', requireAuth, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const { partnerId } = req.body;
    if (!partnerId || Number(partnerId) === uid)
      return res.status(400).json({ success: false, message: 'Invalid partner.' });

    const partner = await User.findByPk(partnerId);
    if (!partner) return res.status(404).json({ success: false, message: 'User not found.' });

    let conv = await Conversation.findOne({
      where: {
        [Op.or]: [
          { user1Id: uid, user2Id: partnerId },
          { user1Id: partnerId, user2Id: uid },
        ],
      },
    });
    if (!conv) conv = await Conversation.create({ user1Id: uid, user2Id: partnerId });
    res.json({ success: true, data: { conversationId: conv.id } });
  } catch (err) { next(err); }
});

/* GET /api/messages/conversations/:id — get messages */
router.get('/conversations/:id', requireAuth, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const conv = await Conversation.findByPk(req.params.id);
    if (!conv) return res.status(404).json({ success: false, message: 'Conversation not found.' });
    if (conv.user1Id !== uid && conv.user2Id !== uid)
      return res.status(403).json({ success: false, message: 'Access denied.' });

    const partnerId = conv.user1Id === uid ? conv.user2Id : conv.user1Id;
    const partner = await User.findByPk(partnerId, {
      attributes: ['id', 'email', 'role', 'avatarUrl'],
      include: [
        { model: VolunteerProfile, as: 'volunteerProfile', attributes: ['firstName', 'lastName'], required: false },
        { model: Organization, as: 'organization', attributes: ['orgName', 'logoUrl'], required: false },
      ],
    });

    const messages = await ChatMessage.findAll({
      where: { conversationId: conv.id },
      order: [['createdAt', 'ASC']],
    });

    await ChatMessage.update(
      { isRead: true },
      { where: { conversationId: conv.id, senderId: { [Op.ne]: uid }, isRead: false } }
    );

    res.json({
      success: true,
      data: {
        conversationId: conv.id,
        partner: withPartnerInfo(partner),
        messages: messages.map(m => ({
          id: m.id,
          body: m.body,
          mine: m.senderId === uid,
          createdAt: m.createdAt,
        })),
      },
    });
  } catch (err) { next(err); }
});

/* POST /api/messages/conversations/:id/send — send a message */
router.post('/conversations/:id/send', requireAuth, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const { body } = req.body;
    if (!body || !body.trim()) return res.status(400).json({ success: false, message: 'Message cannot be empty.' });

    const conv = await Conversation.findByPk(req.params.id);
    if (!conv) return res.status(404).json({ success: false, message: 'Conversation not found.' });
    if (conv.user1Id !== uid && conv.user2Id !== uid)
      return res.status(403).json({ success: false, message: 'Access denied.' });

    const msg = await ChatMessage.create({ conversationId: conv.id, senderId: uid, body: body.trim() });
    await conv.update({ updatedAt: new Date() });

    res.json({ success: true, data: { message: { id: msg.id, body: msg.body, mine: true, createdAt: msg.createdAt } } });
  } catch (err) { next(err); }
});

/* GET /api/messages/users — search users to start a conversation */
router.get('/users', requireAuth, async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    const role = (req.query.role || '').trim();
    const uid = req.user.id;
    const where = { id: { [Op.ne]: uid } };
    if (q) where.email = { [Op.like]: `%${q}%` };
    if (role) where.role = role;
    const users = await User.findAll({
      where,
      attributes: ['id', 'email', 'role', 'avatarUrl'],
      include: [
        { model: VolunteerProfile, as: 'volunteerProfile', attributes: ['firstName', 'lastName'], required: false },
        { model: Organization, as: 'organization', attributes: ['orgName'], required: false },
      ],
      limit: 15,
    });
    res.json({ success: true, data: { users: users.map(withPartnerInfo) } });
  } catch (err) { next(err); }
});

module.exports = router;
