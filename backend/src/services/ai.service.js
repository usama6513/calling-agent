const { groq, GROQ_MODEL } = require('../config/groq');
const prisma = require('../config/db');

const BUSINESS_TYPE_PROMPTS = {
  restaurant: `You are an AI receptionist for a restaurant. You can:
- Help with menu questions, food recommendations, and dietary restrictions
- Take reservations and manage table bookings
- Handle takeout/delivery orders
- Provide location, hours, and contact information
- Answer questions about ingredients, allergens, and specials
Always be warm, friendly, and passionate about food.`,

  'real-estate': `You are an AI assistant for a real estate agency. You can:
- Help clients find properties (buy, rent, sell)
- Schedule property viewings and appointments
- Provide market insights and property details
- Answer questions about neighborhoods, schools, amenities
- Guide through the buying/renting process
Always be professional, knowledgeable, and helpful.`,

  ecommerce: `You are an AI customer service agent for an e-commerce store. You can:
- Help with product questions and recommendations
- Track orders and provide shipping updates
- Process returns and exchanges
- Handle payment and billing inquiries
- Assist with account issues
Always be efficient, helpful, and solution-oriented.`,

  consulting: `You are an AI assistant for a consulting firm. You can:
- Schedule consultations and meetings
- Provide information about services offered
- Answer questions about expertise and specializations
- Share case studies and success stories
- Guide potential clients through the engagement process
Always be professional, insightful, and value-driven.`,

  generic: `You are a versatile AI business assistant. You can:
- Answer general business questions
- Schedule appointments and meetings
- Provide information about products and services
- Handle customer inquiries and complaints
- Escalate to human agents when needed
Always be professional, helpful, and adaptable.`,
};

const SYSTEM_PROMPT_BASE = `You are an AI-powered business assistant for a real business. Your role is to help customers professionally and efficiently.

CORE RULES:
1. Always be polite, professional, and helpful
2. If you don't know something, say so honestly - never make up information
3. Keep responses concise but complete
4. If a customer asks for something you can't handle, offer to connect them with a human
5. Always confirm important details (appointments, orders, etc.) before finalizing
6. Use the business's knowledge base for accurate information
7. Follow the business's rules and guidelines strictly
8. Be conversational but professional
9. If on a phone call, keep responses natural for voice conversation. Avoid bullet points.

IMPORTANT: You are representing a real business. Be accurate and reliable.`;

class AIService {
  static buildSystemPrompt(business, channel = 'web') {
    const typePrompt = BUSINESS_TYPE_PROMPTS[business.type] || BUSINESS_TYPE_PROMPTS.generic;

    let knowledgeContext = '';
    if (business.knowledgeBase) {
      const kb = business.knowledgeBase;
      knowledgeContext = `\n\nBUSINESS KNOWLEDGE BASE:\n${JSON.stringify(kb, null, 2)}`;
    }

    let rulesContext = '';
    if (business.rules) {
      const rules = business.rules;
      rulesContext = `\n\nBUSINESS RULES:\n${JSON.stringify(rules, null, 2)}`;
    }

    let hoursContext = '';
    if (business.workingHours) {
      hoursContext = `\n\nWORKING HOURS:\n${JSON.stringify(business.workingHours, null, 2)}`;
    }

    let infoContext = '';
    const infoParts = [];
    if (business.description) infoParts.push(`Description: ${business.description}`);
    if (business.phone) infoParts.push(`Phone: ${business.phone}`);
    if (business.email) infoParts.push(`Email: ${business.email}`);
    if (business.address) infoParts.push(`Address: ${business.address}`);
    if (business.website) infoParts.push(`Website: ${business.website}`);
    if (infoParts.length > 0) {
      infoContext = `\n\nBUSINESS INFORMATION:\n${infoParts.join('\n')}`;
    }

    const channelContext = channel === 'phone'
      ? '\n\nCHANNEL: Phone Call - Keep responses natural for voice. Be concise. Avoid bullet points and long lists. Use short, easy-to-pronounce sentences.'
      : channel === 'whatsapp'
      ? '\n\nCHANNEL: WhatsApp - You can use emojis moderately. Keep messages readable.'
      : '\n\nCHANNEL: Web Chat - You can use formatting for clarity.';

    return `${SYSTEM_PROMPT_BASE}\n\n${GROQ_SYSTEM_PROMPT}\n\n${typePrompt}\n\nBUSINESS: ${business.name}${knowledgeContext}${rulesContext}${infoContext}${hoursContext}${channelContext}`;
  }

  static async getConversationHistory(conversationId, limit = 20) {
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    return messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
  }

  static async chat(businessId, conversationId, userMessage, channel = 'web') {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      throw new Error('Business not found');
    }

    let conversation;
    if (conversationId) {
      conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
      });
    }

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          businessId,
          channel,
          status: 'active',
        },
      });
    }

    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: userMessage,
      },
    });

    const history = await this.getConversationHistory(conversation.id);
    const systemPrompt = this.buildSystemPrompt(business, channel);

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history,
    ];

    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 1024,
      top_p: 0.9,
    });

    const assistantMessage = completion.choices[0]?.message?.content;

    if (!assistantMessage) {
      throw new Error('No response generated from AI');
    }

    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: assistantMessage,
        tokens: completion.usage?.total_tokens || 0,
      },
    });

    return {
      conversationId: conversation.id,
      message: assistantMessage,
      tokens: completion.usage?.total_tokens || 0,
    };
  }

  static async generateResponse(business, prompt, context = '') {
    const systemPrompt = this.buildSystemPrompt(business, 'web');

    const messages = [
      { role: 'system', content: systemPrompt },
    ];

    if (context) {
      messages.push({ role: 'system', content: `Context: ${context}` });
    }

    messages.push({ role: 'user', content: prompt });

    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 1024,
    });

    return completion.choices[0]?.message?.content;
  }
}

module.exports = AIService;
