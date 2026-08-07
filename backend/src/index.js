require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const errorHandler = require('./middleware/errorHandler');
const { protect } = require('./middleware/auth.middleware');

const authRoutes = require('./routes/auth.routes');
const chatRoutes = require('./routes/chat.routes');
const businessRoutes = require('./routes/business.routes');
const conversationRoutes = require('./routes/conversation.routes');
const appointmentRoutes = require('./routes/appointment.routes');
const webhookRoutes = require('./routes/webhook.routes');
const whatsappRoutes = require('./routes/whatsapp.routes');
const phoneRoutes = require('./routes/phone.routes');
const ttsRoutes = require('./routes/tts.routes');
const modelsRoutes = require('./routes/models.routes');
const attachmentRoutes = require('./routes/attachment.routes');
const voiceRoutes = require('./routes/voice.routes');

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(helmet());

// Path-aware CORS:
//  - /api/auth/* → restricted to allowedOrigins (dashboard) with credentials for refresh-cookie flow
//  - everything else → reflect origin with credentials so the dashboard (which sends credentials: include)
//    works, and the customer-facing widget still works on any website (its origin is echoed back too)
app.use((req, res, next) => {
  const isAuthRoute = req.path.startsWith('/api/auth');

  if (isAuthRoute) {
    return cors({
      origin: (o, cb) => {
        if (!o || allowedOrigins.length === 0 || allowedOrigins.includes(o)) return cb(null, true);
        return cb(new Error('Not allowed by CORS'));
      },
      credentials: true,
      maxAge: 0,
    })(req, res, next);
  }

  return cors({
    origin: (o, cb) => cb(null, o || true),
    credentials: true,
    maxAge: 0,
  })(req, res, next);
});
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/', (req, res) => {
  res.json({
    message: 'AI Business Calling Agent API',
    version: '1.0.0',
    status: 'running',
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);

// Public (customer/widget-facing): chat, voice, tts, webhook, uploads, attachment view, conversation history
app.use('/api/chat', chatRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/tts', ttsRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api', attachmentRoutes);
app.use('/api/conversations', conversationRoutes);

// Admin-protected routes
app.use('/api/business', protect, businessRoutes);
app.use('/api/appointments', protect, appointmentRoutes);
app.use('/api/phone', protect, phoneRoutes);
app.use('/api/groq/models', protect, modelsRoutes);

// WhatsApp: incoming webhook is public (Twilio calls it), everything else protected
app.use('/api/whatsapp', (req, res, next) => {
  if (req.path === '/incoming' || req.path === '/incoming/') {
    return next();
  }
  return protect(req, res, next);
}, whatsappRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

app.use(errorHandler);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n🚀 Calling Agent Server running on port ${PORT}`);
    console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🤖 AI Model: ${process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'}`);
    console.log(`📊 API: http://localhost:${PORT}`);
    console.log(`💚 Health: http://localhost:${PORT}/health\n`);
  });
}

module.exports = app;
