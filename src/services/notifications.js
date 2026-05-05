const { Notification } = require('../models/index');

const createNotification = async (userId, message, type = 'general', link = null) => {
  try {
    await Notification.create({ userId, message, type, link });
  } catch (err) {
    console.error('[NOTIFICATION] Failed to create:', err.message);
  }
};

module.exports = { createNotification };
