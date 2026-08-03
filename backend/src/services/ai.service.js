const { groq, GROQ_MODEL } = require('../config/groq');
const { GEMINI_API_KEY, GEMINI_MODELS } = require('../config/gemini');
const prisma = require('../config/db');
const mammoth = require('mammoth');
const URLScanner = require('./url-scanner.service');
const FraudScanner = require('./fraud-scanner.service');

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
- IMAGE ANALYSIS: When the user attaches an image of a leaf, plant, crop, fruit, soil, or any farm scene, use the A VISION AI description in the context to: 1) identify the crop/plant, 2) detect any disease or pest problem and its symptoms, 3) explain the benefits of that crop, and 4) give clear step-by-step prevention and treatment solutions. Reassure the farmer and suggest confirming with a local agriculture officer if unsure.
Always be practical, accurate, and clear. Use simple language that farmers and beginners can understand. Give step-by-step guidance when relevant.`,

  finance: `You are a comprehensive AI Financial Education, Fraud Detection, and Smart Budgeting expert. You help with EVERY aspect of personal and business finance.

FINANCIAL EDUCATION (full knowledge):
- Explain money, income, expenses, savings, and investments in simple terms
- Banking basics: savings accounts, current accounts, fixed deposits, Islamic banking, interest vs profit
- Credit and loans: how loans work, interest rates, EMIs, credit scores, credit cards, and how to use them safely
- Investments: stocks, mutual funds, ETFs, bonds, gold, real estate, cryptocurrency (risks and benefits of each)
- Insurance: life, health, vehicle, home insurance - why it matters and how to choose
- Retirement planning and long-term wealth building
- Taxes: income tax basics, how tax brackets work, savings/avoidance vs illegal evasion
- Financial terms explained simply: inflation, compound interest, diversification, assets vs liabilities, net worth

FRAUD DETECTION (full knowledge of all scams):
- Identify scam callers, fake SMS, phishing emails, and fake WhatsApp messages
- Common scams: bank fraud, credit card fraud, online shopping scams, investment scams (Ponzi/pyramid), lottery scams, job scams, romance scams, fake charity, identity theft
- Vishing (phone), smishing (SMS), and phishing (email) techniques and how to spot them
- Fake lottery/prize claims, fake tax refunds, fake government/court calls
- How scammers pressure victims: urgency, fear, secrecy, "act now" - always warn users
- What to do if scammed: report to bank, block card, change passwords, report to authorities, keep evidence
- How to verify legitimacy: official channels, never share OTP/PIN/CVV, verify caller identity independently
- Red flags of suspicious transactions and unusual account activity
- URL/link safety analysis: when a URL is provided, use the URL safety scan report to warn about phishing/scam links, fake login pages, and suspicious domains. Explain warning signs and advise the user what to do.
- SMS and VOICE CALL analysis: when the user pastes an SMS or describes/transcribes a phone call, use the FRAUD SCAN REPORT in the context to give a clear verdict (safe/suspicious/scam). Identify the exact scam technique (phishing, vishing, smishing, lottery scam, fake refund, courier scam, etc.) and give step-by-step instructions on what to do and what NOT to do (never share OTP/PIN/CVV/MPIN, never transfer money, verify on official channels, report the scam).

FRAUD REPORTING KNOWLEDGE (use this when a scam is confirmed and the user needs to file a complaint):
- Bank fraud: call the bank's official helpline printed on the card/statement, block the card immediately (bank app or helpline), report the fraud transaction.
- Pakistan FIA National Response Centre for Cyber Crime (NR3C): file complaint online at https://complaint.fia.gov.pk or call 1991; provide the scammer's number, message content, and screenshots.
- Pakistan Telecommunication Authority (PTA): report scam SMS/calls at https://complaint.pta.gov.pk or forward the scam SMS text to 8000 (free for mobile users).
- Police: visit the nearest police station to file a formal report (FIR); keep call logs, SMS screenshots, and bank transaction records as evidence.
- If money was already sent: immediately call the bank to try to freeze/recall the transaction, then file complaints at the bank, FIA, and police.
- State Bank of Pakistan Banking Mohtasib (SBP-BM): escalate unresolved bank complaints at http://www.bankingmohtasib.org.pk/ or via SBP Helpline 021-111-727-272.
- For other countries use that country's equivalents: e.g. in India report to 1930 (cyber crime helpline) and https://cybercrime.gov.in; in the US use ic3.gov and the FTC at reportfraud.ftc.gov; in the UK use Action Fraud at actionfraud.police.uk.

SMART BUDGETING (full knowledge):
- How to build a monthly budget from income and expenses
- 50/30/20 rule (needs/wants/savings) and other budgeting methods
- Daily expense tracking (rozana akhrajat) and how to reduce daily spending
- Fixed vs variable expenses, and how to cut unnecessary costs
- Emergency fund: how much to save (3-6 months of expenses) and why
- Debt reduction strategies: snowball and avalanche methods
- Saving plans: pay yourself first, automate savings, avoid impulse buying
- Family/household budgeting and involving the family in money decisions

FINANCIAL STABILITY SOLUTIONS:
- Best suggestions to achieve financial stability step by step
- Multiple income streams and side income ideas
- Practical savings plans for low, middle and high income earners
- How to build wealth gradually and safely
- Financial planning for students, salaried people, freelancers, business owners

EDUCATION & COURSES:
- Best courses and study paths for a career in finance (accounting, banking, fintech, data analytics, business)
- Course fees (typical ranges) and expected income/salary after each course
- Which course fits which financial goal or background
- Free vs paid learning options and reputable platforms
- Scholarships, certifications (e.g., accounting, finance, CFA/CA/FMVA-type) and career guidance

Always be practical, honest, and protective of the user. If something looks like a scam, clearly warn the user and explain why. Encourage verified official channels for financial matters. Use simple, clear language.`,

  generic: `You are a versatile AI business assistant. You can:
- Answer general business questions
- Schedule appointments and meetings
- Provide information about products and services
- Handle customer inquiries and complaints
- Escalate to human agents when needed
Always be professional, helpful, and adaptable.`,
};

const GROQ_SYSTEM_PROMPT = `LANGUAGE: Auto-detect the user's language and always reply in the SAME language the user writes in. If the user writes in Urdu, reply in Urdu. If English, reply in English. If they mix (Roman Urdu/English), match their style. Never switch to English unless the user writes in English. Keep the detected language consistent throughout the conversation.`;

const URDU_SCRIPT_RE = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;
const DEVANAGARI_RE = /[\u0900-\u097F]/;

const ROMAN_URDU_WORDS = [
  'kya', 'hai', 'hain', 'mujhe', 'mujh', 'mera', 'meri', 'mere', 'aap', 'aapko',
  'aapne', 'aapki', 'aapke', 'tum', 'tumhara', 'tumhari', 'tumhare', 'karo', 'karein',
  'karna', 'karte', 'karta', 'karti', 'nahi', 'naheen', 'bahut', 'bahot', 'tha',
  'thi', 'thein', 'hoga', 'hogi', 'honge', 'kaise', 'kaisa', 'kaisi', 'kyun', 'kyo',
  'batao', 'bataiye', 'bataye', 'batana', 'samjho', 'samjh', 'paisa', 'paise', 'abhi',
  'aaj', 'kal', 'warna', 'agar', 'lekin', 'magar', 'chahiye', 'chahie', 'apna', 'apni',
  'apne', 'achha', 'achhi', 'accha', 'theek', 'thik', 'khao', 'khana', 'jaldi', 'fori',
  'yahan', 'wahan', 'kab', 'kahan', 'kitna', 'kitne', 'bilkul', 'shukriya', 'dhanyavad',
  'madad', 'kaam', 'kam', 'toh', 'phir', 'fir', 'isliye', 'kyunki', 'kiyoonke',
  'jayega', 'jaega', 'karega', 'karegi', 'dekh', 'dekho', 'dekhna', 'suna', 'suno',
  'bol', 'bolo', 'bolna', 'puch', 'pucho', 'puchh', 'woh', 'wo', 'yeh', 'ye', 'us',
  'unki', 'unka', 'unke', 'is', 'in', 'inhe', 'unhe', 'inhein', 'zaroor', 'sab',
  'sabse', 'poora', 'poore', 'wala', 'wali', 'sakta', 'sakti', 'sakte', 'dena',
  'dijiye', 'dedo', 'lijiye', 'laga', 'lagi', 'rakho', 'rakhna', 'kiya', 'kyaa',
  'kar', 'karne', 'karo', 'baat', 'pata', 'maloom', 'samajh', 'nazar', 'dekhna',
  'khatam', 'shuru', 'se', 'ko', 'ki', 'ke', 'ka', 'mein', 'main', 'bhi', 'aur',
  'hota', 'hoti', 'hote', 'hogaya', 'hogayi', 'gaya', 'gayi', 'gai', 'jao', 'jaoge',
  'karo', 'kriye', 'kijiye', 'aa', 'aya', 'ayi', 'aaya', 'aayi', 'hai', 'hain',
];

// High-confidence words that almost never appear in English
const STRONG_URDU_WORDS = [
  'mujhe', 'mujh', 'mera', 'meri', 'mere', 'aap', 'aapko', 'aapne', 'kya', 'hai',
  'hain', 'karo', 'karein', 'nahi', 'kyun', 'kyo', 'batao', 'bataiye', 'bataye',
  'chahiye', 'chahie', 'apna', 'apni', 'apne', 'paisa', 'paise', 'abhi', 'aaj',
  'warna', 'lekin', 'magar', 'bahut', 'bahot', 'jaldi', 'fori', 'yahan', 'wahan',
  'kyunki', 'kiyoonke', 'isliye', 'shukriya', 'dhanyavad', 'madad', 'sakta', 'sakti',
  'sakte', 'jayega', 'jaega', 'karega', 'theek', 'thik', 'accha', 'achha', 'achhi',
  'samjho', 'samjh', 'bilkul', 'zaroor', 'suna', 'suno', 'bolo', 'bolna', 'puchh',
  'woh', 'yeh', 'unhein', 'inhein', 'kaise', 'kaisa', 'kaisi', 'kitna', 'kitne',
  'kahan', 'kab', 'khatam', 'shuru', 'kijiye', 'khana', 'dekho', 'dekhna', 'tumhara',
  'tumhari', 'tumhare', 'naheen', 'kiya', 'kyaa', 'hota', 'hoti', 'hote', 'rakhna',
];

function detectLanguage(text) {
  if (!text) return 'english';
  const t = String(text).trim();
  if (!t) return 'english';

  if (URDU_SCRIPT_RE.test(t)) return 'urdu';
  if (DEVANAGARI_RE.test(t)) return 'urdu';

  const words = t.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'english';

  const strongMatches = words.filter((w) => STRONG_URDU_WORDS.includes(w)).length;
  if (strongMatches >= 2) return 'urdu';
  if (strongMatches === 1 && words.length <= 6) return 'urdu';

  const allMatches = words.filter((w) => ROMAN_URDU_WORDS.includes(w)).length;
  const ratio = allMatches / words.length;
  if (ratio >= 0.18) return 'urdu';

  return 'english';
}

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
  static async describeImage(buffer, mimeType, filename, promptOverride = null) {
    if (!GEMINI_API_KEY) {
      return `[Image file provided. No vision model configured - cannot read image content.]`;
    }
    const body = {
      contents: [{
        parts: [
          { text: promptOverride || 'Describe this image in detail. Include any visible text, objects, people, crops, plants, animals, signs, or conditions shown. Be specific and factual.' },
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

  static async extractFileText(attachment, businessType = null) {
    const buffer = attachment.data;
    const mime = attachment.mimeType || '';
    const name = (attachment.filename || '').toLowerCase();

    if (mime.includes('pdf')) {
      const text = await this.extractPdfText(buffer);
      return `[Attachment: ${attachment.filename} (PDF)]\n${text}`;
    }

    if (mime.includes('docx')) {
      const result = await mammoth.extractRawText({ buffer });
      return `[Attachment: ${attachment.filename} (DOCX)]\n${result.value}`;
    }

    if (mime.includes('text') || mime.includes('json') || name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.json') || name.endsWith('.csv')) {
      const text = buffer.toString('utf8');
      return `[Attachment: ${attachment.filename}]\n${text}`;
    }

    if (mime.startsWith('image/')) {
      const promptOverride = businessType === 'agriculture'
        ? 'You are an expert agricultural analyst. Examine this image carefully. Identify: 1) What crop, plant, leaf, fruit, or soil is shown (or what farming scene). 2) If it is a leaf/plant with any disease, name the likely disease(s), symptoms visible, and pest/disease causes. 3) If it is soil, describe its likely type, color, moisture, and what it indicates. 4) List the benefits of this crop if identifiable. 5) Give practical prevention and treatment solutions a farmer can follow. Be specific and practical for farmers.'
        : 'Describe this image in detail. Include any visible text, objects, people, crops, plants, animals, signs, or conditions shown. Be specific and factual.';
      const description = await this.describeImage(buffer, mime, attachment.filename, promptOverride);
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

  static buildSystemPrompt(business, channel = 'web', userLanguage = 'auto') {
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
      : channel === 'voice'
      ? '\n\nCHANNEL: Voice (speech only) - The user is speaking to you and your answer will be READ ALOUD by a text-to-speech system. Requirements: 1) Keep the answer SHORT (under 90 words when possible). 2) Use plain conversational speech - NO bullet points, NO numbered lists, NO markdown, NO asterisks, NO emojis, NO URLs. 3) Use short, natural, easy-to-pronounce sentences. 4) Speak like a real person on a call. 5) If there are multiple steps, say "First..." then "Second..." in normal spoken words. 6) Never reveal that you are an AI - just sound natural and helpful. 7) If replying in Urdu, use proper PAKISTANI URDU - never Hindi/Hindustani vocabulary, never Devanagari script, use words like chahiye, karein, bataen, madad, paisa.'
      : channel === 'whatsapp'
      ? '\n\nCHANNEL: WhatsApp - You can use emojis moderately. Keep messages readable.'
      : '\n\nCHANNEL: Web Chat - You can use formatting for clarity.';

    let languageContext = GROQ_SYSTEM_PROMPT;
    if (userLanguage === 'urdu') {
      languageContext = `LANGUAGE: The user is speaking/writing in URDU (Urdu script or Roman Urdu). You MUST reply in URDU ONLY. Use the same script the user used (if they wrote Roman Urdu, reply in Roman Urdu; if pure Urdu script, reply in Urdu script). Do NOT reply in English. Use proper PAKISTANI URDU vocabulary and pronunciation - NEVER use Hindi/Hindustani words, Hindi script (Devanagari), or Bollywood-style Hindi expressions. Use words natural to Pakistan (e.g. 'chahiye', 'karein', 'bataen', 'madad', 'paisa', 'akhrajat'). Keep the Urdu consistent throughout the conversation.`;
    } else if (userLanguage === 'english') {
      languageContext = `LANGUAGE: The user is writing in ENGLISH. You MUST reply in ENGLISH ONLY. Do NOT reply in Urdu, Hindi, or Roman Urdu, even if some earlier messages were in another language. Keep the English consistent throughout the conversation.`;
    }

    return `${SYSTEM_PROMPT_BASE}\n\n${languageContext}\n\n${typePrompt}\n\nBUSINESS: ${business.name}${knowledgeContext}${rulesContext}${infoContext}${hoursContext}${channelContext}`;
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
        const fileText = await this.extractFileText(attachment, business.type);
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
    const userLanguage = detectLanguage(userMessage);
    const systemPrompt = this.buildSystemPrompt(business, channel, userLanguage);

    const messages = [
      { role: 'system', content: systemPrompt },
    ];

    if (attachmentContext) {
      messages.push({ role: 'system', content: `The user has provided an attachment. You DO have access to its content via the description below - it is NOT a real file you need to open. Use it to answer the user's question accurately.\n${attachmentContext}` });
    }

    const urls = URLScanner.extractUrls(userMessage);
    if (urls.length > 0) {
      const reports = [];
      for (const url of urls) {
        try {
          const report = await URLScanner.scanUrl(url);
          reports.push(report);
        } catch (error) {
          console.error(`[URL Scan] ${url} Error:`, error.message);
          reports.push({ url, verdict: 'unknown', heuristic: { score: 0, verdict: 'unknown', flags: ['Scan failed'] } });
        }
      }
      const urlScanContext = `\n\nURL SAFETY SCAN REPORT (the system scanned these URLs automatically):\n${JSON.stringify(reports, null, 2)}\n\nIf the user asked about one of these URLs, use the scan report above to give a clear verdict (safe / suspicious / scam). Explain the warning signs found and advise what to do. Reply in the user's language.`;
      messages.push({ role: 'system', content: urlScanContext });
    }

    const isFinance = business.type === 'finance';
    if (isFinance && FraudScanner.looksLikeSmsOrTranscript(userMessage)) {
      try {
        const fraudReport = await FraudScanner.scan(userMessage);
        const fraudContext = `\n\nFRAUD SCAN REPORT (the system analyzed this message as a possible SMS / voice call transcript):\n${JSON.stringify(fraudReport, null, 2)}\n\nUse this report to give a clear verdict (safe / suspicious / scam). Reply in the user's language.\n\nIf the verdict is high_risk or medium_risk (a real scam/suspicious case), your answer MUST include ALL of these:\n1) CLEAR VERDICT - state clearly this is a scam/fraud and why (list the exact warning signs found).\n2) DO NOT DO - what the user must NOT do right now (never share OTP/PIN/CVV/MPIN, never transfer money, never call the number in the message, do not install any app).\n3) IMMEDIATE ACTIONS - what the user should do right now (block the sender, don't click the link, screenshot and save evidence, change passwords if already shared).\n4) WHERE TO REPORT - the proper places to file a complaint with details:\n   - Bank: call the bank's official helpline number (printed on the card/statement) and report fraud; block the card via the bank app or helpline.\n   - Pakistan FIA National Response Centre for Cyber Crime (NR3C): report at https://complaint.fia.gov.pk or call 1991 (from a mobile) - give incident details, phone number, screenshots.\n   - Pakistan Telecommunication Authority (PTA): report scam SMS/calls via PTA Complaints Portal https://complaint.pta.gov.pk or send the SMS text to 8000 for mobile phone users.\n   - Police: file a formal complaint/report (FIR) at the nearest police station; keep the call/SMS records as evidence.\n   - If money was already transferred: immediately call the bank and ask to freeze/recall the transaction, then file a complaint.\n   - For crypto/payment app scams also report to the app's official support and the State Bank of Pakistan Banking Mohtasib if bank-related.\n5) BEST PROTECTION - the best ways to avoid this scam in future (never trust unsolicited calls/SMS, verify on official channels, never share OTP, install trusted security apps, enable two-factor authentication, block unknown callers).\n6) REASSURE - end with a reassuring note that they did the right thing by checking with you and they are not alone; this is a very common scam.\n\nKeep the structure clear and easy to follow, using short sections. Reply in the same language the user used.`;
        messages.push({ role: 'system', content: fraudContext });
      } catch (error) {
        console.error('[Fraud Scan] Error:', error.message);
      }
    }

    messages.push(...history);

    const model = business.aiModel || GROQ_MODEL;
    const temperature = business.temperature ?? 0.7;
    let maxTokens = business.maxTokens ?? 600;
    if (maxTokens < 1400 && messages.some((m) => m.role === 'system' && m.content.startsWith('\n\nFRAUD SCAN REPORT'))) {
      maxTokens = 1400;
    }

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
    const userLanguage = detectLanguage(prompt);
    const systemPrompt = this.buildSystemPrompt(business, 'web', userLanguage);

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
