const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const asyncHandler = require('../middleware/asyncHandler');
const { protect, restrictTo } = require('../middleware/auth.middleware');
const SecurityService = require('../services/security.service');
const CyberExerciseService = require('../services/cyber-exercise.service');
const ThreatService = require('../services/threat.service');

// Cron-triggered scan. Protected by SCAN_API_KEY (shared secret set in Vercel + GitHub Actions secret).
// Without the key, only admins can trigger a scan.
router.post('/scan', asyncHandler(async (req, res) => {
  const key = (req.headers['x-scan-key'] || '').trim();
  const isCron = process.env.SCAN_API_KEY && key === process.env.SCAN_API_KEY;

  if (!isCron) {
    return res.status(401).json({ success: false, error: 'Invalid scan key' });
  }

  const scan = await SecurityService.runScan();
  res.status(201).json({ success: true, data: scan });
}));

// Dashboard: latest scans (admin only)
router.get('/scans', protect, restrictTo('admin'), asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);
  const scans = await SecurityService.getRecentScans(limit);
  res.json({ success: true, data: scans });
}));

// Red Team / Blue Team cyber-exercise. Triggered by cron (SCAN_API_KEY) OR by an
// authenticated admin from the dashboard. Runs live attack simulations (red) and
// defensive verifications (blue), then persists a SecurityExercise record.
router.post('/exercise', asyncHandler(async (req, res) => {
  const key = (req.headers['x-scan-key'] || '').trim();
  const isCron = process.env.SCAN_API_KEY && key === process.env.SCAN_API_KEY;
  const side = (req.body && req.body.side) || 'both';

  if (isCron) {
    const result = await CyberExerciseService.runExercise({ triggeredBy: 'cron', side });
    return res.status(201).json({ success: true, data: result });
  }

  // Manual trigger from the dashboard — admin JWT only.
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ success: false, error: 'Invalid scan key or admin token' });
  }
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid scan key or admin token' });
  }
  if (payload.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  const result = await CyberExerciseService.runExercise({ triggeredBy: 'admin', side });
  res.status(201).json({ success: true, data: result });
}));

// Dashboard: latest exercises (admin only)
router.get('/exercises', protect, restrictTo('admin'), asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);
  const exercises = await CyberExerciseService.getRecentExercises(limit);
  res.json({ success: true, data: exercises });
}));

// Dashboard: live threat events (admin only)
router.get('/threats', protect, restrictTo('admin'), asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  const threats = await ThreatService.getThreats(limit);
  res.json({ success: true, data: threats });
}));

// Dashboard: currently blocked IPs (admin only)
router.get('/blocked', protect, restrictTo('admin'), asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 100, 200);
  const blocked = await ThreatService.getBlocked(limit);
  res.json({ success: true, data: blocked });
}));

// Dashboard: manually unblock an IP (admin only)
router.delete('/blocked/:id', protect, restrictTo('admin'), asyncHandler(async (req, res) => {
  await ThreatService.unblock(req.params.id);
  res.json({ success: true, data: { id: req.params.id, unblocked: true } });
}));

module.exports = router;
