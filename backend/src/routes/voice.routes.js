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

router.post('/transcribe', upload.single('audio'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No audio file uploaded' });
  }

  try {
    const file = req.file;
    const FileCtor = typeof File !== 'undefined' ? File : (require('buffer').File || require('node:buffer').File);
    const audioFile = new FileCtor([file.buffer], file.originalname || 'voice.webm', { type: file.mimetype || 'audio/webm' });
    const response = await groq.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-large-v3',
      response_format: 'json',
    });
    res.json({
      success: true,
      data: { text: response.text || '' },
    });
  } catch (error) {
    console.error('[Voice Transcribe] Error:', error.message);
    res.status(500).json({ success: false, error: 'Speech recognition failed' });
  }
}));

router.post('/synthesize', asyncHandler(async (req, res) => {
  const { text, lang } = req.body;

  if (!text) {
    return res.status(400).json({ success: false, error: 'Text is required' });
  }

  const language = lang || detectTtsLang(text);

  const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${language}&client=tw-ob&ttsspeed=1.0`;

  const options = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://translate.google.com/',
    },
  };

  https.get(googleTtsUrl, options, (ttsRes) => {
    if (ttsRes.statusCode !== 200) {
      console.error(`TTS: Google returned ${ttsRes.statusCode}`);
      ttsRes.resume();
      return res.status(502).json({ success: false, error: 'TTS upstream failed' });
    }
    res.set({
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
    });
    ttsRes.pipe(res);
  }).on('error', (err) => {
    console.error('TTS error:', err.message);
    res.status(500).json({ success: false, error: 'TTS generation failed' });
  });
}));

module.exports = router;
