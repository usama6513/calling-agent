const GEMINI_API_KEY = process.env.GOOGLE_API_KEY || '';
const GEMINI_MODELS = (process.env.GEMINI_MODELS || 'gemini-flash-latest,gemini-2.0-flash,gemini-2.5-pro')
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);

module.exports = { GEMINI_API_KEY, GEMINI_MODELS };
