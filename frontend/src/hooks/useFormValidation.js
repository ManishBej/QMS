/**
 * React hooks for form validation
 * Provides React-specific validation functionality using the core validation utilities
 */

import React, { useState, useCallback } from 'react';
import { validateField, validateForm } from './validationCore.js';

/**
 * Create a validation hook for React components
 * @param {Object} initialData - Initial form data
 * @param {Object} validationSchema - Validation schema
 * @returns {Object} Validation state and methods
 */
export const useFormValidation = (initialData = {}, validationSchema = {}) => {
  const [formData, setFormData] = useState(initialData);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isValid, setIsValid] = useState(true);
  const [touched, setTouched] = useState({});

  const validateSingleField = useCallback((fieldName, value) => {
    const rules = validationSchema[fieldName] || [];
    const result = validateField(value, rules, fieldName);
    
    setFieldErrors(prev => ({
      ...prev,
      [fieldName]: result.isValid ? [] : result.errors
    }));

    return result;
  }, [validationSchema]);

  const validateAllFields = useCallback(() => {
    const result = validateForm(formData, validationSchema);
    setFieldErrors(result.fieldErrors);
    setIsValid(result.isValid);
    return result;
  }, [formData, validationSchema]);

  const updateField = useCallback((fieldName, value) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    
    if (touched[fieldName]) {
      validateSingleField(fieldName, value);
    }
  }, [touched, validateSingleField]);

  const markFieldTouched = useCallback((fieldName) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
    validateSingleField(fieldName, formData[fieldName]);
  }, [formData, validateSingleField]);

  const resetForm = useCallback((newData = initialData) => {
    setFormData(newData);
    setFieldErrors({});
    setIsValid(true);
    setTouched({});
  }, [initialData]);

  return {
    formData,
    fieldErrors,
    isValid,
    touched,
    updateField,
    markFieldTouched,
    validateAllFields,
    resetForm,
    setFormData
  };
};

export default {
  useFormValidation
};
