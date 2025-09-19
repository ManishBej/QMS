import { logger } from '../utils/logger.js';

// Global error handler middleware
export function errorHandler(err, req, res, next) {
  // Log the error securely (without sensitive data)
  logger.error('Request error occurred', {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    user: req.user?.sub || 'anonymous',
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({ 
      error: 'validation_error', 
      message: 'Invalid input data',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ 
      error: 'invalid_id', 
      message: 'Invalid ID format'
    });
  }

  if (err.name === 'MongoError' || err.name === 'MongoServerError') {
    return res.status(500).json({ 
      error: 'database_error', 
      message: 'Database operation failed'
    });
  }

  if (err.message === 'CORS_NOT_ALLOWED') {
    return res.status(403).json({ 
      error: 'cors_blocked', 
      message: 'Origin not allowed by CORS policy'
    });
  }

  // Default error response
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    error: 'internal_server_error',
    message: isDevelopment ? err.message : 'An internal error occurred',
    stack: isDevelopment ? err.stack : undefined,
    timestamp: new Date().toISOString()
  });
}

// 404 handler for unmatched routes
export function notFoundHandler(req, res) {
  logger.warn('Route not found', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(404).json({
    error: 'not_found',
    message: `Cannot ${req.method} ${req.url}`,
    timestamp: new Date().toISOString()
  });
}

export default {
  errorHandler,
  notFoundHandler
};
