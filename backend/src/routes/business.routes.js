const express = require('express');
const router = express.Router();
const BusinessService = require('../services/business.service');
const ConversationService = require('../services/conversation.service');
const asyncHandler = require('../middleware/asyncHandler');
const { protect, restrictTo } = require('../middleware/auth.middleware');

// A manager can only manage businesses they created. Pre-built businesses
// (ownerId = null) and other users' businesses are admin-only to manage.
function canManage(user, business) {
  return user.role === 'admin' || (business.ownerId && business.ownerId === user.id);
}

router.post('/', protect, restrictTo('admin', 'manager'), asyncHandler(async (req, res) => {
  const { name, type, phone, email, address, website, description, knowledgeBase, rules, workingHours } = req.body;

  if (!name) {
    return res.status(400).json({
      success: false,
      error: 'Business name is required',
    });
  }

  const business = await BusinessService.create({
    name, type, phone, email, address, website, description,
    knowledgeBase, rules, workingHours,
    ownerId: req.user.id,
  });

  res.status(201).json({
    success: true,
    data: business,
  });
}));

router.get('/', asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  const result = await BusinessService.getAll(page, limit);

  res.json({
    success: true,
    data: result.businesses,
    pagination: result.pagination,
  });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const business = await BusinessService.getById(req.params.id);

  if (!business) {
    return res.status(404).json({
      success: false,
      error: 'Business not found',
    });
  }

  res.json({
    success: true,
    data: business,
  });
}));

router.put('/:id', protect, asyncHandler(async (req, res) => {
  const business = await BusinessService.getById(req.params.id);

  if (!business) {
    return res.status(404).json({
      success: false,
      error: 'Business not found',
    });
  }

  if (!canManage(req.user, business)) {
    return res.status(403).json({
      success: false,
      error: 'You can only modify agents you created. Pre-built agents are admin-managed.',
    });
  }

  const updated = await BusinessService.update(req.params.id, req.body);

  res.json({
    success: true,
    data: updated,
  });
}));

router.put('/:id/knowledge', protect, asyncHandler(async (req, res) => {
  const { knowledgeBase } = req.body;

  if (!knowledgeBase) {
    return res.status(400).json({
      success: false,
      error: 'knowledgeBase is required',
    });
  }

  const business = await BusinessService.getById(req.params.id);
  if (!business) {
    return res.status(404).json({ success: false, error: 'Business not found' });
  }
  if (!canManage(req.user, business)) {
    return res.status(403).json({ success: false, error: 'You can only modify agents you created.' });
  }

  const updated = await BusinessService.updateKnowledgeBase(req.params.id, knowledgeBase);

  res.json({
    success: true,
    data: updated,
  });
}));

router.put('/:id/rules', protect, asyncHandler(async (req, res) => {
  const { rules } = req.body;

  if (!rules) {
    return res.status(400).json({
      success: false,
      error: 'rules is required',
    });
  }

  const business = await BusinessService.getById(req.params.id);
  if (!business) {
    return res.status(404).json({ success: false, error: 'Business not found' });
  }
  if (!canManage(req.user, business)) {
    return res.status(403).json({ success: false, error: 'You can only modify agents you created.' });
  }

  const updated = await BusinessService.updateRules(req.params.id, rules);

  res.json({
    success: true,
    data: updated,
  });
}));

router.delete('/:id', protect, asyncHandler(async (req, res) => {
  const business = await BusinessService.getById(req.params.id);

  if (!business) {
    return res.status(404).json({
      success: false,
      error: 'Business not found',
    });
  }

  if (!canManage(req.user, business)) {
    return res.status(403).json({
      success: false,
      error: 'You can only delete agents you created. Pre-built agents are admin-managed.',
    });
  }

  await BusinessService.delete(req.params.id);

  res.json({
    success: true,
    message: 'Business deleted successfully',
  });
}));

router.get('/:id/stats', asyncHandler(async (req, res) => {
  const stats = await ConversationService.getStats(req.params.id);

  res.json({
    success: true,
    data: stats,
  });
}));

module.exports = router;
