import crypto from 'crypto';

// ── Management Two-Step Authentication ──
// Step 1: MANAGEMENT_PASSWORD_STEP_1 (default: admin123)
// Step 2: MANAGEMENT_PASSWORD_STEP_2 (default: admin321)
// Both steps must be completed to access /management routes.

const sessions = new Map(); // sessionId → { step, completedAt, expiresAt }

const SESSION_TTL = 24 * 60 * 60 * 1000; // 24 hours
const STEP1_TTL = 5 * 60 * 1000;         // 5 min to complete step 2

export function createSession() {
  const id = crypto.randomBytes(32).toString('hex');
  sessions.set(id, {
    step: 1,
    completedAt: Date.now(),
    expiresAt: Date.now() + STEP1_TTL,
  });
  return id;
}

export function completeStep2(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return false;
  session.step = 2;
  session.completedAt = Date.now();
  session.expiresAt = Date.now() + SESSION_TTL;
  return true;
}

export function validateSession(sessionId) {
  if (!sessionId) return { valid: false, step: 0 };
  const session = sessions.get(sessionId);
  if (!session) return { valid: false, step: 0 };
  if (Date.now() > session.expiresAt) {
    sessions.delete(sessionId);
    return { valid: false, step: 0 };
  }
  return { valid: session.step === 2, step: session.step };
}

export function getSessionStep(sessionId) {
  if (!sessionId) return 0;
  const session = sessions.get(sessionId);
  if (!session) return 0;
  if (Date.now() > session.expiresAt) {
    sessions.delete(sessionId);
    return 0;
  }
  return session.step;
}

export function destroySession(sessionId) {
  sessions.delete(sessionId);
}

// Cleanup expired sessions every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now > session.expiresAt) sessions.delete(id);
  }
}, 10 * 60 * 1000);

// Express middleware — checks management session cookie
export function managementAuth(req, res, next) {
  const sessionId = req.cookies?.mgmt_session;
  const { valid } = validateSession(sessionId);
  if (!valid) {
    return res.status(401).json({ error: 'Management authentication required', needsAuth: true });
  }
  next();
}
