import axios from 'axios';
import { getApiConfig, getConfig } from '../config/index.js';
import { safeStorage, cleanupLocalStorage, safeConsole, csrfHelpers } from '../utils/extensionProtection.js';

// Clean up localStorage on module load
cleanupLocalStorage();

// Additional extension protection
if (typeof window !== 'undefined') {
  // Prevent extensions from corrupting critical objects
  window.addEventListener('error', (e) => {
    if (e.message && e.message.includes('JSON.parse')) {
      safeConsole.warn('JSON parsing error detected, possibly from browser extension');
      e.preventDefault();
    }
  });
  
  // Protect against unhandled promise rejections from extensions
  window.addEventListener('unhandledrejection', (e) => {
    if (e.reason && e.reason.message && e.reason.message.includes('JSON.parse')) {
      safeConsole.warn('Extension JSON error caught and ignored');
      e.preventDefault();
    }
  });
}

// Get API configuration
const apiConfig = getApiConfig();

// Validate and sanitize API base URL
const envApiBase = import.meta.env && import.meta.env.VITE_API_BASE;
let API_BASE = apiConfig.baseURL; // Use config default

console.log('🔧 API Configuration:', {
  envApiBase,
  configBaseURL: apiConfig.baseURL,
  finalAPIBase: API_BASE
});

if (envApiBase) {
  try {
    const url = new URL(envApiBase);
    // Only allow http/https protocols
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      API_BASE = envApiBase;
    } else {
      console.warn('Invalid API base URL protocol, using default');
    }
  } catch (e) {
    console.warn('Invalid API base URL format, using default');
  }
}

export { API_BASE };

const api = axios.create({ 
  baseURL: API_BASE, 
  timeout: apiConfig.timeout,
  withCredentials: true // Enable sending cookies with requests
});

console.log('🌐 Axios instance created with:', {
  baseURL: API_BASE,
  timeout: apiConfig.timeout,
  withCredentials: true
});

// Simplified CSRF Token management
let csrfToken = null;

async function fetchCSRFToken() {
  try {
    const response = await api.get('/csrf-token');
    const token = csrfHelpers.extractTokenFromResponse(response);
    
    if (token) {
      csrfToken = token;
      safeConsole.log('🛡️ CSRF token fetched:', token.substring(0, 16) + '...');
      return token;
    }
    
    // Check response headers as fallback
    const headerToken = response.headers['x-csrf-token'];
    if (headerToken) {
      csrfToken = headerToken;
      safeConsole.log('🛡️ CSRF token from headers:', headerToken.substring(0, 16) + '...');
      return headerToken;
    }
    
    safeConsole.warn('⚠️ No CSRF token found in response');
    return null;
  } catch (error) {
    safeConsole.error('❌ Failed to fetch CSRF token:', error.message);
    return null;
  }
}

async function getCSRFToken() {
  if (csrfToken) {
    return csrfToken;
  }
  return await fetchCSRFToken();
}

function clearCSRFToken() {
  csrfToken = null;
}

// JWT token authentication for cross-domain deployments
export function setAuthToken(token) {
  if (token && typeof token === 'string' && token !== 'authenticated') {
    // Store the actual JWT token
    safeStorage.setItem('token', token);
    safeStorage.setItem('qms_authenticated', 'true');
    // Set Authorization header for all future requests
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    // Clear authentication
    safeStorage.removeItem('token');
    safeStorage.removeItem('qms_authenticated');
    delete api.defaults.headers.common.Authorization;
  }
}

// Check if user is authenticated (simple flag check)
export function isAuthenticated() {
  return safeStorage.getItem('qms_authenticated') === 'true';
}

// Clear all authentication data
export function clearAuth() {
  safeStorage.removeItem('qms_authenticated');
  delete api.defaults.headers.common.Authorization;
  clearCSRFToken();
  // HttpOnly cookies are cleared by the server
}

// Add request interceptor for CSRF protection only
api.interceptors.request.use(async cfg => {
  // Safer console logging to avoid browser extension conflicts
  try {
    console.log('🚀 Outgoing request:', {
      method: cfg.method,
      url: cfg.url,
      baseURL: cfg.baseURL,
      headers: Object.keys(cfg.headers || {}),
      hasData: !!cfg.data
    });
  } catch (e) {
    console.log('🚀 Outgoing request to:', cfg.method?.toUpperCase(), cfg.url);
  }
  
  // Add CSRF token for state-changing operations
  const methodsRequiringCSRF = ['POST', 'PUT', 'PATCH', 'DELETE'];
  
  // Skip CSRF for login endpoint to avoid chicken-and-egg problem
  const isLoginEndpoint = cfg.url === '/login';
  
  if (methodsRequiringCSRF.includes(cfg.method.toUpperCase()) && !isLoginEndpoint) {
    try {
      const token = await getCSRFToken();
      if (token) {
        cfg.headers['x-csrf-token'] = token;
        safeConsole.log('🛡️ Added CSRF token to request');
      } else {
        safeConsole.warn('⚠️ CSRF token unavailable; request may be rejected');
      }
    } catch (error) {
      safeConsole.error('❌ Failed to get CSRF token for request:', error.message);
      // Continue without CSRF token - let the server handle the error
    }
  } else if (isLoginEndpoint) {
    safeConsole.log('🔑 Login request detected - skipping CSRF token requirement');
  }
  
  return cfg;
});

// Add response interceptor for better error handling and CSRF token management
api.interceptors.response.use(
  response => {
    // Safer console logging to avoid browser extension conflicts
    try {
      console.log('✅ Response received:', {
        status: response.status,
        statusText: response.statusText,
        url: response.config?.url,
        hasData: !!response.data
      });
    } catch (e) {
      console.log('✅ Response received:', response.status, response.statusText);
    }
    
    // Update CSRF token if provided in response
    try {
      const newCSRFToken = response.headers?.['x-csrf-token'] || response.headers?.['X-CSRF-Token'];
      if (newCSRFToken) {
        csrfToken = newCSRFToken;
        console.log('🛡️ CSRF token updated from response');
      }
    } catch (e) {
      // Ignore header parsing errors
    }
    
    return response;
  },
  async error => {
    const originalRequest = error.config;
    
    // Safer error logging
    try {
      console.error('❌ Request failed:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: originalRequest?.url,
        method: originalRequest?.method,
        errorData: error.response?.data?.error || 'unknown'
      });
    } catch (e) {
      console.error('❌ Request failed:', error.response?.status, error.message);
    }
    
    // Handle CSRF token errors
    if (error.response?.status === 403 && 
        originalRequest && 
        !originalRequest._csrfRetry) {
      
      // Check if it's actually a CSRF error
      const errorMessage = error.response?.data?.error || '';
      const isCsrfError = errorMessage.includes('csrf') || 
                         errorMessage.includes('token') ||
                         error.response?.data?.message?.includes('CSRF');
      
      if (isCsrfError) {
        console.log('🛡️ CSRF token error, attempting to refresh and retry...');
        clearCSRFToken();
        originalRequest._csrfRetry = true;
        
        try {
          const newToken = await getCSRFToken();
          if (newToken) {
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers['x-csrf-token'] = newToken;
            console.log('🛡️ Retrying request with new CSRF token');
            return api(originalRequest);
          } else {
            console.error('❌ Failed to get new CSRF token');
          }
        } catch (csrfError) {
          console.error('❌ Failed to refresh CSRF token:', csrfError.message);
        }
      }
    }
    
    // Handle authentication errors
    if (error.response?.status === 401) {
      console.warn('🔒 Authentication expired, clearing tokens');
      clearAuth();
      clearCSRFToken();
      
      // Only show warning if not on login page
      if (typeof window !== 'undefined' && window.location?.pathname !== '/login') {
        console.warn('Authentication expired, please log in again');
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;

// Export CSRF token functions for manual use if needed
export { getCSRFToken, clearCSRFToken };
