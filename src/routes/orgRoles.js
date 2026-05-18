const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { Organization, OrgRole, OrgMember, User } = require('../models/index');

/**
 * GET /api/org-roles/roles
 * List all roles for the org
 */
router.get('/roles', requireAuth, requireRole('org'), async (req, res, next) => {
  try {
    const org = await Organization.findOne({ where: { userId: req.user.id } });
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found.' });

    const roles = await OrgRole.findAll({ where: { orgId: org.id }, order: [['createdAt', 'ASC']] });
    res.json({ success: true, data: { roles } });
  } catch (err) { next(err); }
});

/**
 * POST /api/org-roles/roles
 * Create a new role
 */
router.post('/roles', requireAuth, requireRole('org'), async (req, res, next) => {
  try {
    const org = await Organization.findOne({ where: { userId: req.user.id } });
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found.' });

    const { name, permissions } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Role name is required.' });

    const validPermissions = [
      'dashboard', 'gigs', 'applications', 'volunteers', 'attendance',
      'analytics', 'announcements', 'settings', 'schedule', 'roles',
    ];
    const perms = (permissions || []).filter(p => validPermissions.includes(p));

    const role = await OrgRole.create({ orgId: org.id, name, permissions: perms });
    res.status(201).json({ success: true, message: 'Role created.', data: { role } });
  } catch (err) { next(err); }
});

/**
 * PUT /api/org-roles/roles/:id
 * Update a role
 */
router.put('/roles/:id', requireAuth, requireRole('org'), async (req, res, next) => {
  try {
    const org = await Organization.findOne({ where: { userId: req.user.id } });
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found.' });

    const role = await OrgRole.findOne({ where: { id: req.params.id, orgId: org.id } });
    if (!role) return res.status(404).json({ success: false, message: 'Role not found.' });

    const { name, permissions } = req.body;
    if (name) role.name = name;
    if (permissions) role.permissions = permissions;
    await role.save();

    res.json({ success: true, message: 'Role updated.', data: { role } });
  } catch (err) { next(err); }
});

/**
 * DELETE /api/org-roles/roles/:id
 * Delete a role
 */
router.delete('/roles/:id', requireAuth, requireRole('org'), async (req, res, next) => {
  try {
    const org = await Organization.findOne({ where: { userId: req.user.id } });
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found.' });

    const role = await OrgRole.findOne({ where: { id: req.params.id, orgId: org.id } });
    if (!role) return res.status(404).json({ success: false, message: 'Role not found.' });

    await OrgMember.update({ roleId: null }, { where: { roleId: role.id } });
    await role.destroy();

    res.json({ success: true, message: 'Role deleted.' });
  } catch (err) { next(err); }
});

/**
 * GET /api/org-roles/members
 * List all members of the org
 */
router.get('/members', requireAuth, requireRole('org'), async (req, res, next) => {
  try {
    const org = await Organization.findOne({ where: { userId: req.user.id } });
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found.' });

    const members = await OrgMember.findAll({
      where: { orgId: org.id },
      include: [
        { model: OrgRole, as: 'role', attributes: ['id', 'name', 'permissions'] },
        { model: User, as: 'user', attributes: ['id', 'email', 'avatarUrl'] },
      ],
      order: [['createdAt', 'ASC']],
    });
    res.json({ success: true, data: { members } });
  } catch (err) { next(err); }
});

/**
 * POST /api/org-roles/members
 * Add/invite a member
 */
router.post('/members', requireAuth, requireRole('org'), async (req, res, next) => {
  try {
    const org = await Organization.findOne({ where: { userId: req.user.id } });
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found.' });

    const { email, roleId } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required.' });

    if (roleId) {
      const role = await OrgRole.findOne({ where: { id: roleId, orgId: org.id } });
      if (!role) return res.status(400).json({ success: false, message: 'Invalid role.' });
    }

    const user = await User.findOne({ where: { email } });
    const member = await OrgMember.create({
      orgId: org.id,
      userId: user ? user.id : null,
      roleId: roleId || null,
      inviteEmail: email,
      status: user ? 'active' : 'invited',
    });

    res.status(201).json({ success: true, message: 'Member added.', data: { member } });
  } catch (err) { next(err); }
});

/**
 * PATCH /api/org-roles/members/:id
 * Update member's role
 */
router.patch('/members/:id', requireAuth, requireRole('org'), async (req, res, next) => {
  try {
    const org = await Organization.findOne({ where: { userId: req.user.id } });
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found.' });

    const member = await OrgMember.findOne({ where: { id: req.params.id, orgId: org.id } });
    if (!member) return res.status(404).json({ success: false, message: 'Member not found.' });

    const { roleId, status } = req.body;
    if (roleId !== undefined) member.roleId = roleId;
    if (status) member.status = status;
    await member.save();

    res.json({ success: true, message: 'Member updated.', data: { member } });
  } catch (err) { next(err); }
});

/**
 * DELETE /api/org-roles/members/:id
 * Remove a member
 */
router.delete('/members/:id', requireAuth, requireRole('org'), async (req, res, next) => {
  try {
    const org = await Organization.findOne({ where: { userId: req.user.id } });
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found.' });

    const member = await OrgMember.findOne({ where: { id: req.params.id, orgId: org.id } });
    if (!member) return res.status(404).json({ success: false, message: 'Member not found.' });

    await member.update({ status: 'removed' });
    res.json({ success: true, message: 'Member removed.' });
  } catch (err) { next(err); }
});

module.exports = router;
