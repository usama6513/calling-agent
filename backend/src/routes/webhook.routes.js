const express = require('express');
const router = express.Router();
const PhoneService = require('../services/phone.service');
const asyncHandler = require('../middleware/asyncHandler');

router.post('/voice/incoming', asyncHandler(async (req, res) => {
  const { CallSid, From, To, Direction, BusinessId } = req.body;

  console.log(`📞 Incoming call: ${From} -> ${To} (${CallSid})`);

  let conversation = null;
  if (BusinessId) {
    conversation = await require('../config/db').conversation.create({
      data: {
        businessId: BusinessId,
        channel: 'phone',
        status: 'active',
        metadata: {
          twilioCallSid: CallSid,
          fromNumber: From,
          toNumber: To,
          direction: Direction,
        },
      },
    });
  }

  const twiml = PhoneService.getInitialVoiceResponse(BusinessId);

  res.type('text/xml');
  res.send(twiml);
}));

router.post('/voice/gather', asyncHandler(async (req, res) => {
  const { CallSid, SpeechResult, BusinessId, ConversationId } = req.body;

  console.log(`🎤 Speech received: "${SpeechResult}" (${CallSid})`);

  if (!SpeechResult) {
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Matthew">I didn't catch that. Could you please repeat?</Say>
  <Gather input="speech" action="${process.env.APP_URL || 'http://localhost:5000'}/api/webhook/voice/gather" method="POST" speechTimeout="auto" language="en-US">
  </Gather>
  <Say voice="Polly.Matthew">Thank you for calling. Goodbye!</Say>
  <Hangup/>
</Response>`;
    res.type('text/xml');
    return res.send(twiml);
  }

  const conversation = await require('../config/db').conversation.findFirst({
    where: {
      metadata: { path: ['twilioCallSid'], equals: CallSid },
    },
  });

  const bizId = BusinessId || conversation?.businessId;
  const convId = ConversationId || conversation?.id;

  if (!bizId) {
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Matthew">I'm sorry, I'm having trouble connecting. Please call back later.</Say>
  <Hangup/>
</Response>`;
    res.type('text/xml');
    return res.send(twiml);
  }

  const result = await PhoneService.generateVoiceResponse(bizId, convId, SpeechResult);

  res.type('text/xml');
  res.send(result.twiml);
}));

router.post('/voice/status', asyncHandler(async (req, res) => {
  const { CallSid, CallStatus, CallDuration, RecordingUrl } = req.body;

  console.log(`📞 Call status: ${CallSid} -> ${CallStatus}`);

  await PhoneService.handleCallStatus({
    CallSid,
    CallStatus,
    CallDuration,
    RecordingUrl,
  });

  res.sendStatus(200);
}));

router.post('/voice/recording', asyncHandler(async (req, res) => {
  const { CallSid, RecordingUrl, RecordingDuration, RecordingSid } = req.body;

  console.log(`🎙️ Recording saved: ${RecordingSid} (${RecordingDuration}s)`);

  const conversation = await require('../config/db').conversation.findFirst({
    where: {
      metadata: { path: ['twilioCallSid'], equals: CallSid },
    },
  });

  if (conversation) {
    await require('../config/db').conversation.update({
      where: { id: conversation.id },
      data: {
        metadata: {
          ...conversation.metadata,
          recordingUrl,
          recordingDuration: parseInt(RecordingDuration),
        },
      },
    });
  }

  res.sendStatus(200);
}));

module.exports = router;
