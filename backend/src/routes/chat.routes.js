const express = require('express');
const router = express.Router();
const AIService = require('../services/ai.service');
const asyncHandler = require('../middleware/asyncHandler');

router.post('/', asyncHandler(async (req, res) => {
  const { businessId, conversationId, message, channel } = req.body;

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
    channel || 'web'
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
