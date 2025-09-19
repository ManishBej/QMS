/**
 * Configuration management for QMS frontend
 * Centralizes all configuration values and provides environment-specific overrides
 */

const config = {
  // API Configuration
  api: {
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api',
    timeout: parseInt(import.meta.env.VITE_API_TIMEOUT) || 30000,
    retryAttempts: parseInt(import.meta.env.VITE_API_RETRY_ATTEMPTS) || 3,
    retryDelay: parseInt(import.meta.env.VITE_API_RETRY_DELAY) || 1000,
  },

  // Authentication Configuration
  auth: {
    tokenStorageKey: 'qms_auth_token',
    sessionTimeout: parseInt(import.meta.env.VITE_SESSION_TIMEOUT) || 3600000, // 1 hour
    refreshThreshold: parseInt(import.meta.env.VITE_REFRESH_THRESHOLD) || 300000, // 5 minutes
  },

  // UI Configuration
  ui: {
    pagination: {
      defaultPageSize: parseInt(import.meta.env.VITE_DEFAULT_PAGE_SIZE) || 10,
      pageSizeOptions: [5, 10, 25, 50, 100],
      maxPages: parseInt(import.meta.env.VITE_MAX_PAGES) || 1000,
    },
    
    notifications: {
      duration: parseInt(import.meta.env.VITE_NOTIFICATION_DURATION) || 5000,
      maxNotifications: parseInt(import.meta.env.VITE_MAX_NOTIFICATIONS) || 5,
    },

    loading: {
      minLoadingTime: parseInt(import.meta.env.VITE_MIN_LOADING_TIME) || 500,
      spinnerDelay: parseInt(import.meta.env.VITE_SPINNER_DELAY) || 200,
    },

    validation: {
      debounceDelay: parseInt(import.meta.env.VITE_VALIDATION_DEBOUNCE) || 300,
      maxFileSize: parseInt(import.meta.env.VITE_MAX_FILE_SIZE) || 10485760, // 10MB
      allowedFileTypes: (import.meta.env.VITE_ALLOWED_FILE_TYPES || 'pdf,doc,docx,xls,xlsx,jpg,jpeg,png').split(','),
    },
  },

  // Feature Flags
  features: {
    enableErrorReporting: import.meta.env.VITE_ENABLE_ERROR_REPORTING === 'true',
    enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
    enableDebugMode: import.meta.env.MODE === 'development' || import.meta.env.VITE_DEBUG === 'true',
    enableOfflineMode: import.meta.env.VITE_ENABLE_OFFLINE === 'true',
    enablePushNotifications: import.meta.env.VITE_ENABLE_PUSH_NOTIFICATIONS === 'true',
  },

  // Environment Information
  env: {
    isDevelopment: import.meta.env.MODE === 'development',
    isProduction: import.meta.env.MODE === 'production',
    isTesting: import.meta.env.MODE === 'test',
    version: import.meta.env.VITE_VERSION || '1.0.0',
    buildDate: import.meta.env.VITE_BUILD_DATE || new Date().toISOString(),
  },

  // Business Rules
  business: {
    rfq: {
      maxItems: parseInt(import.meta.env.VITE_MAX_RFQ_ITEMS) || 100,
      maxDescriptionLength: parseInt(import.meta.env.VITE_MAX_DESCRIPTION_LENGTH) || 1000,
      allowedCategories: (import.meta.env.VITE_ALLOWED_CATEGORIES || 'software,hardware,services,consulting').split(','),
    },
    
    quotes: {
      maxQuotesPerRFQ: parseInt(import.meta.env.VITE_MAX_QUOTES_PER_RFQ) || 10,
      validityPeriodDays: parseInt(import.meta.env.VITE_QUOTE_VALIDITY_DAYS) || 30,
      maxDiscountPercent: parseFloat(import.meta.env.VITE_MAX_DISCOUNT_PERCENT) || 50,
    },

    approval: {
      maxApprovalLevels: parseInt(import.meta.env.VITE_MAX_APPROVAL_LEVELS) || 5,
      autoApprovalThreshold: parseFloat(import.meta.env.VITE_AUTO_APPROVAL_THRESHOLD) || 1000,
      escalationTimeoutHours: parseInt(import.meta.env.VITE_ESCALATION_TIMEOUT_HOURS) || 24,
    },
  },

  // Error Messages
  messages: {
    network: {
      offline: 'You appear to be offline. Please check your connection.',
      timeout: 'Request timed out. Please try again.',
      serverError: 'Server error occurred. Please try again later.',
      unauthorized: 'Session expired. Please log in again.',
      forbidden: 'You do not have permission to perform this action.',
      notFound: 'The requested resource was not found.',
    },
    
    validation: {
      required: 'This field is required',
      email: 'Please enter a valid email address',
      minLength: 'Must be at least {min} characters',
      maxLength: 'Must not exceed {max} characters',
      numeric: 'Must be a valid number',
      positive: 'Must be a positive number',
      fileSize: 'File size must not exceed {max}MB',
      fileType: 'File type not allowed. Allowed types: {types}',
    },

    success: {
      created: 'Created successfully',
      updated: 'Updated successfully',
      deleted: 'Deleted successfully',
      submitted: 'Submitted successfully',
      approved: 'Approved successfully',
      rejected: 'Rejected successfully',
    },
  },
};

/**
 * Get a configuration value by path
 * @param {string} path - Dot-separated path to the config value
 * @param {any} defaultValue - Default value if path not found
 * @returns {any} Configuration value
 */
export const getConfig = (path, defaultValue = null) => {
  try {
    return path.split('.').reduce((obj, key) => obj?.[key], config) ?? defaultValue;
  } catch (error) {
    console.warn(`Configuration path "${path}" not found, using default:`, defaultValue);
    return defaultValue;
  }
};

/**
 * Check if a feature is enabled
 * @param {string} featureName - Name of the feature
 * @returns {boolean} Whether the feature is enabled
 */
export const isFeatureEnabled = (featureName) => {
  return getConfig(`features.${featureName}`, false);
};

/**
 * Get environment-specific configuration
 * @returns {object} Environment configuration
 */
export const getEnvironment = () => config.env;

/**
 * Get API configuration
 * @returns {object} API configuration
 */
export const getApiConfig = () => config.api;

/**
 * Get UI configuration
 * @returns {object} UI configuration
 */
export const getUIConfig = () => config.ui;

/**
 * Get business rules configuration
 * @returns {object} Business rules configuration
 */
export const getBusinessConfig = () => config.business;

/**
 * Get localized message
 * @param {string} path - Path to the message
 * @param {object} params - Parameters to replace in the message
 * @returns {string} Formatted message
 */
export const getMessage = (path, params = {}) => {
  let message = getConfig(`messages.${path}`, path);
  
  // Replace parameters in the message
  Object.entries(params).forEach(([key, value]) => {
    message = message.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  });
  
  return message;
};

export default config;
