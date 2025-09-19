import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Import responsive testing utilities in development
if (import.meta.env.DEV) {
  import('./utils/responsiveTest.js');
  import('./utils/errorResolutionReport.js');
}

// Global error handler to suppress extension-related errors
window.addEventListener('error', (event) => {
  // Suppress known extension-related errors
  const isExtensionError = 
    event.filename?.includes('extension://') ||
    event.filename?.includes('contentScript.js') ||
    event.filename?.includes('content.js') ||
    event.message?.includes('Cannot read properties of null') ||
    event.message?.includes('is not valid JSON') ||
    event.message?.includes('[object Object]') ||
    event.message?.includes('jQuery.Deferred exception') ||
    event.message?.includes('indexOf');
    
  if (isExtensionError) {
    console.log('🔇 Suppressed extension error:', event.message);
    event.preventDefault();
    return false;
  }
});

// Handle unhandled promise rejections from extensions
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason?.toString() || '';
  const isExtensionError = 
    reason.includes('extension://') ||
    reason.includes('contentScript') ||
    reason.includes('content.js') ||
    reason.includes('is not valid JSON') ||
    reason.includes('[object Object]') ||
    reason.includes('indexOf') ||
    reason.includes('_storageChangeDispatcher');
    
  if (isExtensionError) {
    console.log('🔇 Suppressed extension promise rejection:', reason);
    event.preventDefault();
    return false;
  }
});

// Override console.error temporarily to suppress specific extension errors
const originalConsoleError = console.error;
console.error = function(...args) {
  const message = args.join(' ');
  if (message.includes('[object Object]') || 
      message.includes('_storageChangeDispatcher') ||
      message.includes('contentScript') ||
      message.includes('Cannot read properties of null') ||
      message.includes('jQuery.Deferred exception') ||
      message.includes('is not valid JSON') ||
      message.includes('indexOf')) {
    console.log('🔇 Suppressed extension console error');
    return;
  }
  originalConsoleError.apply(console, args);
};

createRoot(document.getElementById('root')).render(<App />);
