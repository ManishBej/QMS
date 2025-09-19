/**
 * Centralized validation utilities for consistent form validation across the application
 */

import { getMessage, getConfig } from '../config/index.js';

/**
 * Validation rule definitions
 */
export const ValidationRules = {
  REQUIRED: 'required',
  EMAIL: 'email',
  MIN_LENGTH: 'minLength',
  MAX_LENGTH: 'maxLength',
  NUMERIC: 'numeric',
  POSITIVE: 'positive',
  PHONE: 'phone',
  URL: 'url',
  DATE: 'date',
  FUTURE_DATE: 'futureDate',
  PAST_DATE: 'pastDate',
  DECIMAL: 'decimal',
  INTEGER: 'integer',
  RANGE: 'range',
  PATTERN: 'pattern',
  FILE_SIZE: 'fileSize',
  FILE_TYPE: 'fileType',
  CUSTOM: 'custom'
};

/**
 * Built-in validation functions
 */
const validators = {
  [ValidationRules.REQUIRED]: (value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  },

  [ValidationRules.EMAIL]: (value) => {
    if (!value) return true; // Optional field
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  },

  [ValidationRules.MIN_LENGTH]: (value, min) => {
    if (!value) return true; // Optional field
    return value.length >= min;
  },

  [ValidationRules.MAX_LENGTH]: (value, max) => {
    if (!value) return true; // Optional field
    return value.length <= max;
  },

  [ValidationRules.NUMERIC]: (value) => {
    if (!value && value !== 0) return true; // Optional field
    return !isNaN(value) && !isNaN(parseFloat(value));
  },

  [ValidationRules.POSITIVE]: (value) => {
    if (!value && value !== 0) return true; // Optional field
    return validators[ValidationRules.NUMERIC](value) && parseFloat(value) > 0;
  },

  [ValidationRules.PHONE]: (value) => {
    if (!value) return true; // Optional field
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(value);
  },

  [ValidationRules.URL]: (value) => {
    if (!value) return true; // Optional field
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },

  [ValidationRules.DATE]: (value) => {
    if (!value) return true; // Optional field
    const date = new Date(value);
    return date instanceof Date && !isNaN(date.getTime());
  },

  [ValidationRules.FUTURE_DATE]: (value) => {
    if (!value) return true; // Optional field
    if (!validators[ValidationRules.DATE](value)) return false;
    return new Date(value) > new Date();
  },

  [ValidationRules.PAST_DATE]: (value) => {
    if (!value) return true; // Optional field
    if (!validators[ValidationRules.DATE](value)) return false;
    return new Date(value) < new Date();
  },

  [ValidationRules.DECIMAL]: (value, decimals = 2) => {
    if (!value && value !== 0) return true; // Optional field
    if (!validators[ValidationRules.NUMERIC](value)) return false;
    const decimalRegex = new RegExp(`^\\d+(\\.\\d{1,${decimals}})?$`);
    return decimalRegex.test(value.toString());
  },

  [ValidationRules.INTEGER]: (value) => {
    if (!value && value !== 0) return true; // Optional field
    return Number.isInteger(parseFloat(value));
  },

  [ValidationRules.RANGE]: (value, min, max) => {
    if (!value && value !== 0) return true; // Optional field
    if (!validators[ValidationRules.NUMERIC](value)) return false;
    const num = parseFloat(value);
    return num >= min && num <= max;
  },

  [ValidationRules.PATTERN]: (value, pattern) => {
    if (!value) return true; // Optional field
    const regex = new RegExp(pattern);
    return regex.test(value);
  },

  [ValidationRules.FILE_SIZE]: (file, maxSizeMB) => {
    if (!file) return true; // Optional field
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxSizeBytes;
  },

  [ValidationRules.FILE_TYPE]: (file, allowedTypes) => {
    if (!file) return true; // Optional field
    const fileType = file.name.split('.').pop()?.toLowerCase();
    return allowedTypes.includes(fileType);
  }
};

/**
 * Validation error message generators
 */
const errorMessages = {
  [ValidationRules.REQUIRED]: () => getMessage('validation.required'),
  [ValidationRules.EMAIL]: () => getMessage('validation.email'),
  [ValidationRules.MIN_LENGTH]: (min) => getMessage('validation.minLength', { min }),
  [ValidationRules.MAX_LENGTH]: (max) => getMessage('validation.maxLength', { max }),
  [ValidationRules.NUMERIC]: () => getMessage('validation.numeric'),
  [ValidationRules.POSITIVE]: () => getMessage('validation.positive'),
  [ValidationRules.PHONE]: () => 'Please enter a valid phone number',
  [ValidationRules.URL]: () => 'Please enter a valid URL',
  [ValidationRules.DATE]: () => 'Please enter a valid date',
  [ValidationRules.FUTURE_DATE]: () => 'Date must be in the future',
  [ValidationRules.PAST_DATE]: () => 'Date must be in the past',
  [ValidationRules.DECIMAL]: (decimals) => `Must be a decimal with at most ${decimals} decimal places`,
  [ValidationRules.INTEGER]: () => 'Must be a whole number',
  [ValidationRules.RANGE]: (min, max) => `Must be between ${min} and ${max}`,
  [ValidationRules.PATTERN]: () => 'Invalid format',
  [ValidationRules.FILE_SIZE]: (maxSizeMB) => getMessage('validation.fileSize', { max: maxSizeMB }),
  [ValidationRules.FILE_TYPE]: (allowedTypes) => getMessage('validation.fileType', { types: allowedTypes.join(', ') })
};

/**
 * Validate a single field against multiple rules
 * @param {any} value - Value to validate
 * @param {Array} rules - Array of validation rules
 * @param {string} fieldName - Name of the field (for error messages)
 * @returns {Object} Validation result with isValid and errors
 */
export const validateField = (value, rules = [], fieldName = 'Field') => {
  const errors = [];
  let isValid = true;

  for (const rule of rules) {
    const { type, params = [], message, condition } = rule;
    
    // Skip validation if condition is not met
    if (condition && !condition(value)) {
      continue;
    }

    let ruleValid = true;

    if (type === ValidationRules.CUSTOM) {
      ruleValid = rule.validator(value);
    } else if (validators[type]) {
      ruleValid = validators[type](value, ...params);
    } else {
      console.warn(`Unknown validation rule: ${type}`);
      continue;
    }

    if (!ruleValid) {
      isValid = false;
      const errorMessage = message || 
        (errorMessages[type] ? errorMessages[type](...params) : `${fieldName} is invalid`);
      errors.push(errorMessage);
    }
  }

  return { isValid, errors };
};

/**
 * Validate an entire form object
 * @param {Object} formData - Form data object
 * @param {Object} validationSchema - Validation schema
 * @returns {Object} Validation result with isValid, errors, and fieldErrors
 */
export const validateForm = (formData, validationSchema) => {
  const fieldErrors = {};
  const allErrors = [];
  let isValid = true;

  for (const [fieldName, rules] of Object.entries(validationSchema)) {
    const fieldValue = formData[fieldName];
    const fieldResult = validateField(fieldValue, rules, fieldName);
    
    if (!fieldResult.isValid) {
      isValid = false;
      fieldErrors[fieldName] = fieldResult.errors;
      allErrors.push(...fieldResult.errors);
    }
  }

  return {
    isValid,
    errors: allErrors,
    fieldErrors
  };
};

/**
 * Create validation rules for common form fields
 */
export const commonValidationRules = {
  email: [
    { type: ValidationRules.REQUIRED },
    { type: ValidationRules.EMAIL }
  ],

  password: [
    { type: ValidationRules.REQUIRED },
    { type: ValidationRules.MIN_LENGTH, params: [8] },
    { 
      type: ValidationRules.PATTERN, 
      params: ['^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'],
      message: 'Password must contain at least one lowercase letter, one uppercase letter, one digit, and one special character'
    }
  ],

  phone: [
    { type: ValidationRules.REQUIRED },
    { type: ValidationRules.PHONE }
  ],

  url: [
    { type: ValidationRules.URL }
  ],

  positiveNumber: [
    { type: ValidationRules.REQUIRED },
    { type: ValidationRules.POSITIVE }
  ],

  currency: [
    { type: ValidationRules.REQUIRED },
    { type: ValidationRules.POSITIVE },
    { type: ValidationRules.DECIMAL, params: [2] }
  ],

  requiredText: [
    { type: ValidationRules.REQUIRED },
    { type: ValidationRules.MIN_LENGTH, params: [1] }
  ],

  description: [
    { type: ValidationRules.MAX_LENGTH, params: [getConfig('business.rfq.maxDescriptionLength', 1000)] }
  ],

  file: [
    { 
      type: ValidationRules.FILE_SIZE, 
      params: [getConfig('ui.validation.maxFileSize', 10485760) / 1048576] // Convert bytes to MB
    },
    { 
      type: ValidationRules.FILE_TYPE, 
      params: [getConfig('ui.validation.allowedFileTypes', ['pdf', 'doc', 'docx'])]
    }
  ]
};

/**
 * Debounced validation for real-time form validation
 * @param {Function} validationFn - Validation function to debounce
 * @param {number} delay - Debounce delay in milliseconds
 * @returns {Function} Debounced validation function
 */
export const createDebouncedValidator = (validationFn, delay = null) => {
  const debounceDelay = delay || getConfig('ui.validation.debounceDelay', 300);
  let timeoutId;

  return (...args) => {
    clearTimeout(timeoutId);
    return new Promise((resolve) => {
      timeoutId = setTimeout(() => {
        resolve(validationFn(...args));
      }, debounceDelay);
    });
  };
};

export default {
  ValidationRules,
  validateField,
  validateForm,
  commonValidationRules,
  createDebouncedValidator
};
