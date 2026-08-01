const express = require('express');
const router = express.Router();
const groq = require('groq-sdk');
const asyncHandler = require('../middleware/asyncHandler');

const client = new groq({
  apiKey: process.env.GROQ_API_KEY,
});

const CHAT_EXCLUDE = ['whisper', 'prompt-guard', 'safeguard', 'orpheus', 'compound'];

const isChatModel = (id) => {
  const lower = id.toLowerCase();
  return !CHAT_EXCLUDE.some((term) => lower.includes(term));
};

const formatModelName = (id) => {
  const cleaned = id.replace(/^[^/]+\//, '');
  const parts = cleaned.split('-');
  const capitalized = parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
  return capitalized.length > 40 ? id : capitalized;
};

router.get('/', asyncHandler(async (req, res) => {
  const response = await client.models.list();
  const raw = response.data || [];

  const models = raw
    .filter((m) => isChatModel(m.id))
    .map((m) => ({
      id: m.id,
      name: formatModelName(m.id),
      created: m.created,
      owned_by: m.owned_by || '',
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  res.json({ success: true, data: models });
}));

module.exports = router;
