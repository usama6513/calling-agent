const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/asyncHandler');
const { protect, restrictTo } = require('../middleware/auth.middleware');
const SecurityService = require('../services/security.service');

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

module.exports = router;
