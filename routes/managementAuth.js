import { Router } from 'express';
import { authLimiter } from '../middleware/rateLimit.js';
import {
  createSession,
  completeStep2,
  validateSession,
  getSessionStep,
  destroySession,
} from '../middleware/managementAuth.js';

const router = Router();

const STEP_1_PASS = () => process.env.MANAGEMENT_PASSWORD_STEP_1 || 'admin123';
const STEP_2_PASS = () => process.env.MANAGEMENT_PASSWORD_STEP_2 || 'admin321';

// ── Step 1: First password ──
router.post('/step-1', authLimiter, (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password required' });
  if (password !== STEP_1_PASS()) {
    return res.status(401).json({ error: 'Invalid password' });
  }
  const sessionId = createSession();
  res.cookie('mgmt_session', sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 5 * 60 * 1000, // 5 min until step 2 completed
    path: '/',
  });
  res.json({ ok: true, step: 1 });
});

// ── Step 2: Second password ──
router.post('/step-2', authLimiter, (req, res) => {
  const sessionId = req.cookies?.mgmt_session;
  const step = getSessionStep(sessionId);
  if (step !== 1) {
    return res.status(401).json({ error: 'Complete step 1 first' });
  }
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password required' });
  if (password !== STEP_2_PASS()) {
    return res.status(401).json({ error: 'Invalid password' });
  }
  completeStep2(sessionId);
  // Extend cookie to full session TTL
  res.cookie('mgmt_session', sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
    path: '/',
  });
  res.json({ ok: true, step: 2, authenticated: true });
});

// ── Check auth status ──
router.get('/status', (req, res) => {
  const sessionId = req.cookies?.mgmt_session;
  const { valid, step } = validateSession(sessionId);
  res.json({ authenticated: valid, step });
});

// ── Logout ──
router.post('/logout', (req, res) => {
  const sessionId = req.cookies?.mgmt_session;
  if (sessionId) destroySession(sessionId);
  res.clearCookie('mgmt_session', { path: '/' });
  res.json({ ok: true });
});

export default router;
