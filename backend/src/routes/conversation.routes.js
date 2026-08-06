const express = require('express');
const router = express.Router();
const ConversationService = require('../services/conversation.service');
const asyncHandler = require('../middleware/asyncHandler');
const { protect } = require('../middleware/auth.middleware');

router.get('/:businessId', asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  const result = await ConversationService.getByBusiness(req.params.businessId, page, limit);

  res.json({
    success: true,
    data: result.conversations,
    pagination: result.pagination,
  });
}));

router.get('/detail/:id', asyncHandler(async (req, res) => {
  const conversation = await ConversationService.getById(req.params.id);

  if (!conversation) {
    return res.status(404).json({
      success: false,
      error: 'Conversation not found',
    });
  }

  res.json({
    success: true,
    data: conversation,
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
