const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const prisma = require('../config/db');
const asyncHandler = require('../middleware/asyncHandler');
const { protect, restrictTo } = require('../middleware/auth.middleware');
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

// Login rate limiting: counts only FAILED attempts (successful logins don't
// accumulate toward the limit) — max 10 failures per 15 minutes per IP.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
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

// POST /api/auth/register — open signup for manager/agent roles. Admin is never
// created via signup; the very first account in the system is bootstrapped as admin.
router.post('/register', asyncHandler(async (req, res) => {
  const { email, password, name, role } = req.body;

  const existing = await prisma.user.findMany({ take: 1 });

  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required' });
  }
  if (String(password).length < 8) {
    return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, error: 'Invalid email address' });
  }

  // Self-signup can never create an admin. First user is bootstrapped as admin.
  let resolvedRole;
  if (existing.length === 0) {
    resolvedRole = 'admin';
  } else {
    resolvedRole = role === 'agent' ? 'agent' : 'manager';
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
      role: resolvedRole,
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

// ===== User Management (admin only) =====

// GET /api/auth/users/exists — public check if any user exists (for signup bootstrap)
router.get('/users/exists', asyncHandler(async (req, res) => {
  const count = await prisma.user.count();
  res.json({ success: true, data: { exists: count > 0 } });
}));

// GET /api/auth/users — list all users
router.get('/users', protect, restrictTo('admin'), asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      _count: { select: { refreshTokens: true } },
    },
  });

  const safeUsers = users.map((u) => ({ ...u, _count: undefined, activeSessions: u._count.refreshTokens }));
  res.json({ success: true, data: safeUsers });
}));

// POST /api/auth/users — admin creates a new user
router.post('/users', protect, restrictTo('admin'), asyncHandler(async (req, res) => {
  const { email, password, name, role } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required' });
  }
  if (String(password).length < 8) {
    return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, error: 'Invalid email address' });
  }
  const allowedRoles = ['admin', 'manager', 'agent'];
  if (role && !allowedRoles.includes(role)) {
    return res.status(400).json({ success: false, error: 'Invalid role. Allowed: admin, manager, agent' });
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
      role: role || 'manager',
    },
  });

  res.status(201).json({ success: true, data: { user: publicUser(user) } });
}));

// PUT /api/auth/users/:id — admin updates user (role, name, active status)
router.put('/users/:id', protect, restrictTo('admin'), asyncHandler(async (req, res) => {
  const { name, role, isActive } = req.body;
  const targetId = req.params.id;

  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  // Prevent admin from disabling/demoting themselves
  if (targetId === req.user.id && (isActive === false || (role && role !== 'admin'))) {
    return res.status(400).json({ success: false, error: 'You cannot disable or demote your own account' });
  }

  const allowedRoles = ['admin', 'manager', 'agent'];
  if (role && !allowedRoles.includes(role)) {
    return res.status(400).json({ success: false, error: 'Invalid role. Allowed: admin, manager, agent' });
  }

  const updated = await prisma.user.update({
    where: { id: targetId },
    data: {
      ...(name !== undefined ? { name: name || null } : {}),
      ...(role !== undefined ? { role } : {}),
      ...(isActive !== undefined ? { isActive: !!isActive } : {}),
    },
  });

  // If user is disabled, revoke all their sessions
  if (isActive === false) {
    await prisma.refreshToken.updateMany({
      where: { userId: targetId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  res.json({ success: true, data: { user: publicUser(updated) } });
}));

// DELETE /api/auth/users/:id — admin removes a user
router.delete('/users/:id', protect, restrictTo('admin'), asyncHandler(async (req, res) => {
  const targetId = req.params.id;

  if (targetId === req.user.id) {
    return res.status(400).json({ success: false, error: 'You cannot delete your own account' });
  }

  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  await prisma.refreshToken.deleteMany({ where: { userId: targetId } });
  await prisma.user.delete({ where: { id: targetId } });

  res.json({ success: true, message: 'User deleted successfully' });
}));

module.exports = router;
