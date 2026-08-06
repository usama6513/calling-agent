const jwt = require('jsonwebtoken');
const { getUserById } = require('../services/auth.service');

const JWT_SECRET = process.env.JWT_SECRET;

function extractToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  return null;
}

// Protects admin-only routes. Requires a valid access token.
const protect = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }

    const user = await getUserById(payload.sub);
    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }
    if (!user.isActive) {
      return res.status(403).json({ success: false, error: 'Account is disabled' });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

// Restricts route to specific roles. Must run after `protect`.
const restrictTo = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, error: 'You do not have permission to perform this action' });
  }
  next();
};

module.exports = { protect, restrictTo };
