import { body, param, validationResult } from 'express-validator';

// Validation rules for RFQ creation
export const validateRFQ = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be 3-200 characters')
    .escape(),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description must be maximum 2000 characters')
    .escape(),
  body('department')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Department must be maximum 100 characters')
    .escape(),
  body('currency')
    .optional()
    .trim()
    .isIn(['INR', 'USD', 'EUR', 'GBP'])
    .withMessage('Currency must be one of: INR, USD, EUR, GBP'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item is required'),
  body('items.*.productText')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Product text must be 1-500 characters')
    .escape(),
  body('items.*.productId')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Product ID must be maximum 100 characters')
    .escape(),
  body('items.*.quantity')
    .isNumeric()
    .isFloat({ min: 0.01 })
    .withMessage('Quantity must be a positive number'),
  body('items.*.uom')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Unit of measure must be 1-50 characters')
    .escape(),
  body('items.*.targetDeliveryDays')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Target delivery days must be between 1 and 365'),
  body('config.weights.price')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Price weight must be between 0 and 1'),
  body('config.weights.delivery')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Delivery weight must be between 0 and 1'),
  body('config.weights.vendor')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Vendor weight must be between 0 and 1'),
  body('config.weights.compliance')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Compliance weight must be between 0 and 1'),
  handleValidationErrors
];

// Validation rules for login
export const validateLogin = [
  body('username')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Username must be 2-50 characters')
    .matches(/^[a-zA-Z0-9_.-]+$/)
    .withMessage('Username can only contain letters, numbers, dots, hyphens, and underscores')
    .escape(),
  body('password')
    .isLength({ min: 1, max: 128 }) // More lenient for testing
    .withMessage('Password is required'),
  handleValidationErrors
];

// Validation rules for quote submission
export const validateQuote = [
  body('rfq')
    .isMongoId()
    .withMessage('Valid RFQ ID is required'),
  body('supplierName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Supplier name must be 2-100 characters')
    .escape(),
  body('supplierContact')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Supplier contact must be maximum 200 characters')
    .escape(),
  body('currency')
    .optional()
    .trim()
    .isIn(['INR', 'USD', 'EUR', 'GBP'])
    .withMessage('Currency must be one of: INR, USD, EUR, GBP'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one quote item is required'),
  body('items.*.productText')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Product text must be 1-500 characters')
    .escape(),
  body('items.*.productId')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Product ID must be maximum 100 characters')
    .escape(),
  body('items.*.quantity')
    .isNumeric()
    .isFloat({ min: 0.01 })
    .withMessage('Quantity must be a positive number'),
  body('items.*.uom')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Unit of measure must be 1-50 characters')
    .escape(),
  body('items.*.unitPrice')
    .isNumeric()
    .isFloat({ min: 0 })
    .withMessage('Unit price must be a non-negative number'),
  body('items.*.totalPrice')
    .isNumeric()
    .isFloat({ min: 0 })
    .withMessage('Total price must be a non-negative number'),
  body('items.*.deliveryDays')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Delivery days must be a non-negative integer'),
  body('items.*.freight')
    .optional()
    .isNumeric()
    .isFloat({ min: 0 })
    .withMessage('Freight must be a non-negative number'),
  body('items.*.insurance')
    .optional()
    .isNumeric()
    .isFloat({ min: 0 })
    .withMessage('Insurance must be a non-negative number'),
  body('items.*.customsDuty')
    .optional()
    .isNumeric()
    .isFloat({ min: 0 })
    .withMessage('Customs duty must be a non-negative number'),
  body('items.*.amc')
    .optional()
    .isNumeric()
    .isFloat({ min: 0 })
    .withMessage('AMC must be a non-negative number'),
  body('items.*.warranty')
    .optional()
    .isNumeric()
    .isFloat({ min: 0 })
    .withMessage('Warranty must be a non-negative number'),
  body('items.*.installation')
    .optional()
    .isNumeric()
    .isFloat({ min: 0 })
    .withMessage('Installation must be a non-negative number'),
  body('items.*.training')
    .optional()
    .isNumeric()
    .isFloat({ min: 0 })
    .withMessage('Training must be a non-negative number'),
  body('items.*.taxes')
    .optional()
    .isNumeric()
    .isFloat({ min: 0 })
    .withMessage('Taxes must be a non-negative number'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Notes must be maximum 2000 characters')
    .escape(),
  handleValidationErrors
];

// Validation rules for MongoDB ObjectId parameters
export const validateObjectId = (paramName = 'id') => [
  param(paramName)
    .isMongoId()
    .withMessage(`Invalid ${paramName} format. Must be a 24-character hexadecimal string.`),
  handleValidationErrors
];

// Middleware to handle validation errors
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'validation_failed',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
}

// Validation rules for user creation
export const validateUserCreation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be 3-30 characters')
    .matches(/^[a-zA-Z0-9_.-]+$/)
    .withMessage('Username can only contain letters, numbers, dots, hyphens, and underscores')
    .escape(),
  body('password')
    .isLength({ min: 6, max: 128 })
    .withMessage('Password must be 6-128 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Must be a valid email address'),
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be 1-50 characters')
    .escape(),
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be 1-50 characters')
    .escape(),
  body('position')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Position must be 100 characters or less')
    .escape(),
  body('department')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Department must be 100 characters or less')
    .escape(),
  body('accessLevel')
    .optional()
    .isIn(['basic', 'intermediate', 'advanced', 'admin'])
    .withMessage('Access level must be basic, intermediate, advanced, or admin'),
  body('roles')
    .optional()
    .isArray()
    .withMessage('Roles must be an array'),
  handleValidationErrors
];

// Validation rules for user updates
export const validateUserUpdate = [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be 3-30 characters')
    .matches(/^[a-zA-Z0-9_.-]+$/)
    .withMessage('Username can only contain letters, numbers, dots, hyphens, and underscores')
    .escape(),
  body('password')
    .optional()
    .isLength({ min: 6, max: 128 })
    .withMessage('Password must be 6-128 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Must be a valid email address'),
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be 1-50 characters')
    .escape(),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be 1-50 characters')
    .escape(),
  body('position')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Position must be 100 characters or less')
    .escape(),
  body('department')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Department must be 100 characters or less')
    .escape(),
  body('accessLevel')
    .optional()
    .isIn(['basic', 'intermediate', 'advanced', 'admin'])
    .withMessage('Access level must be basic, intermediate, advanced, or admin'),
  body('roles')
    .optional()
    .isArray()
    .withMessage('Roles must be an array'),
  body('active')
    .optional()
    .isBoolean()
    .withMessage('Active must be a boolean'),
  handleValidationErrors
];

// Validation rules for password reset
export const validatePasswordReset = [
  body('newPassword')
    .isLength({ min: 6, max: 128 })
    .withMessage('New password must be 6-128 characters'),
  handleValidationErrors
];

export default {
  validateRFQ,
  validateLogin,
  validateQuote,
  validateObjectId,
  validateUserCreation,
  validateUserUpdate,
  validatePasswordReset,
  handleValidationErrors
};
