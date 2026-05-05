const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const { requireAuth, requireRole } = require('../middleware/auth');

router.get('/:userId/:filename', requireAuth, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin' && req.user.id !== req.params.userId) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const filePath = path.join(__dirname, '../../src/uploads', req.params.userId, req.params.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File not found.' });
    }

    res.sendFile(filePath);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
