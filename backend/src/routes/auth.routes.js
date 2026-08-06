const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const prisma = require('../config/db');
const asyncHandler = require('../middleware/asyncHandler');
const { protect } = require('../middleware/auth.middleware');
const {
  hashPassword,
  verifyPassword,
  signAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  getUserById,
  REFRESH_EXPIRES_DAYS,
} = require('../services/auth.service');

// Login rate limiting: max 5 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many login attempts. Please try again in 15 minutes.' },
});

// Refresh rate limiting
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many refresh requests. Please login again.' },
});

function setRefreshCookie(res, token, expiresAt) {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: expiresAt.getTime() - Date.now(),
    path: '/api/auth',
  });
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
}

// POST /api/auth/login
router.post('/login', loginLimiter, asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required' });
  }

  const user = await prisma.user.findUnique({ where: { email: String(email).toLowerCase().trim() } });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ success: false, error: 'Invalid email or password' });
  }
  if (!user.isActive) {
    return res.status(403).json({ success: false, error: 'Account is disabled. Contact an administrator.' });
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  const accessToken = signAccessToken(user);
  const { raw: refreshToken, expiresAt } = await issueRefreshToken(user, req);
  setRefreshCookie(res, refreshToken, expiresAt);

  res.json({ success: true, data: { accessToken, expiresAt, user: publicUser(user) } });
}));

// POST /api/auth/register — only first user (bootstrap) or admin can register
router.post('/register', asyncHandler(async (req, res) => {
  const { email, password, name, role } = req.body;

  const existing = await prisma.user.findMany({ take: 1 });
  if (existing.length > 0) {
    // Require admin token for additional users
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    let payload = null;
    try {
      payload = require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
    } catch (e) { /* ignore */ }
    const adminUser = payload ? await getUserById(payload.sub) : null;
    if (!adminUser || adminUser.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Only an admin can create users' });
    }
  }

  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required' });
  }
  if (String(password).length < 8) {
    return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, error: 'Invalid email address' });
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  const dup = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (dup) {
    return res.status(409).json({ success: false, error: 'A user with this email already exists' });
  }

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash: hashPassword(password),
      name: name || null,
      role: role === 'admin' ? 'admin' : 'manager',
    },
  });

  res.status(201).json({ success: true, data: { user: publicUser(user) } });
}));

// POST /api/auth/refresh — rotates the refresh token
router.post('/refresh', refreshLimiter, asyncHandler(async (req, res) => {
  const raw = req.cookies?.refreshToken;
  if (!raw) {
    return res.status(401).json({ success: false, error: 'No refresh token provided' });
  }

  const result = await rotateRefreshToken(raw);
  if (!result) {
    res.clearCookie('refreshToken', { path: '/api/auth' });
    return res.status(401).json({ success: false, error: 'Invalid or expired refresh token' });
  }

  const { user, raw: newRefreshToken, expiresAt } = result;
  const accessToken = signAccessToken(user);
  setRefreshCookie(res, newRefreshToken, expiresAt);

  res.json({ success: true, data: { accessToken, expiresAt, user: publicUser(user) } });
}));

// POST /api/auth/logout
router.post('/logout', asyncHandler(async (req, res) => {
  const raw = req.cookies?.refreshToken;
  if (raw) {
    await revokeRefreshToken(raw);
  }
  res.clearCookie('refreshToken', { path: '/api/auth' });
  res.json({ success: true });
}));

// GET /api/auth/me — returns current user from access token
router.get('/me', protect, asyncHandler(async (req, res) => {
  res.json({ success: true, data: { user: publicUser(req.user) } });
}));

// POST /api/auth/change-password — requires current password
router.post('/change-password', protect, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, error: 'Current and new passwords are required' });
  }
  if (String(newPassword).length < 8) {
    return res.status(400).json({ success: false, error: 'New password must be at least 8 characters' });
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!verifyPassword(currentPassword, user.passwordHash)) {
    return res.status(401).json({ success: false, error: 'Current password is incorrect' });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: hashPassword(newPassword) },
  });

  res.json({ success: true, message: 'Password updated successfully' });
}));

module.exports = router;
