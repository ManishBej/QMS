/**
 * Backend configuration management
 * Centralizes all environment variables and provides defaults for production readiness
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Validate required environment variables
 * @param {Object} config - Configuration object to validate
 * @throws {Error} If required variables are missing
 */
const validateConfig = (config) => {
  const required = [
    'NODE_ENV',
    'PORT',
    'MONGODB_URI',
    'JWT_SECRET'
  ];

  const missing = required.filter(key => !config[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate JWT secret strength in production
  if (config.NODE_ENV === 'production' && config.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production');
  }

  // Validate MongoDB URI format
  if (!config.MONGODB_URI.startsWith('mongodb://') && !config.MONGODB_URI.startsWith('mongodb+srv://')) {
    throw new Error('MONGODB_URI must be a valid MongoDB connection string');
  }
};

/**
 * Parse integer environment variable with default
 * @param {string} value - Environment variable value
 * @param {number} defaultValue - Default value if parsing fails
 * @returns {number} Parsed integer or default
 */
const parseIntEnv = (value, defaultValue) => {
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

/**
 * Parse boolean environment variable
 * @param {string} value - Environment variable value
 * @param {boolean} defaultValue - Default value
 * @returns {boolean} Boolean value
 */
const parseBoolEnv = (value, defaultValue = false) => {
  if (value === undefined || value === null) return defaultValue;
  return value.toLowerCase() === 'true';
};

/**
 * Parse comma-separated string to array
 * @param {string} value - Comma-separated string
 * @param {Array} defaultValue - Default array
 * @returns {Array} Parsed array
 */
const parseArrayEnv = (value, defaultValue = []) => {
  if (!value) return defaultValue;
  return value.split(',').map(item => item.trim()).filter(Boolean);
};

// Configuration object
const config = {
  // Environment
  NODE_ENV: process.env.NODE_ENV || 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  IS_TEST: process.env.NODE_ENV === 'test',

  // Server
  PORT: parseIntEnv(process.env.PORT, 3001),
  HOST: process.env.HOST || '0.0.0.0',

  // Database
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/qms',
  DB_OPTIONS: {
    maxPoolSize: parseIntEnv(process.env.DB_MAX_POOL_SIZE, 10),
    minPoolSize: parseIntEnv(process.env.DB_MIN_POOL_SIZE, 2),
    maxIdleTimeMS: parseIntEnv(process.env.DB_MAX_IDLE_TIME_MS, 30000),
    serverSelectionTimeoutMS: parseIntEnv(process.env.DB_SERVER_SELECTION_TIMEOUT_MS, 5000),
    connectTimeoutMS: parseIntEnv(process.env.DB_CONNECT_TIMEOUT_MS, 10000),
    // Removed bufferMaxEntries as it's not supported in newer MongoDB driver versions
    // Use bufferCommands: false instead for similar effect
    bufferCommands: parseBoolEnv(process.env.DB_BUFFER_COMMANDS, false)
  },

  // Security
  JWT_SECRET: process.env.JWT_SECRET || 'development-only-secret-change-in-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1h',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  BCRYPT_ROUNDS: parseIntEnv(process.env.BCRYPT_ROUNDS, 12),
  
  // Session
  SESSION_SECRET: process.env.SESSION_SECRET || process.env.JWT_SECRET,
  COOKIE_MAX_AGE: parseIntEnv(process.env.COOKIE_MAX_AGE, 24 * 60 * 60 * 1000), // 24 hours
  SECURE_COOKIES: parseBoolEnv(process.env.SECURE_COOKIES, process.env.NODE_ENV === 'production'),

  // Rate Limiting
  RATE_LIMIT: {
    WINDOW_MS: parseIntEnv(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000), // 15 minutes
    MAX_REQUESTS: parseIntEnv(process.env.RATE_LIMIT_MAX, process.env.NODE_ENV === 'development' ? 1000 : 100), // Higher limit for development
    AUTH_MAX_REQUESTS: parseIntEnv(process.env.AUTH_RATE_LIMIT_MAX, process.env.NODE_ENV === 'development' ? 50 : 5), // Higher limit for development
    SKIP_SUCCESSFUL_REQUESTS: parseBoolEnv(process.env.RATE_LIMIT_SKIP_SUCCESS, false)
  },

  // CORS
  CORS: {
    ALLOWED_ORIGINS: parseArrayEnv(process.env.ALLOWED_ORIGINS, ['http://localhost:5173', 'http://localhost:3000']),
    CREDENTIALS: parseBoolEnv(process.env.CORS_CREDENTIALS, true),
    MAX_AGE: parseIntEnv(process.env.CORS_MAX_AGE, 86400) // 24 hours
  },

  // File Upload
  UPLOAD: {
    MAX_FILE_SIZE: parseIntEnv(process.env.MAX_FILE_SIZE, 10 * 1024 * 1024), // 10MB
    ALLOWED_TYPES: parseArrayEnv(process.env.ALLOWED_FILE_TYPES, ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png']),
    UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
    TEMP_DIR: process.env.TEMP_DIR || './temp'
  },

  // Request Limits
  REQUEST: {
    JSON_LIMIT: process.env.REQUEST_JSON_LIMIT || '10mb',
    URL_ENCODED_LIMIT: process.env.REQUEST_URL_ENCODED_LIMIT || '10mb',
    PARAMETER_LIMIT: parseIntEnv(process.env.REQUEST_PARAMETER_LIMIT, 1000)
  },

  // Logging
  LOG: {
    LEVEL: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    FORMAT: process.env.LOG_FORMAT || 'combined',
    FILE_PATH: process.env.LOG_FILE_PATH || './logs/app.log',
    MAX_FILES: parseIntEnv(process.env.LOG_MAX_FILES, 5),
    MAX_SIZE: process.env.LOG_MAX_SIZE || '10m'
  },

  // Email (if needed)
  EMAIL: {
    HOST: process.env.EMAIL_HOST,
    PORT: parseIntEnv(process.env.EMAIL_PORT, 587),
    SECURE: parseBoolEnv(process.env.EMAIL_SECURE, false),
    USER: process.env.EMAIL_USER,
    PASS: process.env.EMAIL_PASS,
    FROM: process.env.EMAIL_FROM || 'noreply@qms.com'
  },

  // External APIs
  EXTERNAL: {
    API_TIMEOUT: parseIntEnv(process.env.EXTERNAL_API_TIMEOUT, 30000),
    RETRY_ATTEMPTS: parseIntEnv(process.env.EXTERNAL_API_RETRY_ATTEMPTS, 3),
    RETRY_DELAY: parseIntEnv(process.env.EXTERNAL_API_RETRY_DELAY, 1000)
  },

  // Feature Flags
  FEATURES: {
    ENABLE_SWAGGER: parseBoolEnv(process.env.ENABLE_SWAGGER, process.env.NODE_ENV !== 'production'),
    ENABLE_METRICS: parseBoolEnv(process.env.ENABLE_METRICS, true),
    ENABLE_REQUEST_LOGGING: parseBoolEnv(process.env.ENABLE_REQUEST_LOGGING, true),
    ENABLE_PERFORMANCE_MONITORING: parseBoolEnv(process.env.ENABLE_PERFORMANCE_MONITORING, true),
    ENABLE_ERROR_REPORTING: parseBoolEnv(process.env.ENABLE_ERROR_REPORTING, process.env.NODE_ENV === 'production')
  },

  // Business Rules
  BUSINESS: {
    MAX_RFQ_ITEMS: parseIntEnv(process.env.MAX_RFQ_ITEMS, 100),
    MAX_QUOTES_PER_RFQ: parseIntEnv(process.env.MAX_QUOTES_PER_RFQ, 10),
    QUOTE_VALIDITY_DAYS: parseIntEnv(process.env.QUOTE_VALIDITY_DAYS, 30),
    MAX_APPROVAL_LEVELS: parseIntEnv(process.env.MAX_APPROVAL_LEVELS, 5),
    AUTO_APPROVAL_THRESHOLD: parseFloat(process.env.AUTO_APPROVAL_THRESHOLD) || 1000
  },

  // Pagination
  PAGINATION: {
    DEFAULT_PAGE_SIZE: parseIntEnv(process.env.DEFAULT_PAGE_SIZE, 10),
    MAX_PAGE_SIZE: parseIntEnv(process.env.MAX_PAGE_SIZE, 100),
    MAX_PAGES: parseIntEnv(process.env.MAX_PAGES, 1000)
  }
};

// Validate configuration
try {
  validateConfig(config);
} catch (error) {
  console.error('Configuration validation failed:', error.message);
  process.exit(1);
}

/**
 * Get configuration value by path
 * @param {string} path - Dot notation path to config value
 * @param {any} defaultValue - Default value if not found
 * @returns {any} Configuration value
 */
export const getConfig = (path, defaultValue = undefined) => {
  try {
    return path.split('.').reduce((obj, key) => obj?.[key], config) ?? defaultValue;
  } catch (error) {
    return defaultValue;
  }
};

/**
 * Check if a feature is enabled
 * @param {string} featureName - Name of the feature
 * @returns {boolean} Whether the feature is enabled
 */
export const isFeatureEnabled = (featureName) => {
  return getConfig(`FEATURES.${featureName}`, false);
};

/**
 * Get database configuration
 * @returns {Object} Database configuration
 */
export const getDatabaseConfig = () => ({
  uri: config.MONGODB_URI,
  options: config.DB_OPTIONS
});

/**
 * Get security configuration
 * @returns {Object} Security configuration
 */
export const getSecurityConfig = () => ({
  jwtSecret: config.JWT_SECRET,
  jwtExpiresIn: config.JWT_EXPIRES_IN,
  jwtRefreshExpiresIn: config.JWT_REFRESH_EXPIRES_IN,
  bcryptRounds: config.BCRYPT_ROUNDS,
  sessionSecret: config.SESSION_SECRET,
  cookieMaxAge: config.COOKIE_MAX_AGE,
  secureCookies: config.SECURE_COOKIES
});

/**
 * Get rate limiting configuration
 * @returns {Object} Rate limiting configuration
 */
export const getRateLimitConfig = () => config.RATE_LIMIT;

/**
 * Get CORS configuration
 * @returns {Object} CORS configuration
 */
export const getCorsConfig = () => {
  // Return the built-in CORS config, with fallback to defaults if needed
  return config.CORS || {
    ALLOWED_ORIGINS: ['http://localhost:5173', 'http://localhost:3000'],
    CREDENTIALS: true,
    MAX_AGE: 86400
  };
};

/**
 * Get upload configuration
 * @returns {Object} Upload configuration
 */
export const getUploadConfig = () => config.UPLOAD;

export default config;
