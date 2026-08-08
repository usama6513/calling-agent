const express = require('express');
const router = express.Router();
const ConversationService = require('../services/conversation.service');
const prisma = require('../config/db');
const asyncHandler = require('../middleware/asyncHandler');
const { protect } = require('../middleware/auth.middleware');

// Read routes are used by the dashboard (JWT) AND by the public widget (per-business widget key).
// Bearer token → standard JWT auth. Otherwise a valid x-widget-key for the target business is required.
function protectOrWidgetKey(req, res, next) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) {
    return protect(req, res, next);
  }
  req.widgetKey = (req.headers['x-widget-key'] || '').trim();
  return next();
}

async function getWidgetKey(businessId) {
  const biz = await prisma.business.findUnique({
    where: { id: businessId },
    select: { widgetKey: true },
  });
  return biz ? biz.widgetKey : null;
}

router.get('/:businessId', protectOrWidgetKey, asyncHandler(async (req, res) => {
  if (!req.user) {
    const wk = await getWidgetKey(req.params.businessId);
    if (!wk || !req.widgetKey || wk !== req.widgetKey) {
      return res.status(401).json({ success: false, error: 'Invalid widget key' });
    }
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  const result = await ConversationService.getByBusiness(req.params.businessId, page, limit);

  res.json({
    success: true,
    data: result.conversations,
    pagination: result.pagination,
  });
}));

router.get('/detail/:id', protectOrWidgetKey, asyncHandler(async (req, res) => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: req.params.id },
    select: { businessId: true },
  });

  if (!conversation) {
    return res.status(404).json({
      success: false,
      error: 'Conversation not found',
    });
  }

  if (!req.user) {
    const wk = await getWidgetKey(conversation.businessId);
    if (!wk || !req.widgetKey || wk !== req.widgetKey) {
      return res.status(401).json({ success: false, error: 'Invalid widget key' });
    }
  }

  const result = await ConversationService.getById(req.params.id);

  if (!result) {
    return res.status(404).json({
      success: false,
      error: 'Conversation not found',
    });
  }

  res.json({
    success: true,
    data: result,
  });
}));

router.put('/:id/close', protect, asyncHandler(async (req, res) => {
  const conversation = await ConversationService.close(req.params.id);

  res.json({
    success: true,
    data: conversation,
  });
}));

router.put('/:id/transfer', protect, asyncHandler(async (req, res) => {
  const conversation = await ConversationService.transfer(req.params.id);

  res.json({
    success: true,
    data: conversation,
  });
}));

module.exports = router;
