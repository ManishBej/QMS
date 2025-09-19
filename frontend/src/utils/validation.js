/**
 * Validation utilities - Re-exports core validation and React hooks
 * This file maintains backward compatibility while organizing code better
 */

// Core validation utilities (no React dependencies)
export {
  ValidationRules,
  validateField,
  validateForm,
  commonValidationRules,
  createDebouncedValidator
} from './validationCore.js';

// React-specific validation hooks
export { useFormValidation } from '../hooks/useFormValidation.js';

// Default export for backward compatibility
import validationCore from './validationCore.js';
import { useFormValidation } from '../hooks/useFormValidation.js';

export default {
  ...validationCore,
  useFormValidation
};
