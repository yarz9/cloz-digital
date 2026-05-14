import crypto from 'crypto';

const tokens = new Set();

export function generateToken() {
  const token = crypto.randomBytes(32).toString('hex');
  tokens.add(token);
  return token;
}

export function revokeToken(token) {
  tokens.delete(token);
}

export function auth(req, res, next) {
  const token = req.headers['x-auth-token'];
  if (!token || !tokens.has(token)) {
    return res.status(401).json({ error: 'Unauthorized', needsAuth: true });
  }
  next();
}
