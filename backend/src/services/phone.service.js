const { getTwilioClient, getPhoneNumber } = require('../config/twilio');
const AIService = require('./ai.service');
const BankingAgents = require('./banking-agents.service');
const prisma = require('../config/db');

class PhoneService {
  static getVoiceName(gender) {
    // Match the TTS voice to the officer answering the call (Sara/Fatima = female,
    // Ahmed/Bilal/Ali = male).
    return gender === 'female' ? 'Polly.Joanna' : 'Polly.Matthew';
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

    // If a banking officer handled the call, introduce them so the caller knows
    // exactly who they are talking to, and use a matching voice.
    let spoken = result.message;
    let voiceName = this.getVoiceName();
    if (business.type === 'banking' && result.agent) {
      spoken = `${BankingAgents.voiceIntro(result.agent)}${spoken}`;
      voiceName = this.getVoiceName(result.agent.gender);
    }

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voiceName}">${this.escapeXml(spoken)}</Say>
  <Gather input="speech" action="${process.env.APP_URL || 'http://localhost:5000'}/api/webhook/voice/gather" method="POST" speechTimeout="auto" language="en-US">
  </Gather>
  <Say voice="${voiceName}">Thank you. Goodbye!</Say>
  <Hangup/>
</Response>`;

    return {
      twiml,
      conversationId: result.conversationId,
      message: result.message,
      agent: result.agent || null,
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

  static async getInitialVoiceResponse(businessId) {
    // If this is a banking business, the call opens by introducing the whole
    // agent team so the caller knows they can talk to Sara, Bilal, Ahmed, etc.
    let greeting = "Hello! Thank you for calling. I'm your AI assistant. How can I help you today?";
    let voiceName = this.getVoiceName();
    if (businessId) {
      try {
        const business = await prisma.business.findUnique({ where: { id: businessId } });
        if (business && business.type === 'banking') {
          greeting = BankingAgents.teamIntro(business.name);
        }
      } catch (e) {
        console.error('[Phone] Intro lookup failed:', e.message);
      }
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voiceName}">${this.escapeXml(greeting)}</Say>
  <Gather input="speech" action="${process.env.APP_URL || 'http://localhost:5000'}/api/webhook/voice/gather" method="POST" speechTimeout="auto" language="en-US">
  </Gather>
  <Say voice="${voiceName}">I didn't hear anything. Let me know if you need help. Goodbye!</Say>
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
