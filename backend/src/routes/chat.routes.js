const express = require('express');
const router = express.Router();
const AIService = require('../services/ai.service');
const prisma = require('../config/db');
const asyncHandler = require('../middleware/asyncHandler');

router.post('/ensure-conversation', asyncHandler(async (req, res) => {
  const { businessId, channel } = req.body;

  if (!businessId) {
    return res.status(400).json({
      success: false,
      error: 'businessId is required',
    });
  }

  let conversation = null;
  if (req.body.conversationId) {
    conversation = await prisma.conversation.findUnique({
      where: { id: req.body.conversationId },
    });
  }

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        businessId,
        channel: channel || 'web',
        status: 'active',
      },
    });
  }

  res.json({ success: true, data: { conversationId: conversation.id } });
}));

router.post('/', asyncHandler(async (req, res) => {
  const { businessId, conversationId, message, channel, attachmentId } = req.body;

  if (!businessId || !message) {
    return res.status(400).json({
      success: false,
      error: 'businessId and message are required',
    });
  }

  const result = await AIService.chat(
    businessId,
    conversationId || null,
    message,
    channel || 'web',
    attachmentId || null
  );

  res.json({
    success: true,
    data: result,
  });
}));

router.post('/voice', asyncHandler(async (req, res) => {
  const { businessId, conversationId, speechInput, channel } = req.body;

  if (!businessId || !speechInput) {
    return res.status(400).json({
      success: false,
      error: 'businessId and speechInput are required',
    });
  }

  const result = await AIService.chat(
    businessId,
    conversationId || null,
    speechInput,
    channel || 'phone'
  );

  res.json({
    success: true,
    data: result,
  });
}));

module.exports = router;
