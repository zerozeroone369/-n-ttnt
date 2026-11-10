import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SESSIONS_FILE = process.env.SESSIONS_FILE || path.join(__dirname, 'data', 'sessions.json');
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Active session tokens persisted across restarts (token -> { token, user, expiresAt })
const activeSessions = new Map();

function sanitizeUserForSession(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    phone: user.phone || '',
    address: user.address || '',
    city: user.city || ''
  };
}

function saveSessions() {
  try {
    const dir = path.dirname(SESSIONS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const now = Date.now();
    const entries = [];
    for (const [token, session] of activeSessions.entries()) {
      if (session && session.expiresAt > now) {
        entries.push(session);
      } else {
        activeSessions.delete(token);
      }
    }
    const tmpFile = `${SESSIONS_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(entries, null, 2), 'utf-8');
    fs.renameSync(tmpFile, SESSIONS_FILE);
  } catch (err) {
    console.error('[Auth] Failed to persist sessions:', err);
  }
}

function loadSessions() {
  try {
    if (!fs.existsSync(SESSIONS_FILE)) return;
    const raw = fs.readFileSync(SESSIONS_FILE, 'utf-8').replace(/^\uFEFF/, '');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;

    const now = Date.now();
    let pruned = false;
    for (const session of parsed) {
      if (session?.token && session?.user?.id && Number(session.expiresAt) > now) {
        activeSessions.set(session.token, session);
      } else {
        pruned = true;
      }
    }
    if (pruned) {
      saveSessions();
    }
  } catch (err) {
    console.warn('[Auth] Could not load persisted sessions:', err.message);
  }
}

loadSessions();

export function createSession(user) {
  const token = crypto.randomBytes(32).toString('hex');
  const sessionData = {
    token,
    user: sanitizeUserForSession(user),
    expiresAt: Date.now() + SESSION_TTL_MS
  };
  activeSessions.set(token, sessionData);
  saveSessions();
  return sessionData;
}

export function getSession(token) {
  if (!token) return null;
  const session = activeSessions.get(token);
  if (!session) return null;

  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    saveSessions();
    return null;
  }

  // Ensure the user still exists in persistent database
  const dbUser = db.findOne('users', u => u.id === session.user?.id);
  if (!dbUser) {
    activeSessions.delete(token);
    saveSessions();
    return null;
  }

  return {
    ...session,
    user: sanitizeUserForSession(dbUser)
  };
}

export function destroySession(token) {
  if (token && activeSessions.delete(token)) {
    saveSessions();
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
    return res.status(401).json({ error: 'Yêu cầu đăng nhập hoặc phiên đã hết hạn.' });
  }
  next();
}

// Guard middleware: Requires one of allowed roles
export function requireRole(allowedRoles = []) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Chưa đăng nhập hoặc phiên đã hết hạn.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Bạn không có quyền truy cập khu vực này.' });
    }
    next();
  };
}
