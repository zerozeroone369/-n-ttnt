import crypto from 'crypto';
import { db } from './db.js';

// In-memory active session tokens (token -> { user, expiresAt })
const activeSessions = new Map();
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function createSession(user) {
  const token = crypto.randomBytes(32).toString('hex');
  const sessionData = {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone || '',
      address: user.address || '',
      city: user.city || ''
    },
    expiresAt: Date.now() + SESSION_TTL_MS
  };
  activeSessions.set(token, sessionData);
  return sessionData;
}

export function getSession(token) {
  if (!token) return null;
  const session = activeSessions.get(token);
  if (!session) return null;

  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    return null;
  }
  return session;
}

export function destroySession(token) {
  if (token) {
    activeSessions.delete(token);
  }
}

// Middleware to extract user from Authorization header
export function authenticateUser(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    const session = getSession(token);
    if (session) {
      req.user = session.user;
      req.token = token;
    }
  }
  next();
}

// Guard middleware: Requires authenticated user
export function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Yêu cầu đăng nhập để thực hiện chức năng này.' });
  }
  next();
}

// Guard middleware: Requires one of allowed roles
export function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Chưa đăng nhập.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Bạn không có quyền truy cập khu vực này.' });
    }
    next();
  };
}
