const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const { requireAuth } = require('../middleware/auth');

// Avatars and logos are public — img tags cannot send Authorization headers.
// Documents (gov ID, background check) remain protected.
router.get('/:userId/:filename', async (req, res, next) => {
  try {
    const { userId, filename } = req.params;
    const isAvatar = /^avatar-/i.test(filename) || /^logo-/i.test(filename);
    const isResume = /^resume-/i.test(filename);

    if (!isAvatar && !isResume) {
      // Private document — require auth and ownership/admin
      const authHeader = req.headers['authorization'];
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
        const isOwner = String(decoded.id) === String(userId);
        const isAdmin = decoded.role === 'admin';
        if (!isOwner && !isAdmin) {
          return res.status(403).json({ success: false, message: 'Access denied.' });
        }
      } catch {
        return res.status(401).json({ success: false, message: 'Invalid token.' });
      }
    }

    const filePath = path.join(__dirname, '../../src/uploads', userId, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File not found.' });
    }

    // Set appropriate cache headers for public assets
    if (isAvatar) {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }

    res.sendFile(path.resolve(filePath));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
