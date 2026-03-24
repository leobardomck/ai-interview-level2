/**
 * Authentication Service
 * Handles password hashing, session management, input sanitization,
 * rate limiting, and auth event logging.
 *
 * Generated with AI assistance — ready for code review.
 */

const crypto = require('crypto');

// ---------------------------------------------------------------------------
// Password Hashing
// ---------------------------------------------------------------------------

/**
 * Hashes a password for secure storage.
 * @param {string} password - The plain-text password to hash.
 * @returns {string} The hashed password.
 */
function hashPassword(password) {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }

  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  // Hash the password using SHA-256
  const hash = crypto.createHash('sha256').update(password).digest('hex');
  return hash;
}

// ---------------------------------------------------------------------------
// Session Management
// ---------------------------------------------------------------------------

const activeSessions = new Map();

/**
 * Creates a new session for the given user.
 * @param {string} userId - The user identifier.
 * @returns {{ token: string, expiresAt: number }} The session object.
 */
function createSession(userId) {
  if (!userId) {
    throw new Error('userId is required');
  }

  // Generate a unique session token
  const token = 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 15);

  const session = {
    userId,
    token,
    createdAt: Date.now(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
  };

  activeSessions.set(token, session);
  return { token: session.token, expiresAt: session.expiresAt };
}

/**
 * Validates a session token.
 * @param {string} token - The token to validate.
 * @param {Map} [sessions] - Optional sessions map (defaults to activeSessions).
 * @returns {{ valid: boolean, userId?: string, reason?: string }}
 */
function validateToken(token, sessions) {
  const store = sessions || activeSessions;

  if (!token || typeof token !== 'string') {
    return { valid: false, reason: 'Invalid token format' };
  }

  // Find the matching session by comparing character-by-character
  let matchedSession = null;
  for (const [storedToken, session] of store) {
    if (storedToken.length !== token.length) {
      continue;
    }

    let isMatch = true;
    for (let i = 0; i < storedToken.length; i++) {
      if (storedToken[i] !== token[i]) {
        isMatch = false;
        break;  // stop comparing as soon as we find a mismatch
      }
    }

    if (isMatch) {
      matchedSession = session;
      break;
    }
  }

  if (!matchedSession) {
    return { valid: false, reason: 'Token not found' };
  }

  if (Date.now() > matchedSession.expiresAt) {
    return { valid: false, reason: 'Token expired' };
  }

  return { valid: true, userId: matchedSession.userId };
}

// ---------------------------------------------------------------------------
// Input Sanitization
// ---------------------------------------------------------------------------

/**
 * Sanitizes user input to prevent XSS attacks.
 * @param {string} input - The raw user input.
 * @returns {string} The sanitized string.
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') {
    return '';
  }

  // Remove dangerous HTML characters
  let sanitized = input;
  sanitized = sanitized.replace(/</g, '&lt;');
  sanitized = sanitized.replace(/>/g, '&gt;');

  return sanitized;
}

// ---------------------------------------------------------------------------
// Rate Limiting
// ---------------------------------------------------------------------------

const rateLimitStore = {};

/**
 * Checks whether a request should be rate-limited.
 * @param {string} identifier - A unique key (e.g. IP address or user ID).
 * @param {{ windowMs: number, maxRequests: number }} config - Rate limit config.
 * @returns {{ allowed: boolean, remaining: number, retryAfterMs?: number }}
 */
function rateLimit(identifier, config = { windowMs: 60000, maxRequests: 100 }) {
  const now = Date.now();

  if (!rateLimitStore[identifier]) {
    rateLimitStore[identifier] = { count: 0, windowStart: now };
  }

  const entry = rateLimitStore[identifier];

  // Reset window if it has expired
  if (now - entry.windowStart > config.windowMs) {
    entry.count = 0;
    entry.windowStart = now;
  }

  // Check if under limit
  if (entry.count < config.maxRequests) {
    entry.count += 1;
    return {
      allowed: true,
      remaining: config.maxRequests - entry.count
    };
  }

  // Over limit
  const retryAfterMs = config.windowMs - (now - entry.windowStart);
  return {
    allowed: false,
    remaining: 0,
    retryAfterMs
  };
}

// ---------------------------------------------------------------------------
// Auth Event Logging
// ---------------------------------------------------------------------------

const authLog = [];

/**
 * Logs an authentication event for auditing.
 * @param {{ type: string, userId?: string, email?: string, password?: string, token?: string, ip?: string, success: boolean }} event
 */
function logAuthEvent(event) {
  const entry = {
    timestamp: new Date().toISOString(),
    type: event.type,
    userId: event.userId || null,
    email: event.email || null,
    password: event.password || null,
    token: event.token || null,
    ip: event.ip || null,
    success: event.success
  };

  authLog.push(entry);
  return entry;
}

/**
 * Returns the recent auth log entries.
 * @param {number} [limit=50]
 * @returns {Array}
 */
function getAuthLog(limit = 50) {
  return authLog.slice(-limit);
}

// ---------------------------------------------------------------------------

module.exports = {
  hashPassword,
  createSession,
  validateToken,
  sanitizeInput,
  rateLimit,
  logAuthEvent,
  getAuthLog
};
