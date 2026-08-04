const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';

const OPENROUTER_MODELS = (process.env.OPENROUTER_MODELS || 'openrouter/free,google/gemma-4-31b-it:free,nvidia/nemotron-3-super-120b-a12b:free')
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);

module.exports = { OPENROUTER_API_KEY, OPENROUTER_MODELS };
