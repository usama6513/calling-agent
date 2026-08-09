const ThreatService = require('../services/threat.service');

function getClientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (xff) return String(xff).split(',')[0].trim();
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

// Runs on every request (after body parsing). Skips preflight, health, the
// internal cyber-exercise (which deliberately sends attack-shaped payloads and
// authenticates with the shared SCAN_API_KEY via x-cyber-exercise header), and
// the /api/security management surface itself (JWT + admin-role protected) so a
// blocked admin can still reach the dashboard to unblock an IP.
module.exports = async (req, res, next) => {
  if (req.method === 'OPTIONS') return next();
  if (req.path === '/' || req.path === '/health') return next();
  if (req.path.startsWith('/api/security')) return next();

  const ex = req.headers['x-cyber-exercise'];
  if (process.env.SCAN_API_KEY && ex === process.env.SCAN_API_KEY) return next();

  try {
    const ip = getClientIp(req);
    const rejected = await ThreatService.check(req, ip);
    if (rejected) {
      return res.status(403).json({ success: false, error: 'Access denied — IP blocked' });
    }
  } catch (e) {
    // Never let a threat-check failure take down the app.
  }
  return next();
};
