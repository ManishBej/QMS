/**
 * Notification system for user feedback
 * Provides toast notifications, alerts, and confirmation dialogs
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { getConfig } from '../config/index.js';

// Notification types
export const NotificationTypes = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

// Notification context
const NotificationContext = createContext();

// Custom hook to use notifications
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

// Notification component
const NotificationItem = ({ notification, onRemove }) => {
  const { id, type, title, message, duration, actions } = notification;

  const typeStyles = {
    [NotificationTypes.SUCCESS]: 'bg-green-50 border-green-200 text-green-800',
    [NotificationTypes.ERROR]: 'bg-red-50 border-red-200 text-red-800',
    [NotificationTypes.WARNING]: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    [NotificationTypes.INFO]: 'bg-blue-50 border-blue-200 text-blue-800'
  };

  const iconStyles = {
    [NotificationTypes.SUCCESS]: '✓',
    [NotificationTypes.ERROR]: '✕',
    [NotificationTypes.WARNING]: '⚠',
    [NotificationTypes.INFO]: 'ℹ'
  };

  React.useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => onRemove(id), duration);
      return () => clearTimeout(timer);
    }
  }, [id, duration, onRemove]);

  return (
    <div className={`
      flex items-start p-4 mb-3 border rounded-lg shadow-sm
      ${typeStyles[type]}
    `}>
      <div className="flex-shrink-0 mr-3 text-lg">
        {iconStyles[type]}
      </div>
      
      <div className="flex-grow">
        {title && (
          <h4 className="font-semibold text-sm mb-1">{title}</h4>
        )}
        {message && (
          <p className="text-sm">{message}</p>
        )}
        
        {actions && actions.length > 0 && (
          <div className="mt-2 flex gap-2">
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={() => {
                  action.handler();
                  if (action.dismissOnClick !== false) {
                    onRemove(id);
                  }
                }}
                className={`
                  text-xs px-2 py-1 rounded border
                  ${action.primary 
                    ? 'bg-white border-current hover:bg-gray-50' 
                    : 'bg-transparent border-transparent hover:bg-white hover:bg-opacity-20'
                  }
                `}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
      
      <button
        onClick={() => onRemove(id)}
        className="flex-shrink-0 ml-2 text-lg leading-none hover:opacity-70"
        aria-label="Dismiss notification"
      >
        ×
      </button>
    </div>
  );
};

// Notification container
const NotificationContainer = ({ notifications, onRemove }) => {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 w-96 max-w-full">
      {notifications.map(notification => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
};

// Notification provider component
export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const maxNotifications = getConfig('ui.notifications.maxNotifications', 5);
  const defaultDuration = getConfig('ui.notifications.duration', 5000);

  const addNotification = useCallback((notification) => {
    const id = Date.now() + Math.random();
    const newNotification = {
      id,
      type: NotificationTypes.INFO,
      duration: defaultDuration,
      ...notification
    };

    setNotifications(prev => {
      const updated = [newNotification, ...prev];
      // Limit the number of notifications
      return updated.slice(0, maxNotifications);
    });

    return id;
  }, [maxNotifications, defaultDuration]);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Convenience methods for different notification types
  const showSuccess = useCallback((message, options = {}) => {
    return addNotification({
      type: NotificationTypes.SUCCESS,
      message,
      ...options
    });
  }, [addNotification]);

  const showError = useCallback((message, options = {}) => {
    return addNotification({
      type: NotificationTypes.ERROR,
      message,
      duration: 0, // Errors don't auto-dismiss by default
      ...options
    });
  }, [addNotification]);

  const showWarning = useCallback((message, options = {}) => {
    return addNotification({
      type: NotificationTypes.WARNING,
      message,
      ...options
    });
  }, [addNotification]);

  const showInfo = useCallback((message, options = {}) => {
    return addNotification({
      type: NotificationTypes.INFO,
      message,
      ...options
    });
  }, [addNotification]);

  // Confirmation dialog functionality
  const showConfirmation = useCallback((message, options = {}) => {
    return new Promise((resolve) => {
      const { 
        title = 'Confirm Action',
        confirmLabel = 'Confirm',
        cancelLabel = 'Cancel',
        type = NotificationTypes.WARNING
      } = options;

      addNotification({
        type,
        title,
        message,
        duration: 0, // Don't auto-dismiss
        actions: [
          {
            label: confirmLabel,
            primary: true,
            handler: () => resolve(true)
          },
          {
            label: cancelLabel,
            handler: () => resolve(false)
          }
        ]
      });
    });
  }, [addNotification]);

  const contextValue = {
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showConfirmation
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      <NotificationContainer 
        notifications={notifications}
        onRemove={removeNotification}
      />
    </NotificationContext.Provider>
  );
};

// HOC for automatic error notification
export const withErrorNotification = (Component) => {
  return function WrappedComponent(props) {
    const { showError } = useNotifications();
    
    const handleError = useCallback((error) => {
      const message = error?.response?.data?.message || 
                     error?.message || 
                     'An unexpected error occurred';
      showError(message);
    }, [showError]);

    return <Component {...props} onError={handleError} />;
  };
};

// Hook for API error handling
export const useApiErrorHandler = () => {
  const { showError } = useNotifications();

  return useCallback((error) => {
    let message = 'An unexpected error occurred';
    
    if (error?.response) {
      // Server responded with error status
      const status = error.response.status;
      const data = error.response.data;
      
      switch (status) {
        case 400:
          message = data?.message || 'Invalid request';
          break;
        case 401:
          message = 'Session expired. Please log in again.';
          break;
        case 403:
          message = 'You do not have permission to perform this action';
          break;
        case 404:
          message = 'The requested resource was not found';
          break;
        case 422:
          message = data?.message || 'Validation error';
          if (data?.errors) {
            // Show field-specific errors
            const fieldErrors = Object.values(data.errors).flat().join(', ');
            message += `: ${fieldErrors}`;
          }
          break;
        case 429:
          message = 'Too many requests. Please try again later.';
          break;
        case 500:
          message = 'Server error. Please try again later.';
          break;
        default:
          message = data?.message || `Server error (${status})`;
      }
    } else if (error?.request) {
      // Network error
      message = 'Network error. Please check your connection.';
    } else if (error?.message) {
      message = error.message;
    }

    showError(message);
  }, [showError]);
};

export default {
  NotificationProvider,
  useNotifications,
  withErrorNotification,
  useApiErrorHandler,
  NotificationTypes
};
