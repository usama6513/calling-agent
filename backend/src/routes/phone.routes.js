const express = require('express');
const router = express.Router();
const PhoneService = require('../services/phone.service');
const asyncHandler = require('../middleware/asyncHandler');

router.post('/call', asyncHandler(async (req, res) => {
  const { businessId, toNumber, message } = req.body;

  if (!businessId || !toNumber) {
    return res.status(400).json({
      success: false,
      error: 'businessId and toNumber are required',
    });
  }

  const result = await PhoneService.makeOutboundCall(businessId, toNumber, message);

  res.json({
    success: true,
    data: result,
  });
}));

router.get('/status/:callSid', asyncHandler(async (req, res) => {
  const { getTwilioClient } = require('../config/twilio');
  const client = getTwilioClient();

  const call = await client.calls(req.params.callSid).fetch();

  res.json({
    success: true,
    data: {
      sid: call.sid,
      status: call.status,
      duration: call.duration,
      startTime: call.startTime,
      endTime: call.endTime,
      recordingUrl: call.recordingUrl,
    },
  });
}));

module.exports = router;
