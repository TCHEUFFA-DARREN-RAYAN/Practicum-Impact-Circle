const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => ({ field: e.path, message: e.message }));
    return res.status(422).json({ success: false, message: 'Validation failed.', errors });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({ success: false, message: `${field} already exists.` });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, message: 'Invalid ID format.' });
  }

  const status = err.status || err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' && status === 500
    ? 'An unexpected error occurred.'
    : err.message || 'An unexpected error occurred.';

  res.status(status).json({ success: false, message });
};

module.exports = errorHandler;
