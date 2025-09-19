// Secure logging utility that sanitizes sensitive data

const sensitiveFields = [
  'password', 'token', 'secret', 'key', 'auth', 'authorization',
  'passwordHash', 'jwt', 'cookie', 'session', 'credential'
];

export function sanitizeForLog(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForLog(item));
  }
  
  const sanitized = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const keyLower = key.toLowerCase();
    const isSensitive = sensitiveFields.some(field => keyLower.includes(field));
    
    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeForLog(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

export function secureLog(level, message, data = {}, includeTimestamp = true) {
  const timestamp = includeTimestamp ? new Date().toISOString() : '';
  const sanitizedData = sanitizeForLog(data);
  
  const logPrefix = includeTimestamp ? `[${timestamp}] ` : '';
  
  if (Object.keys(sanitizedData).length > 0) {
    console[level](`${logPrefix}${message}`, sanitizedData);
  } else {
    console[level](`${logPrefix}${message}`);
  }
}

// Convenience methods
export const logger = {
  error: (message, data) => secureLog('error', message, data),
  warn: (message, data) => secureLog('warn', message, data),
  info: (message, data) => secureLog('info', message, data),
  log: (message, data) => secureLog('log', message, data),
  debug: (message, data) => secureLog('log', `[DEBUG] ${message}`, data)
};

export default {
  sanitizeForLog,
  secureLog,
  logger
};
