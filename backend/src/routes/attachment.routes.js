const express = require('express');
const router = express.Router();
const multer = require('multer');
const prisma = require('../config/db');
const asyncHandler = require('../middleware/asyncHandler');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.post('/upload', upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }

  const { conversationId } = req.body;

  if (!conversationId) {
    return res.status(400).json({ success: false, error: 'conversationId is required' });
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    return res.status(400).json({ success: false, error: 'Conversation not found' });
  }

  const attachment = await prisma.attachment.create({
    data: {
      conversationId,
      filename: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      data: req.file.buffer,
    },
  });

  res.json({
    success: true,
    data: {
      id: attachment.id,
      filename: attachment.filename,
      mimeType: attachment.mimeType,
      size: attachment.size,
      url: `/api/attachments/${attachment.id}`,
    },
  });
}));

router.get('/attachments/:id', asyncHandler(async (req, res) => {
  const attachment = await prisma.attachment.findUnique({
    where: { id: req.params.id },
  });

  if (!attachment) {
    return res.status(404).json({ success: false, error: 'Attachment not found' });
  }

  res.set({
    'Content-Type': attachment.mimeType,
    'Content-Disposition': `inline; filename="${attachment.filename}"`,
    'Content-Length': attachment.data.length,
  });
  res.send(attachment.data);
}));

module.exports = router;
