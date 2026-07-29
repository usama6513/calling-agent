const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/asyncHandler');
const https = require('https');

router.get('/', asyncHandler(async (req, res) => {
  const { text } = req.query;

  if (!text) {
    return res.status(400).json({ success: false, error: 'Text is required' });
  }

  const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=en&client=tw-ob&ttsspeed=1.5`;

  const options = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://translate.google.com/',
    },
  };

  https.get(googleTtsUrl, options, (ttsRes) => {
    if (ttsRes.statusCode !== 200) {
      console.error(`TTS proxy: Google returned ${ttsRes.statusCode}`);
      let body = '';
      ttsRes.on('data', (chunk) => { body += chunk; });
      ttsRes.on('end', () => {
        console.error(`TTS proxy error body: ${body}`);
        res.status(502).json({ success: false, error: 'TTS upstream failed' });
      });
      return;
    }
    res.set({
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'public, max-age=86400',
      'Access-Control-Allow-Origin': '*',
    });
    ttsRes.pipe(res);
  }).on('error', (err) => {
    console.error('TTS proxy error:', err.message);
    res.status(500).json({ success: false, error: 'TTS generation failed' });
  });
}));

module.exports = router;
