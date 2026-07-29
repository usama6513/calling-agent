require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const errorHandler = require('./middleware/errorHandler');

const chatRoutes = require('./routes/chat.routes');
const businessRoutes = require('./routes/business.routes');
const conversationRoutes = require('./routes/conversation.routes');
const appointmentRoutes = require('./routes/appointment.routes');
const webhookRoutes = require('./routes/webhook.routes');
const whatsappRoutes = require('./routes/whatsapp.routes');
const phoneRoutes = require('./routes/phone.routes');
const ttsRoutes = require('./routes/tts.routes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors({
  origin: '*',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

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

app.use('/api/chat', chatRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/phone', phoneRoutes);
app.use('/api/tts', ttsRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`\n🚀 Calling Agent Server running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🤖 AI Model: ${process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'}`);
  console.log(`📊 API: http://localhost:${PORT}`);
  console.log(`💚 Health: http://localhost:${PORT}/health\n`);
});

module.exports = app;
