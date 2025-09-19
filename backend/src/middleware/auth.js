import 'dotenv/config';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable not set');
  process.exit(1);
}

export function authenticate(req, res, next) {
  // Support both Authorization header (for cross-domain) and HttpOnly cookies
  let token = null;
  
  // First, try Authorization header (for JWT tokens)
  const authHeader = req.headers.authorization;
  console.log('🔍 Raw Authorization header:', JSON.stringify(authHeader));
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
    console.log('🔍 Extracted token before cleaning:', JSON.stringify(token));
    
    // Remove any surrounding quotes that might have been added
    if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) {
      console.log('🧹 Removing surrounding quotes from token');
      token = token.slice(1, -1);
    }
    console.log('🔐 JWT token found in Authorization header:', token.substring(0, 20) + '...');
  }
  
  // Fallback to HttpOnly cookies (for same-domain)
  if (!token) {
    token = req.cookies?.qms_token;
    if (token) {
      console.log('🍪 Token found in cookies:', token.substring(0, 20) + '...');
    }
  }
  
  if (!token) {
    console.log('❌ No token found in Authorization header or cookies');
    return res.status(401).json({ 
      error: 'unauthorized',
      message: 'Authentication required' 
    });
  }
  
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { userId: payload.sub, roles: payload.roles };
    console.log('✅ JWT verification successful for user:', payload.username, 'roles:', payload.roles);
    return next();
  } catch (e) {
    console.log('❌ JWT verification failed:', e.message);
    // Clear invalid cookie if it exists
    if (req.cookies?.qms_token) {
      res.clearCookie('qms_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/'
      });
    }
    return res.status(401).json({ 
      error: 'invalid_token',
      message: 'Invalid or expired session' 
    });
  }
}

export function signToken(user) {
  return jwt.sign(
    { 
      sub: (user._id || user.id).toString(), 
      roles: user.roles || [],
      username: user.username 
    }, 
    JWT_SECRET, 
    { expiresIn: '1h' }
  );
}

// Secure cookie configuration for JWT tokens
export function setTokenCookie(res, token) {
  res.cookie('qms_token', token, {
    httpOnly: true, // Prevent XSS access
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'strict', // CSRF protection
    maxAge: 60 * 60 * 1000, // 1 hour
    path: '/' // Available to all routes
  });
}

// Clear authentication cookie
export function clearTokenCookie(res) {
  res.clearCookie('qms_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  });
}

export default authenticate;
