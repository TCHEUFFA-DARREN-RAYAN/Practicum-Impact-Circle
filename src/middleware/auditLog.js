const auditLog = (req, res, next) => {
  const mutatingMethods = ['POST', 'PATCH', 'PUT', 'DELETE'];
  if (!mutatingMethods.includes(req.method)) return next();

  const originalJson = res.json.bind(res);
  res.json = function (body) {
    try {
      const { AuditLog } = require('../models/index');
      AuditLog.create({
        eventType: `${req.method}:${req.path}`,
        actorId: req.user?.id || null,
        actorRole: req.user?.role || 'anonymous',
        method: req.method,
        route: req.path,
        statusCode: res.statusCode,
        metadata: { params: req.params },
      }).catch(() => {});
    } catch {}
    return originalJson(body);
  };
  next();
};

module.exports = auditLog;
