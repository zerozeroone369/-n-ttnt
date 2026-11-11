import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SESSIONS_FILE = process.env.SESSIONS_FILE || path.join(__dirname, 'data', 'sessions.json');
const REVOKED_FILE = `${SESSIONS_FILE}.revoked.json`;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Active session tokens persisted across restarts (token -> { token, user, expiresAt })
const activeSessions = new Map();
const revokedTokenHashes = new Map();

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

function getSigningKey() {
  const envSecret = String(
    process.env.AUTH_SECRET || process.env.SESSION_SECRET || ''
  ).trim();
  if (envSecret) {
    return crypto.createHash('sha256').update(envSecret).digest();
  }
  const adminUser = db.findOne('users', u => u.role === 'admin') || db.get('users')?.[0];
  const seedMaterial = [
    adminUser?.id || 'snn_user',
    adminUser?.salt || '',
    adminUser?.passwordHash || '',
    String(process.env.ZENROWS_API_KEY || ''),
    String(process.env.GEMINI_API_KEY || '')
  ].join('|');
  return crypto.createHash('sha256').update(seedMaterial).digest();
}

function signTokenPayload(payloadB64) {
  return crypto.createHmac('sha256', getSigningKey()).update(payloadB64).digest('base64url');
}

function verifyStatelessToken(token) {
  if (typeof token !== 'string' || !token.startsWith('snn1.')) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [, payloadB64, sigB64] = parts;
  if (!payloadB64 || !sigB64) return null;

  try {
    const expectedSig = signTokenPayload(payloadB64);
    const sigBuf = Buffer.from(sigB64, 'utf8');
    const expBuf = Buffer.from(expectedSig, 'utf8');
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (!payload?.uid || Number(payload.exp) <= Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function saveRevokedTokens() {
  try {
    const dir = path.dirname(REVOKED_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const now = Date.now();
    const entries = [];
    for (const [tokenHash, exp] of revokedTokenHashes.entries()) {
      if (Number(exp) > now) {
        entries.push({ tokenHash, exp });
      } else {
        revokedTokenHashes.delete(tokenHash);
      }
    }
    const tmpFile = `${REVOKED_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(entries, null, 2), 'utf-8');
    fs.renameSync(tmpFile, REVOKED_FILE);
  } catch (err) {
    console.warn('[Auth] Failed to save revoked tokens:', err.message);
  }
}

function loadRevokedTokens() {
  try {
    if (!fs.existsSync(REVOKED_FILE)) return;
    const raw = fs.readFileSync(REVOKED_FILE, 'utf-8').replace(/^\uFEFF/, '');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    const now = Date.now();
    for (const row of parsed) {
      if (row?.tokenHash && Number(row.exp) > now) {
        revokedTokenHashes.set(row.tokenHash, Number(row.exp));
      }
    }
  } catch {
    // Ignore invalid file
  }
}

function isTokenRevoked(token) {
  if (!token) return true;
  const th = hashToken(token);
  const exp = revokedTokenHashes.get(th);
  if (!exp) return false;
  if (Date.now() > exp) {
    revokedTokenHashes.delete(th);
    return false;
  }
  return true;
}

loadRevokedTokens();

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
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payloadObj = {
    uid: user.id,
    role: user.role,
    exp: expiresAt,
    jti: crypto.randomBytes(12).toString('hex')
  };
  const payloadB64 = Buffer.from(JSON.stringify(payloadObj), 'utf8').toString('base64url');
  const token = `snn1.${payloadB64}.${signTokenPayload(payloadB64)}`;
  const sessionData = {
    token,
    user: sanitizeUserForSession(user),
    expiresAt
  };
  activeSessions.set(token, sessionData);
  saveSessions();
  return sessionData;
}

export function getSession(token) {
  if (!token || isTokenRevoked(token)) {
    activeSessions.delete(token);
    return null;
  }

  const session = activeSessions.get(token);
  if (session) {
    if (Date.now() > session.expiresAt) {
      activeSessions.delete(token);
      saveSessions();
      return null;
    }

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

  // Stateless HMAC fallback across container restarts / ephemeral sessions.json resets
  const verifiedPayload = verifyStatelessToken(token);
  if (!verifiedPayload) return null;

  const dbUser = db.findOne('users', u => u.id === verifiedPayload.uid);
  if (!dbUser) return null;

  const restoredSession = {
    token,
    user: sanitizeUserForSession(dbUser),
    expiresAt: Number(verifiedPayload.exp)
  };
  activeSessions.set(token, restoredSession);
  return restoredSession;
}

export function destroySession(token) {
  if (!token) return;
  const parsed = verifyStatelessToken(token);
  const exp = parsed?.exp ? Number(parsed.exp) : (Date.now() + SESSION_TTL_MS);
  revokedTokenHashes.set(hashToken(token), exp);
  saveRevokedTokens();
  if (activeSessions.delete(token)) {
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
