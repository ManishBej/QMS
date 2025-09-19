/**
 * Default configuration settings for development environments
 */

// Default allowed origins if not specified
export const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5173',  // Vite default
  'http://localhost:3000',  // Common React development server
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  'http://localhost:8080',  // Alternative development port
  'http://localhost:8000'   // Alternative development port
];

// Default CORS configuration
export const DEFAULT_CORS_CONFIG = {
  ALLOWED_ORIGINS: process.env.FRONTEND_ORIGIN 
    ? [process.env.FRONTEND_ORIGIN] 
    : DEFAULT_ALLOWED_ORIGINS,
  CREDENTIALS: true,
  MAX_AGE: 86400  // 24 hours
};

// Export the helper function to get default CORS configuration
export const getDefaultCorsConfig = () => DEFAULT_CORS_CONFIG;

export default {
  DEFAULT_ALLOWED_ORIGINS,
  DEFAULT_CORS_CONFIG,
  getDefaultCorsConfig
};
