import 'dotenv/config';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable not set');
  process.exit(1);
}

export function authenticate(req, res, next) {
  // Use HttpOnly cookies only for better security
  const token = req.cookies?.qms_token;
  
  if (!token) {
    return res.status(401).json({ 
      error: 'unauthorized',
      message: 'Authentication required' 
    });
  }
  
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { userId: payload.sub, roles: payload.roles };
    return next();
  } catch (e) {
    // Clear invalid cookie
    res.clearCookie('qms_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    });
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
