// CSRF Protection Middleware
import crypto from 'crypto';
import { logger } from '../utils/logger.js';
import { tokenStore } from '../utils/tokenStore.js';

const TOKEN_EXPIRY = 3600000; // 1 hour
const MAX_TOKENS_PER_SESSION = 10;

/**
 * Get consistent session ID for CSRF token management
 */
function getSessionId(req) {
  // Priority: userId from JWT > sub from JWT > IP address as fallback
  if (req.user?.userId) {
    return `user_${req.user.userId}`;
  }
  if (req.user?.sub) {
    return `sub_${req.user.sub}`;
  }
  // Fallback to IP for unauthenticated requests
  return `ip_${req.ip || req.connection.remoteAddress || 'unknown'}`;
}

/**
 * Generate CSRF token for the current session
 */
export function generateCSRFToken(req, res, next) {
  // Use consistent session ID logic
  const sessionId = getSessionId(req);
  
  // Clean up expired tokens
  cleanupExpiredTokens();
  
  // Limit tokens per session
  const userTokens = Array.from(tokenStore.entries())
    .filter(([token, data]) => data.sessionId === sessionId)
    .sort((a, b) => b[1].created - a[1].created);
  
  if (userTokens.length >= MAX_TOKENS_PER_SESSION) {
    // Remove oldest tokens
    userTokens.slice(MAX_TOKENS_PER_SESSION - 1).forEach(([token]) => {
      tokenStore.delete(token);
    });
  }
  
  // Generate new token
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + TOKEN_EXPIRY;
  
  tokenStore.set(token, {
    sessionId,
    created: Date.now(),
    expiresAt,
    used: false
  });
  
  console.log('🛡️ CSRF Token generated in middleware:', {
    token: token.substring(0, 16) + '...',
    sessionId,
    path: req.path
  });
  
  // Set token in response header for client to use
  res.setHeader('X-CSRF-Token', token);
  // Make the token available both as a property and a method for compatibility
  req.csrfToken = token;
  
  // Override the req.csrfToken to be a function as well for compatibility
  req.csrfToken = function() { return token; };
  
  next();
}

/**
 * Validate CSRF token for state-changing operations
 */
export function validateCSRFToken(req, res, next) {
  const token = req.headers['x-csrf-token'] || req.body._csrf;
  const sessionId = getSessionId(req);
  
  console.log('🛡️ CSRF Token validation:', {
    hasToken: !!token,
    tokenStart: token ? token.substring(0, 16) + '...' : 'none',
    sessionId,
    path: req.path,
    method: req.method,
    userInfo: req.user ? { userId: req.user.userId, sub: req.user.sub } : 'not authenticated'
  });
  
  if (!token) {
    console.log('🛡️ CSRF validation failed: No token provided');
    return res.status(403).json({ 
      error: 'csrf_token_missing',
      message: 'CSRF token is required for this operation'
    });
  }
  
  const tokenData = tokenStore.get(token);
  
  if (!tokenData) {
    console.log('🛡️ CSRF validation failed: Token not found in store', {
      tokenStart: token.substring(0, 16) + '...',
      storeSize: tokenStore.size,
      availableTokens: Array.from(tokenStore.keys()).map(t => t.substring(0, 8) + '...')
    });
    return res.status(403).json({ 
      error: 'invalid_csrf_token',
      message: 'Invalid or expired CSRF token'
    });
  }
  
  // Check if token belongs to this session
  if (tokenData.sessionId !== sessionId) {
    console.log('🛡️ CSRF validation failed: Session mismatch', {
      expected: tokenData.sessionId,
      actual: sessionId,
      tokenAge: Date.now() - tokenData.created,
      userInfo: req.user
    });
    return res.status(403).json({ 
      error: 'csrf_token_invalid',
      message: 'CSRF token does not match session'
    });
  }
  
  // Check if token has expired
  if (Date.now() > tokenData.expiresAt) {
    tokenStore.delete(token);
    console.log('🛡️ CSRF validation failed: Token expired');
    return res.status(403).json({ 
      error: 'csrf_token_expired',
      message: 'CSRF token has expired'
    });
  }
  
  console.log('🛡️ CSRF Token validation successful');
  
  // Mark token as used (optional: implement single-use tokens)
  tokenData.used = true;
  
  next();
}

/**
 * CSRF protection for specific HTTP methods
 */
export function csrfProtection(methods = ['POST', 'PUT', 'PATCH', 'DELETE']) {
  return (req, res, next) => {
    if (methods.includes(req.method)) {
      return validateCSRFToken(req, res, next);
    }
    next();
  };
}

/**
 * Clean up expired tokens from memory
 */
function cleanupExpiredTokens() {
  const now = Date.now();
  for (const [token, data] of tokenStore.entries()) {
    if (now > data.expiresAt) {
      tokenStore.delete(token);
    }
  }
}

// Clean up expired tokens every 15 minutes
setInterval(cleanupExpiredTokens, 15 * 60 * 1000);

export default {
  generateCSRFToken,
  validateCSRFToken,
  csrfProtection
};
