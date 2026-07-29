const { getTwilioClient, getPhoneNumber } = require('../config/twilio');
const AIService = require('./ai.service');
const prisma = require('../config/db');

class PhoneService {
  static getVoiceName() {
    return 'Polly.Matthew';
  }

  static getGatherLanguage() {
    return 'en-US';
  }
  static async makeOutboundCall(businessId, toNumber, message) {
    const client = getTwilioClient();
    const fromNumber = getPhoneNumber();
    const business = await prisma.business.findUnique({ where: { id: businessId } });

    if (!business) throw new Error('Business not found');

    const webhookUrl = process.env.APP_URL || 'http://localhost:5000';

    const call = await client.calls.create({
      to: toNumber,
      from: fromNumber,
      url: `${webhookUrl}/api/webhook/voice/incoming`,
      statusCallback: `${webhookUrl}/api/webhook/voice/status`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST',
      record: true,
      recordingStatusCallback: `${webhookUrl}/api/webhook/voice/recording`,
      machineDetection: 'Enable',
      machineDetectionTimeout: 5,
    });

    const conversation = await prisma.conversation.create({
      data: {
        businessId,
        channel: 'phone',
        status: 'active',
        metadata: {
          twilioCallSid: call.sid,
          toNumber,
          direction: 'outbound',
        },
      },
    });

    return {
      callSid: call.sid,
      conversationId: conversation.id,
      status: call.status,
    };
  }

  static async generateVoiceResponse(businessId, conversationId, speechInput) {
    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) throw new Error('Business not found');

    const result = await AIService.chat(businessId, conversationId, speechInput, 'phone');

    const voiceName = this.getVoiceName();

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voiceName}">${this.escapeXml(result.message)}</Say>
  <Gather input="speech" action="${process.env.APP_URL || 'http://localhost:5000'}/api/webhook/voice/gather" method="POST" speechTimeout="auto" language="en-US">
  </Gather>
  <Say voice="${voiceName}">Thank you. Goodbye!</Say>
  <Hangup/>
</Response>`;

    return {
      twiml,
      conversationId: result.conversationId,
      message: result.message,
    };
  }

  static escapeXml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  static getInitialVoiceResponse(businessId) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Matthew">Hello! Thank you for calling. I'm your AI assistant. How can I help you today?</Say>
  <Gather input="speech" action="${process.env.APP_URL || 'http://localhost:5000'}/api/webhook/voice/gather" method="POST" speechTimeout="auto" language="en-US">
  </Gather>
  <Say voice="Polly.Matthew">I didn't hear anything. Let me know if you need help. Goodbye!</Say>
  <Hangup/>
</Response>`;
  }

  static async handleCallStatus(statusData) {
    const { CallSid, CallStatus, CallDuration, RecordingUrl } = statusData;

    const conversation = await prisma.conversation.findFirst({
      where: {
        metadata: { path: ['twilioCallSid'], equals: CallSid },
      },
    });

    if (!conversation) return;

    const updateData = {
      metadata: {
        ...conversation.metadata,
        status: CallStatus,
        duration: CallDuration,
        recordingUrl: RecordingUrl,
      },
    };

    if (CallStatus === 'completed' || CallStatus === 'failed' || CallStatus === 'no-answer') {
      updateData.status = 'closed';
    }

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: updateData,
    });

    return conversation;
  }
}

module.exports = PhoneService;
