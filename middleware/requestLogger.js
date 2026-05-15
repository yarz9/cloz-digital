import { logAPI, logError, extractRequestContext } from '../services/logger.js';

// ══════════════════════════════════════════════════════════════
//  REQUEST LOGGER MIDDLEWARE — Captures all API requests
// ══════════════════════════════════════════════════════════════

// Routes to skip logging (high frequency, low value)
const SKIP_ROUTES = ['/health', '/api/health', '/favicon.ico'];
const SKIP_PREFIXES = ['/assets/', '/dist/'];

export function requestLoggerMiddleware(req, res, next) {
  // Skip static files and health checks
  const url = req.originalUrl || req.url;
  if (SKIP_ROUTES.includes(url) || SKIP_PREFIXES.some(p => url.startsWith(p))) {
    return next();
  }

  // Only log API routes
  if (!url.startsWith('/api/')) {
    return next();
  }

  const start = Date.now();
  const context = extractRequestContext(req);

  // Intercept response to capture status code
  const originalEnd = res.end;
  res.end = function (...args) {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    const success = statusCode < 400;

    // Log after response completes (async, non-blocking)
    setImmediate(() => {
      const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warning' : 'info';

      if (level === 'error') {
        logError(`${req.method} ${url} → ${statusCode} (${duration}ms)`, {
          ...context,
          duration_ms: duration,
          status_code: statusCode,
          event_type: 'api_request',
          action: `${req.method} ${url.split('?')[0]}`,
        });
      } else {
        logAPI(`${req.method} ${url} → ${statusCode} (${duration}ms)`, {
          ...context,
          duration_ms: duration,
          status_code: statusCode,
          success,
          level,
          action: `${req.method} ${url.split('?')[0]}`,
        });
      }
    });

    originalEnd.apply(res, args);
  };

  next();
}

/**
 * Error logging middleware — captures unhandled errors.
 */
export function errorLoggerMiddleware(err, req, res, next) {
  const context = extractRequestContext(req);

  logError(`Unhandled error: ${err.message}`, {
    ...context,
    event_type: 'unhandled_error',
    error_code: err.code || 'UNKNOWN',
    stack_trace: err.stack || '',
    status_code: err.status || 500,
  });

  next(err);
}
