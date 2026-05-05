const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    const errors = (err.errors || []).map(e => ({ field: e.path, message: e.message }));
    const message = err.name === 'SequelizeUniqueConstraintError'
      ? 'That value is already taken.'
      : 'Validation failed.';
    return res.status(422).json({ success: false, message, errors });
  }

  if (err.name === 'SequelizeDatabaseError') {
    console.error('DB error detail:', err.parent?.message);
    return res.status(500).json({ success: false, message: 'Database error. Please try again.' });
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
  }

  if (err.name === 'MulterError') {
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'File too large. Maximum size is 5 MB.' : err.message;
    return res.status(400).json({ success: false, message: msg });
  }

  const status = err.status || err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' && status === 500
    ? 'An unexpected error occurred. Please try again later.'
    : err.message || 'An unexpected error occurred.';

  res.status(status).json({ success: false, message });
};

module.exports = errorHandler;
