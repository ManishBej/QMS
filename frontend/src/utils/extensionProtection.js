// Browser Extension Protection Utility
// This helps prevent browser extensions from interfering with the application

// Safe console operations to prevent extension interference
export const safeConsole = {
  log: (...args) => {
    try {
      if (typeof console !== 'undefined' && console.log) {
        console.log(...args);
      }
    } catch (e) {
      // Fallback if console is corrupted by extension
      try {
        console.log('Log blocked by extension');
      } catch (e2) {
        // Silent fail if console is completely broken
      }
    }
  },
  
  warn: (...args) => {
    try {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn(...args);
      }
    } catch (e) {
      try {
        console.log('WARN:', ...args);
      } catch (e2) {
        // Silent fail
      }
    }
  },
  
  error: (...args) => {
    try {
      if (typeof console !== 'undefined' && console.error) {
        console.error(...args);
      }
    } catch (e) {
      try {
        console.log('ERROR:', ...args);
      } catch (e2) {
        // Silent fail
      }
    }
  }
};

// CSRF protection helpers
export const csrfHelpers = {
  extractTokenFromResponse: (response) => {
    try {
      // Check data first
      if (response?.data?.token) {
        safeConsole.log('🛡️ CSRF token found in response data.token');
        return response.data.token;
      }
      
      if (response?.data?.csrfToken) {
        safeConsole.log('🛡️ CSRF token found in response data.csrfToken');
        return response.data.csrfToken;
      }
      
      // Check headers case-insensitively
      const headers = response?.headers || {};
      for (const key of Object.keys(headers)) {
        if (key.toLowerCase() === 'x-csrf-token') {
          safeConsole.log(`🛡️ CSRF token found in response headers: ${key}`);
          return headers[key];
        }
      }
      
      safeConsole.warn('⚠️ No CSRF token found in response');
      return null;
    } catch (e) {
      safeConsole.error('❌ Error extracting CSRF token:', e);
      return null;
    }
  }
};

// Safe localStorage operations to prevent extension interference
export const safeStorage = {
  getItem: (key) => {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return null;
      
      // For our auth token, return as-is (it's not JSON)
      if (key === 'qms_auth_token') {
        return item;
      }
      
      // For other items, try to parse as JSON if it looks like JSON
      if (typeof item === 'string') {
        const trimmed = item.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('[') || trimmed.startsWith('"')) {
          try {
            return JSON.parse(item);
          } catch (e) {
            // If it looks like JSON but fails to parse, it might be corrupted
            console.warn(`Corrupted JSON in localStorage for key: ${key}`);
            localStorage.removeItem(key);
            return null;
          }
        }
        return item;
      }
      return item;
    } catch (e) {
      console.warn(`Failed to read localStorage item: ${key}`);
      return null;
    }
  },
  
  setItem: (key, value) => {
    try {
      // Prevent extensions from breaking by ensuring all values are properly serialized
      let serializedValue;
      
      if (typeof value === 'string') {
        // For string values, check if they're already JSON
        const trimmed = value.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('[') || trimmed.startsWith('"')) {
          // Already looks like JSON, validate it first
          try {
            JSON.parse(value);
            serializedValue = value;
          } catch (e) {
            // Invalid JSON, wrap it as a string
            serializedValue = JSON.stringify(value);
          }
        } else {
          // Plain string, keep as-is for auth tokens, JSON wrap for others
          serializedValue = key === 'qms_auth_token' ? value : JSON.stringify(value);
        }
      } else {
        // Non-string values: always JSON serialize
        serializedValue = JSON.stringify(value);
      }
      
      localStorage.setItem(key, serializedValue);
      
      // Also set a marker to help extensions identify our data format
      if (!key.startsWith('qms_marker_')) {
        localStorage.setItem(`qms_marker_${key}`, 'qms_managed');
      }
      
      return true;
    } catch (e) {
      console.error(`Failed to set localStorage item: ${key}`, e);
      return false;
    }
  },
  
  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.error(`Failed to remove localStorage item: ${key}`, e);
      return false;
    }
  },
  
  clear: () => {
    try {
      localStorage.clear();
      return true;
    } catch (e) {
      console.error('Failed to clear localStorage', e);
      return false;
    }
  }
};

// Safe JSON operations
export const safeJSON = {
  parse: (str) => {
    try {
      return JSON.parse(str);
    } catch (e) {
      console.warn('Invalid JSON string, returning null:', str?.substring(0, 100));
      return null;
    }
  },
  
  stringify: (obj) => {
    try {
      return JSON.stringify(obj);
    } catch (e) {
      console.warn('Failed to stringify object:', e);
      return null;
    }
  }
};

// Clean up corrupted localStorage items
export function cleanupLocalStorage() {
  const keysToCheck = [
    'qms_auth_token',
    'user',
    'token',
    'authData',
    'qmsData',
    'userData'
  ];
  
  let cleaned = 0;
  
  keysToCheck.forEach(key => {
    try {
      const item = localStorage.getItem(key);
  if (!item) return;
  // Do not treat non-JSON tokens as corrupted (e.g., qms_auth_token)
  if (key === 'qms_auth_token') return;
  // For other known keys, only attempt JSON parse if value looks like JSON
  const looksJson = item.trim().startsWith('{') || item.trim().startsWith('[');
  if (looksJson) JSON.parse(item);
    } catch (e) {
  console.log(`Cleaning up corrupted localStorage item: ${key}`);
      localStorage.removeItem(key);
      cleaned++;
    }
  });
  
  if (cleaned > 0) {
    safeConsole.log(`🧹 Cleaned up ${cleaned} corrupted localStorage items`);
  }
  
  return cleaned;
}

// Prevent browser extension interference with console
export function protectConsole() {
  // Override console to suppress extension-related errors
  const originalError = console.error;
  const originalWarn = console.warn;
  
  console.error = function(...args) {
    const message = args.join(' ');
    
    // Suppress common browser extension errors
    if (
      message.includes('content.js') ||
      message.includes('extension') ||
      message.includes('VM') ||
      message.includes('Uncaught (in promise) SyntaxError') ||
      message.includes('is not valid JSON') ||
      message.includes('_storageChangeDispatcher') ||
      message.includes('_storageChangeDispatcherCallback')
    ) {
      // Silently ignore extension-related errors
      return;
    }
    
    // Log legitimate application errors
    originalError.apply(console, args);
  };
  
  console.warn = function(...args) {
    const message = args.join(' ');
    
    // Suppress common browser extension warnings
    if (
      message.includes('content.js') ||
      message.includes('extension') ||
      message.includes('VM') ||
      message.includes('_storage')
    ) {
      return;
    }
    
    originalWarn.apply(console, args);
  };
  
  console.log('🛡️ Console protection enabled - Extension errors suppressed');
}

// Add global error handler for unhandled promise rejections from extensions
export function setupGlobalErrorHandling() {
  if (typeof window === 'undefined') return;
  
  // Handle promise rejections from extensions
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message = reason?.message || reason?.toString() || '';
    
    // Suppress extension-related promise rejections
    if (
      message.includes('content.js') ||
      message.includes('contentScript.js') ||
      message.includes('extension') ||
      message.includes('JSON.parse') ||
      message.includes('_storageChangeDispatcher') ||
      message.includes('[object Object]" is not valid JSON') ||
      message.includes('indexOf') ||
      message.includes('VM') ||
      reason?.stack?.includes('chrome-extension')
    ) {
      event.preventDefault();
      return;
    }
  });  // Handle regular JavaScript errors
  window.addEventListener('error', (event) => {
    const message = event.message || '';
    const filename = event.filename || '';
    
    // Suppress extension-related errors
    if (
      filename.includes('content.js') ||
      filename.includes('contentScript.js') ||
      filename.includes('extension') ||
      filename.includes('chrome-extension') ||
      message.includes('content.js') ||
      message.includes('contentScript.js') ||
      message.includes('VM') ||
      message.includes('_storage') ||
      message.includes('indexOf') ||
      message.includes('Cannot read properties of null')
    ) {
      event.preventDefault();
      return;
    }
  });
  
  console.log('🛡️ Global error handling enabled - Extension errors filtered');
}

// Override problematic extension storage monitoring
export function protectStorageEvents() {
  if (typeof window === 'undefined') return;
  
  // Create a safe storage event that doesn't break extensions
  const originalAddEventListener = window.addEventListener;
  window.addEventListener = function(type, listener, options) {
    if (type === 'storage') {
      // Wrap storage listeners to handle JSON parsing safely
      const safeListener = function(event) {
        try {
          // Ensure the event data is safe before calling the original listener
          if (event.newValue && typeof event.newValue === 'string') {
            // Check if it's valid JSON before extensions try to parse it
            try {
              JSON.parse(event.newValue);
            } catch (e) {
              // If it's not valid JSON, don't trigger the listener
              console.log('Blocking storage event with invalid JSON for extension protection');
              return;
            }
          }
          return listener.call(this, event);
        } catch (e) {
          // Silently ignore extension storage listener errors
          if (e.message?.includes('is not valid JSON') || 
              e.message?.includes('_storageChangeDispatcher')) {
            return;
          }
          throw e;
        }
      };
      return originalAddEventListener.call(this, type, safeListener, options);
    }
    return originalAddEventListener.call(this, type, listener, options);
  };
  
  console.log('🛡️ Storage event protection enabled');
}

// Initialize protection on module load
if (typeof window !== 'undefined') {
  // Protect storage events first (before extensions load)
  protectStorageEvents();
  
  // Clean up on page load
  window.addEventListener('load', () => {
    cleanupLocalStorage();
    setupGlobalErrorHandling();
  });
  
  // Clean up periodically
  setInterval(cleanupLocalStorage, 5 * 60 * 1000); // Every 5 minutes
  
  // Protect console
  protectConsole();
  
  // Setup global error handling immediately
  setupGlobalErrorHandling();
}
