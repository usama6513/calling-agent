const { groq, GROQ_MODEL } = require('../config/groq');
const { GEMINI_API_KEY, GEMINI_MODELS } = require('../config/gemini');
const prisma = require('../config/db');
const mammoth = require('mammoth');

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

  agriculture: `You are an AI agricultural expert and assistant. You can help with:
- Crop selection and farming guidance (which crops grow best in which soil and climate)
- Soil preparation, testing, fertilization, and land preparation
- Crop diseases, pests, symptoms, prevention, and treatment
- Farming benefits and potential drawbacks/risks of each crop
- Market value and price trends of crops in different countries
- What agriculture can provide (food, jobs, exports, raw materials, sustainability)
- Irrigation, water management, and modern farming techniques
- Livestock, organic farming, and sustainable agriculture
Always be practical, accurate, and clear. Use simple language that farmers and beginners can understand. Give step-by-step guidance when relevant.`,

  generic: `You are a versatile AI business assistant. You can:
- Answer general business questions
- Schedule appointments and meetings
- Provide information about products and services
- Handle customer inquiries and complaints
- Escalate to human agents when needed
Always be professional, helpful, and adaptable.`,
};

const GROQ_SYSTEM_PROMPT = `LANGUAGE: Auto-detect the user's language and always reply in the SAME language the user writes in. If the user writes in Urdu, reply in Urdu. If English, reply in English. If they mix (Roman Urdu/English), match their style. Never switch to English unless the user writes in English. Keep the detected language consistent throughout the conversation.`;

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
  static async describeImage(buffer, mimeType, filename) {
    if (!GEMINI_API_KEY) {
      return `[Image file provided. No vision model configured - cannot read image content.]`;
    }
    const body = {
      contents: [{
        parts: [
          { text: 'Describe this image in detail. Include any visible text, objects, people, crops, plants, animals, signs, or conditions shown. Be specific and factual.' },
          { inline_data: { mime_type: mimeType || 'image/jpeg', data: buffer.toString('base64') } }
        ]
      }]
    };

    const models = GEMINI_MODELS.length > 0 ? GEMINI_MODELS : ['gemini-flash-latest'];
    let lastStatus = 'unknown';
    for (const model of models) {
      const attempts = model === models[0] ? 3 : 1;
      for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            }
          );
          lastStatus = res.status;
          if (!res.ok) {
            const errText = await res.text();
            console.error(`[Gemini Vision] ${model} HTTP ${res.status}:`, errText.slice(0, 200));
            if (res.status === 429 || res.status === 503) {
              await new Promise((r) => setTimeout(r, 800 * attempt));
              continue;
            }
            break;
          }
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return text.trim();
          console.error(`[Gemini Vision] ${model} returned empty response`);
        } catch (error) {
          console.error(`[Gemini Vision] ${model} Error:`, error.message);
          lastStatus = 'error';
          if (attempt < attempts) await new Promise((r) => setTimeout(r, 800 * attempt));
        }
      }
    }
    return `[Image file provided but vision API failed (${lastStatus}).]`;
  }

  static async extractPdfText(buffer) {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const { pathToFileURL } = require('url');
    const fontsDir = require('path').join(__dirname, '..', 'standard_fonts');
    pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(require('path').join(fontsDir, 'pdf.worker.min.mjs')).href;
    const doc = await pdfjs.getDocument({
      data: new Uint8Array(buffer),
      standardFontDataUrl: `${fontsDir}${require('path').sep}`,
      isEvalSupported: false,
    }).promise;
    try {
      let text = '';
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map((it) => it.str).join(' ') + '\n';
      }
      return text;
    } finally {
      await doc.destroy();
    }
  }

  static async extractFileText(attachment) {
    const buffer = attachment.data;
    const mime = attachment.mimeType || '';
    const name = (attachment.filename || '').toLowerCase();

    if (mime.includes('pdf') || name.endsWith('.pdf')) {
      const text = await this.extractPdfText(buffer);
      return `[Attachment: ${attachment.filename} (PDF)]\n${text}`;
    }

    if (mime.includes('docx') || name.endsWith('.docx')) {
      const result = await mammoth.extractRawText({ buffer });
      return `[Attachment: ${attachment.filename} (DOCX)]\n${result.value}`;
    }

    if (mime.includes('text') || mime.includes('json') || name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.json') || name.endsWith('.csv')) {
      const text = buffer.toString('utf8');
      return `[Attachment: ${attachment.filename}]\n${text}`;
    }

    if (mime.startsWith('image/')) {
      const description = await this.describeImage(buffer, mime, attachment.filename);
      return `[Attachment: ${attachment.filename} (Image: ${mime})]\nIMAGE DESCRIPTION:\n${description}`;
    }

    return `[Attachment: ${attachment.filename} (${mime})]`;
  }

  static stripThink(text) {
    if (!text) return text;
    let result = text.replace(/<think>[\s\S]*?<\/think>/g, '');
    const openIdx = result.lastIndexOf('<think>');
    if (openIdx !== -1) {
      result = result.slice(0, openIdx);
    }
    return result.trim();
  }

  static truncate(text, maxLength = 2000) {
    if (!text) return text;
    const str = String(text);
    return str.length > maxLength ? str.slice(0, maxLength) + '...' : str;
  }

  static buildSystemPrompt(business, channel = 'web') {
    const typePrompt = BUSINESS_TYPE_PROMPTS[business.type] || BUSINESS_TYPE_PROMPTS.generic;

    let knowledgeContext = '';
    if (business.knowledgeBase) {
      const kb = business.knowledgeBase;
      knowledgeContext = `\n\nBUSINESS KNOWLEDGE BASE:\n${this.truncate(JSON.stringify(kb, null, 2), 2500)}`;
    }

    let rulesContext = '';
    if (business.rules) {
      const rules = business.rules;
      rulesContext = `\n\nBUSINESS RULES:\n${this.truncate(JSON.stringify(rules, null, 2), 1500)}`;
    }

    let hoursContext = '';
    if (business.workingHours) {
      hoursContext = `\n\nWORKING HOURS:\n${this.truncate(JSON.stringify(business.workingHours, null, 2), 800)}`;
    }

    let infoContext = '';
    const infoParts = [];
    if (business.description) infoParts.push(`Description: ${this.truncate(business.description, 1500)}`);
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

  static async getConversationHistory(conversationId, limit = 8) {
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

  static async chat(businessId, conversationId, userMessage, channel = 'web', attachmentId = null) {
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

    let attachmentContext = '';
    if (attachmentId) {
      const attachment = await prisma.attachment.findUnique({
        where: { id: attachmentId },
      });
      if (attachment) {
        const isImage = (attachment.mimeType || '').startsWith('image/');
        const fileText = await this.extractFileText(attachment);
        attachmentContext = isImage
          ? `\n\nUSER ATTACHED AN IMAGE. A VISION AI has already analyzed it and here is the accurate description of what the image shows:\n${fileText}`
          : `\n\nUSER ATTACHED A FILE — READ IT CAREFULLY:\n${fileText}`;
      }
    }

    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: userMessage + (attachmentContext ? `\n[User attached a file]` : ''),
      },
    });

    const history = await this.getConversationHistory(conversation.id);
    const systemPrompt = this.buildSystemPrompt(business, channel);

    const messages = [
      { role: 'system', content: systemPrompt },
    ];

    if (attachmentContext) {
      messages.push({ role: 'system', content: `The user has provided an attachment. You DO have access to its content via the description below - it is NOT a real file you need to open. Use it to answer the user's question accurately.\n${attachmentContext}` });
    }

    messages.push(...history);

    const model = business.aiModel || GROQ_MODEL;
    const temperature = business.temperature ?? 0.7;
    const maxTokens = business.maxTokens ?? 600;

    const callGroq = async (tokenLimit) => {
      return groq.chat.completions.create({
        model,
        messages,
        temperature,
        max_tokens: tokenLimit,
        top_p: 0.9,
      });
    };

    let completion = await callGroq(maxTokens);
    let assistantMessage = this.stripThink(completion.choices[0]?.message?.content);

    if (!assistantMessage && maxTokens < 2048) {
      completion = await callGroq(2048);
      assistantMessage = this.stripThink(completion.choices[0]?.message?.content);
    }

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

    const model = business.aiModel || GROQ_MODEL;
    const temperature = business.temperature ?? 0.7;
    const maxTokens = business.maxTokens ?? 600;

    const callGroq = async (tokenLimit) => {
      return groq.chat.completions.create({
        model,
        messages,
        temperature,
        max_tokens: tokenLimit,
      });
    };

    let completion = await callGroq(maxTokens);
    let content = this.stripThink(completion.choices[0]?.message?.content);

    if (!content && maxTokens < 2048) {
      completion = await callGroq(2048);
      content = this.stripThink(completion.choices[0]?.message?.content);
    }

    return content;
  }
}

module.exports = AIService;
