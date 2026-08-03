const express = require('express');
const router = express.Router();
const multer = require('multer');
const https = require('https');
const asyncHandler = require('../middleware/asyncHandler');
const { groq } = require('../config/groq');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

function detectTtsLang(text) {
  const urduScript = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;
  if (urduScript.test(text)) return 'ur';
  const urduWords = /\b(kya|hai|hain|mujhe|mera|meri|aap|aapko|karo|karein|nahi|kyun|batao|chahiye|apna|paisa|kaise|hoga|hogi|theek|accha|woh|yeh|ko|ki|ka|se|mein|main|bhi|aur|tum)\b/i;
  const words = text.split(/\s+/).filter(Boolean);
  const matches = words.filter((w) => urduWords.test(w)).length;
  if (words.length > 0 && matches / words.length >= 0.15) return 'ur';
  return 'en';
}

const DEVANAGARI_RE = /[\u0900-\u097F]/;
const URDU_SCRIPT_RE = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;

function isDevanagari(text) {
  return DEVANAGARI_RE.test(text);
}

function isUrduScript(text) {
  return URDU_SCRIPT_RE.test(text);
}

function hasRomanUrdu(text) {
  const urduWords = /\b(kya|hai|hain|mujhe|mera|meri|aap|aapko|karo|karein|nahi|kyun|batao|chahiye|apna|paisa|kaise|hoga|hogi|theek|accha|woh|yeh|ko|ki|ka|se|mein|main|bhi|aur|tum|maamla|zindagi|mushkil)\b/i;
  const words = text.split(/\s+/).filter(Boolean);
  const matches = words.filter((w) => urduWords.test(w)).length;
  return words.length > 0 && matches / words.length >= 0.1;
}

router.post('/transcribe', upload.single('audio'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No audio file uploaded' });
  }

  try {
    const file = req.file;
    const FileCtor = typeof File !== 'undefined' ? File : (require('buffer').File || require('node:buffer').File);
    const audioFile = new FileCtor([file.buffer], file.originalname || 'voice.webm', { type: file.mimetype || 'audio/webm' });

    let response = await groq.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-large-v3',
      response_format: 'json',
    });

    let text = response.text || '';

    if (text && isDevanagari(text)) {
      response = await groq.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-large-v3',
        response_format: 'json',
        language: 'ur',
        prompt: 'This is Pakistani Urdu speech. Write the transcript in Urdu script.',
      });
      text = response.text || '';
    }

    res.json({
      success: true,
      data: { text: text || '' },
    });
  } catch (error) {
    console.error('[Voice Transcribe] Error:', error.message);
    res.status(500).json({ success: false, error: 'Speech recognition failed' });
  }
}));

function splitText(text, maxLen = 180) {
  const clean = String(text).replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLen) return [clean];
  const chunks = [];
  let current = '';
  const sentences = clean.split(/(?<=[.!?।؟])\s+|(?<=[,;])\s+/);
  for (const part of sentences) {
    if ((current + ' ' + part).trim().length <= maxLen) {
      current = (current + ' ' + part).trim();
    } else {
      if (current) chunks.push(current);
      const words = part.split(/\s+/);
      current = '';
      for (const w of words) {
        if ((current + ' ' + w).trim().length > maxLen && current) {
          chunks.push(current.trim());
          current = w;
        } else {
          current = (current + ' ' + w).trim();
        }
      }
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

const googleAgent = new https.Agent({ keepAlive: true, maxSockets: 10 });

function googleTts(text, language) {
  return new Promise((resolve, reject) => {
    const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${language}&client=tw-ob&ttsspeed=1.3`;
    const options = {
      agent: googleAgent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://translate.google.com/',
      },
    };
    https.get(googleTtsUrl, options, (ttsRes) => {
      const chunks = [];
      ttsRes.on('data', (c) => chunks.push(c));
      ttsRes.on('end', () => {
        if (ttsRes.statusCode !== 200) {
          reject(new Error(`Google TTS returned ${ttsRes.statusCode}`));
          return;
        }
        resolve(Buffer.concat(chunks));
      });
    }).on('error', reject);
  });
}

const ttsCache = new Map();
const TTS_CACHE_MAX = 200;

function getSynthesizeInput(req) {
  if (req.method === 'GET') {
    return { text: req.query.text, lang: req.query.lang };
  }
  return { text: req.body.text, lang: req.body.lang };
}

async function handleSynthesize(req, res) {
  const { text, lang } = getSynthesizeInput(req);

  if (!text) {
    return res.status(400).json({ success: false, error: 'Text is required' });
  }

  const language = lang || detectTtsLang(text);
  const chunks = splitText(text);

  const cacheKey = `${language}:${chunks.join('|')}`;
  const cached = ttsCache.get(cacheKey);
  if (cached) {
    res.set({
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
      'Content-Length': cached.length,
    });
    return res.send(cached);
  }

  res.set({
    'Content-Type': 'audio/mpeg',
    'Cache-Control': 'no-cache',
    'Access-Control-Allow-Origin': '*',
  });
  res.flushHeaders();

  const buffers = [];

  try {
    if (chunks.length > 0) {
      const first = await googleTts(chunks[0], language);
      if (first.length > 1000) {
        buffers.push(first);
        res.write(first);
      }
    }

    const restResults = await Promise.all(chunks.slice(1).map(async (chunk) => {
      try {
        const buf = await googleTts(chunk, language);
        return buf.length > 1000 ? buf : null;
      } catch (err) {
        console.error(`TTS chunk failed (${language}):`, err.message);
        return null;
      }
    }));

    for (const buf of restResults) {
      if (buf) {
        buffers.push(buf);
        res.write(buf);
      }
    }

    res.end();
    if (buffers.length > 0) {
      ttsCache.set(cacheKey, Buffer.concat(buffers));
      if (ttsCache.size > TTS_CACHE_MAX) {
        const firstKey = ttsCache.keys().next().value;
        ttsCache.delete(firstKey);
      }
    }
  } catch (error) {
    console.error('TTS error:', error.message);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, error: 'TTS generation failed' });
    }
    res.end();
  }
}

router.get('/synthesize', asyncHandler(handleSynthesize));
router.post('/synthesize', asyncHandler(handleSynthesize));

module.exports = router;
