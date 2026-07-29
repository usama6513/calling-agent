const { getTwilioClient, getPhoneNumber } = require('../config/twilio');
const AIService = require('./ai.service');
const prisma = require('../config/db');

class WhatsAppService {
  static async sendMessage(toNumber, message, businessId) {
    const client = getTwilioClient();
    const fromNumber = getPhoneNumber();

    const sentMessage = await client.messages.create({
      from: `whatsapp:${fromNumber}`,
      to: `whatsapp:${toNumber}`,
      body: message,
    });

    return {
      messageSid: sentMessage.sid,
      status: sentMessage.status,
    };
  }

  static async handleIncomingMessage(businessId, fromNumber, body, mediaUrl = null) {
    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) throw new Error('Business not found');

    let conversation = await prisma.conversation.findFirst({
      where: {
        businessId,
        channel: 'whatsapp',
        status: 'active',
        metadata: { path: ['fromNumber'], equals: fromNumber },
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          businessId,
          channel: 'whatsapp',
          status: 'active',
          metadata: {
            fromNumber,
            platform: 'whatsapp',
          },
        },
      });
    }

    let userMessage = body;
    if (mediaUrl) {
      userMessage = `[Media attached: ${mediaUrl}] ${body}`;
    }

    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: userMessage,
      },
    });

    const result = await AIService.chat(businessId, conversation.id, body, 'whatsapp');

    await this.sendMessage(fromNumber, result.message, businessId);

    return {
      conversationId: conversation.id,
      message: result.message,
      tokens: result.tokens,
    };
  }

  static async sendTemplateMessage(toNumber, templateName, businessId, variables = {}) {
    const client = getTwilioClient();
    const fromNumber = getPhoneNumber();

    const templateData = {
      from: `whatsapp:${fromNumber}`,
      to: `whatsapp:${toNumber}`,
      contentSid: templateName,
      contentVariables: JSON.stringify(variables),
    };

    const sentMessage = await client.messages.create(templateData);

    return {
      messageSid: sentMessage.sid,
      status: sentMessage.status,
    };
  }

  static async sendOrderConfirmation(toNumber, orderDetails, businessId) {
    const message = `✅ *Order Confirmed!*

Order ID: ${orderDetails.id}
Item: ${orderDetails.item}
Total: $${orderDetails.total}
Estimated Time: ${orderDetails.estimatedTime}

Thank you for your order! Reply to this message if you have any questions.`;

    return this.sendMessage(toNumber, message, businessId);
  }

  static async sendAppointmentReminder(toNumber, appointment, businessId) {
    const message = `📅 *Appointment Reminder*

Hello ${appointment.customerName}!
You have an appointment scheduled:
Date: ${appointment.date}
Time: ${appointment.time}
Service: ${appointment.service}

Reply CONFIRM to confirm or CANCEL to cancel.`;

    return this.sendMessage(toNumber, message, businessId);
  }

  static escapeXml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

module.exports = WhatsAppService;
