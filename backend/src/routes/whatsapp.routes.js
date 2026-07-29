const express = require('express');
const router = express.Router();
const WhatsAppService = require('../services/whatsapp.service');
const asyncHandler = require('../middleware/asyncHandler');

router.post('/incoming', asyncHandler(async (req, res) => {
  const { From, Body, NumMedia, MediaUrl0, BusinessId } = req.body;

  const fromNumber = From.replace('whatsapp:', '');
  console.log(`📱 WhatsApp message from ${fromNumber}: "${Body}"`);

  let mediaUrl = null;
  if (NumMedia && parseInt(NumMedia) > 0) {
    mediaUrl = MediaUrl0;
  }

  try {
    const result = await WhatsAppService.handleIncomingMessage(
      BusinessId || 'default',
      fromNumber,
      Body,
      mediaUrl
    );

    console.log(`✅ Reply sent: ${result.message.substring(0, 50)}...`);
  } catch (error) {
    console.error('❌ Error handling WhatsApp message:', error);
  }

  res.sendStatus(200);
}));

router.post('/send', asyncHandler(async (req, res) => {
  const { toNumber, message, businessId } = req.body;

  if (!toNumber || !message) {
    return res.status(400).json({
      success: false,
      error: 'toNumber and message are required',
    });
  }

  const result = await WhatsAppService.sendMessage(toNumber, message, businessId);

  res.json({
    success: true,
    data: result,
  });
}));

router.post('/template', asyncHandler(async (req, res) => {
  const { toNumber, templateName, businessId, variables } = req.body;

  if (!toNumber || !templateName) {
    return res.status(400).json({
      success: false,
      error: 'toNumber and templateName are required',
    });
  }

  const result = await WhatsAppService.sendTemplateMessage(
    toNumber,
    templateName,
    businessId,
    variables
  );

  res.json({
    success: true,
    data: result,
  });
}));

router.post('/order-confirmation', asyncHandler(async (req, res) => {
  const { toNumber, orderDetails, businessId } = req.body;

  if (!toNumber || !orderDetails) {
    return res.status(400).json({
      success: false,
      error: 'toNumber and orderDetails are required',
    });
  }

  const result = await WhatsAppService.sendOrderConfirmation(
    toNumber,
    orderDetails,
    businessId
  );

  res.json({
    success: true,
    data: result,
  });
}));

router.post('/appointment-reminder', asyncHandler(async (req, res) => {
  const { toNumber, appointment, businessId } = req.body;

  if (!toNumber || !appointment) {
    return res.status(400).json({
      success: false,
      error: 'toNumber and appointment are required',
    });
  }

  const result = await WhatsAppService.sendAppointmentReminder(
    toNumber,
    appointment,
    businessId
  );

  res.json({
    success: true,
    data: result,
  });
}));

module.exports = router;
