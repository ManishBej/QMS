import { Router } from 'express';
import productsRouter from './products.js';
import reportsRouter from './reports.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '../models/User.js';
import { connectDb } from '../config/db.js';
import { signToken, authenticate, setTokenCookie, clearTokenCookie } from '../middleware/auth.js';
import requireRole from '../middleware/roles.js';
import { validateLogin, validateRFQ, validateQuote, validateObjectId } from '../middleware/validation.js';
import { body, param, validationResult } from 'express-validator';
import { validateRFQOwnership } from '../middleware/ownership.js';
import { csrfProtection } from '../middleware/csrf.js';
import RFQ from '../models/RFQ.js';
import Quote from '../models/Quote.js';
import { exportRfqExcel } from '../controllers/exportController.js';
import multer from 'multer';
import path from 'path';
import { getUploadConfig } from '../config/index.js';

// Use shared token store
import { tokenStore } from '../utils/tokenStore.js';
import approvalsRouter from './approvals.js';
import userRouter from './users.js';
import quotesRouter from './quotes.js';
import { runOnce as runWeeklyReportOnce } from '../jobs/weeklyReport.js';
import { validateQuoteOwnership } from '../middleware/ownership.js';

const router = Router();

// File upload setup (memory storage, validate type & size)
const uploadCfg = getUploadConfig();
const storage = multer.memoryStorage();
const allowedExt = new Set((uploadCfg.ALLOWED_TYPES || []).map(t => t.toLowerCase()));
const upload = multer({
  storage,
  limits: { fileSize: uploadCfg.MAX_FILE_SIZE || 10 * 1024 * 1024, files: 10 },
  fileFilter: (req, file, cb) => {
    try {
      const ext = path.extname(file.originalname || '').slice(1).toLowerCase();
      if (!ext || !allowedExt.has(ext)) {
        return cb(new Error(`unsupported_file_type:${ext || 'unknown'}`));
      }
      cb(null, true);
    } catch (e) {
      cb(new Error('file_filter_error'));
    }
  }
});

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

router.get('/health', (req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

router.use(productsRouter);
router.use(reportsRouter);
router.use(approvalsRouter);
router.use('/users', userRouter);
router.use('/quotes', quotesRouter);

// Default route
router.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the QMS API',
    version: '0.1.0',
    documentation: '/api-docs'
  });
});

// CSRF token generation
router.get('/csrf-token', authenticate, (req, res) => {
  // Generate a token directly without middleware
  const token = crypto.randomBytes(32).toString('hex');
  
  // Use the same session ID logic as the CSRF middleware
  const sessionId = req.user?.userId ? `user_${req.user.userId}` : 
                   req.user?.sub ? `sub_${req.user.sub}` : 
                   `ip_${req.ip || req.connection.remoteAddress || 'unknown'}`;
  
  const expiresAt = Date.now() + 3600000; // 1 hour
  
  // Store in the token store
  tokenStore.set(token, {
    sessionId,
    created: Date.now(),
    expiresAt,
    used: false
  });
  
  console.log('🛡️ CSRF Token generated:', {
    token: token.substring(0, 16) + '...',
    sessionId,
    endpoint: '/csrf-token',
    authenticated: !!req.user
  });
  
  // Set CORS headers explicitly for this endpoint to ensure they're included
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Expose-Headers', 'X-CSRF-Token, x-csrf-token');
  
  // Return the token in both header and body with consistent naming
  res.setHeader('X-CSRF-Token', token);
  
  // Return token in the response body
  res.json({ token: token });
});

// Login route - CSRF protection is explicitly bypassed for initial login
router.post('/login', validateLogin, async (req, res) => {
  try {
    // Set CORS headers explicitly for login endpoint
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token, x-csrf-token');
    
    await connectDb();
    const { username, password } = req.body;
    
    console.log(`Login attempt for user: ${username}`);
    
    const user = await User.findOne({ $or: [{ username }, { email: username }] });

    if (!user) {
      console.log(`User not found: ${username}`);
      return res.status(401).json({ error: 'invalid_credentials' });
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      console.log(`Account locked: ${username}`);
      return res.status(403).json({
        error: 'account_locked',
        message: `Account locked. Try again after ${Math.ceil((user.lockUntil - new Date()) / 60000)} minutes.`
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      console.log(`Invalid password for: ${username}`);
      user.loginAttempts += 1;
      if (user.loginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // Lock for 15 mins
      }
      await user.save();
      return res.status(401).json({ error: 'invalid_credentials' });
    }

    console.log(`Login successful for: ${username}`);
    user.loginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    const token = signToken(user);
    // Don't set HttpOnly cookie for cross-domain deployments
    // setTokenCookie(res, token);
    
    console.log('🔐 JWT token generated for login:', token.substring(0, 20) + '...');
    
    // Standardized response format with token in response body
    res.json({
      success: true,
      message: 'Login successful',
      token: token, // Return JWT token directly
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        roles: user.roles,
        accessLevel: user.accessLevel
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

// Logout route
router.post('/logout', (req, res) => {
  clearTokenCookie(res);
  res.json({ message: 'Logout successful' });
});

// Get current user profile
router.get('/me', authenticate, async (req, res) => {
  try {
    await connectDb();
    const user = await User.findById(req.user.userId)
      .select('-passwordHash')
      .populate('defaultApprover', 'firstName lastName username position department')
      .lean();

    if (!user) {
      // This case might happen if the user was deleted but the token is still valid
      clearTokenCookie(res);
      return res.status(404).json({ error: 'user_not_found' });
    }

    // Manually add virtuals since we are using lean() for performance
    const userProfile = {
      ...user,
      fullName: `${user.firstName} ${user.lastName}`,
      isLocked: user.lockUntil && user.lockUntil > new Date(),
    };
    
    res.json(userProfile);
  } catch (error) {
    console.error('Get current user (/me) error:', error);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

// RFQ routes
router.post('/rfqs', authenticate, csrfProtection(['POST']), validateRFQ, async (req, res) => {
  try {
    await connectDb();
    
    // Create RFQ with prototype structure
    const rfqData = {
      ...req.body,
      createdBy: req.user.userId,
      status: req.body.status || 'OPEN',
      // Ensure config.weights exists with defaults
      config: {
        weights: {
          price: 0.5,
          delivery: 0.2,
          vendor: 0.2,
          compliance: 0.1,
          ...req.body.config?.weights
        }
      }
    };
    
    const newRfq = new RFQ(rfqData);
    await newRfq.save();
    
    // Populate response for frontend
    await newRfq.populate('createdBy', 'username');
    
    res.status(201).json({
      success: true,
      message: 'RFQ created successfully',
      rfq: newRfq
    });
  } catch (error) {
    console.error('RFQ creation error:', error);
    res.status(400).json({ 
      success: false,
      error: 'Failed to create RFQ',
      message: error.message,
      details: error.errors ? Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      })) : undefined
    });
  }
});

router.get('/rfqs', authenticate, async (req, res) => {
  try {
    await connectDb();
    const rfqs = await RFQ.find()
      .populate('createdBy', 'username')
      .populate('quotes');
    res.json(rfqs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Alias for secure RFQs (compatibility with frontend)
router.get('/secure/rfqs', authenticate, async (req, res) => {
  try {
    await connectDb();
    const rfqs = await RFQ.find()
      .populate('createdBy', 'username')
      .populate('quotes');
    res.json(rfqs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/rfqs/:id', authenticate, validateObjectId('id'), async (req, res) => {
  try {
    await connectDb();
    const rfq = await RFQ.findById(req.params.id)
      .populate('createdBy', 'username')
      .populate('quotes');
    if (!rfq) return res.status(404).json({ error: 'RFQ not found' });
    res.json(rfq);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/rfqs/:id', authenticate, csrfProtection(['PUT']), validateObjectId('id'), validateRFQOwnership, validateRFQ, async (req, res) => {
  try {
    await connectDb();
    const updatedRfq = await RFQ.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedRfq) return res.status(404).json({ error: 'RFQ not found' });
    res.json(updatedRfq);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/rfqs/:id', authenticate, csrfProtection(['DELETE']), validateObjectId('id'), validateRFQOwnership, async (req, res) => {
  try {
    await connectDb();
    const deletedRfq = await RFQ.findByIdAndDelete(req.params.id);
    if (!deletedRfq) return res.status(404).json({ error: 'RFQ not found' });
    res.json({ message: 'RFQ deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Quote routes
router.post('/quotes', authenticate, csrfProtection(['POST']), validateQuote, async (req, res) => {
  try {
    await connectDb();
    
    // Verify RFQ exists and get its details
    const rfq = await RFQ.findById(req.body.rfq);
    if (!rfq) {
      return res.status(404).json({ 
        success: false,
        error: 'RFQ not found',
        message: 'The specified RFQ does not exist or has been deleted'
      });
    }
    
    // Get user's default approver
    const user = await User.findById(req.user.userId).populate('defaultApprover', 'firstName lastName username');
    const defaultApprover = user?.defaultApprover;
    
    // Check if quote already exists for this vendor and RFQ (replace if exists)
    const existingQuote = await Quote.findOne({
      rfq: req.body.rfq,
      supplierName: { $regex: new RegExp(`^${req.body.supplierName}$`, 'i') }
    });
    
    if (existingQuote) {
      // Update existing quote
      Object.assign(existingQuote, {
        ...req.body,
        submittedBy: req.user.userId,
        submittedAt: new Date(),
        // Only set approver if not already set and user has default approver
        ...((!existingQuote.approvedBy && defaultApprover) && { approvedBy: defaultApprover._id })
      });
      await existingQuote.save();
      await existingQuote.populate('rfq submittedBy approvedBy', 'title username firstName lastName');
      
      return res.status(200).json({
        success: true,
        message: `Quote updated for ${req.body.supplierName}`,
        quote: existingQuote
      });
    } else {
      // Create new quote
      const newQuote = new Quote({ 
        ...req.body, 
        submittedBy: req.user.userId,
        status: req.body.status || 'SUBMITTED',
        // Auto-populate approver from user's default
        ...(defaultApprover && { approvedBy: defaultApprover._id })
      });
      await newQuote.save();
      await newQuote.populate('rfq submittedBy approvedBy', 'title username firstName lastName');
      
      return res.status(201).json({
        success: true,
        message: `Quote saved for ${req.body.supplierName}`,
        quote: newQuote
      });
    }
  } catch (error) {
    console.error('Quote creation error:', error);
    res.status(400).json({ 
      success: false,
      error: 'Failed to save quote',
      message: error.message,
      details: error.errors ? Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      })) : undefined
    });
  }
});

// Get all quotes
router.get('/quotes', authenticate, async (req, res) => {
  try {
    await connectDb();
    const quotes = await Quote.find()
      .populate('rfq', 'title status currency department')
      .populate('submittedBy', 'username')
      .sort({ submittedAt: -1 });
    res.json(quotes);
  } catch (error) {
    console.error('Get quotes error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch quotes',
      message: error.message 
    });
  }
});

// Get quotes for a specific RFQ
router.get('/rfqs/:id/quotes', authenticate, validateObjectId('id'), async (req, res) => {
  try {
    await connectDb();
    const quotes = await Quote.find({ rfq: req.params.id })
      .populate('rfq', 'title status currency department')
      .populate('submittedBy', 'username')
      .sort({ submittedAt: -1 });
    res.json(quotes);
  } catch (error) {
    console.error('Get RFQ quotes error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch quotes for RFQ',
      message: error.message 
    });
  }
});

// Nested route for creating quotes for a specific RFQ
router.post('/rfqs/:id/quotes', authenticate, csrfProtection(['POST']), validateObjectId('id'), [
  body('supplierName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Supplier name must be 2-100 characters')
    .escape(),
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one quote item is required'),
  body('items.*.sku')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('SKU must be 1-100 characters')
    .escape(),
  body('items.*.quantity')
    .isNumeric()
    .isFloat({ min: 0.01 })
    .withMessage('Quantity must be a positive number'),
  body('items.*.unitPrice')
    .isNumeric()
    .isFloat({ min: 0 })
    .withMessage('Unit price must be a non-negative number'),
  body('items.*.currency')
    .optional()
    .trim()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be 3 characters')
    .escape(),
  body('items.*.leadTimeDays')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Lead time must be a non-negative integer'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes must be maximum 1000 characters')
    .escape(),
  handleValidationErrors
], async (req, res) => {
  try {
    await connectDb();
    
    // Verify RFQ exists
    const rfq = await RFQ.findById(req.params.id);
    if (!rfq) {
      return res.status(404).json({ error: 'RFQ not found' });
    }
    
    // Create quote with RFQ reference
    const newQuote = new Quote({ 
      ...req.body, 
      rfq: req.params.id,
      submittedBy: req.user.userId 
    });
    
    await newQuote.save();
    res.status(201).json(newQuote);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Attachments: list metadata
router.get('/quotes/:id/attachments', authenticate, validateObjectId('id'), validateQuoteOwnership(), async (req, res) => {
  try {
    await connectDb();
    const quote = await Quote.findById(req.params.id).lean();
    if (!quote) return res.status(404).json({ error: 'quote_not_found' });
    const attachments = (quote.attachments || []).map(a => ({
      _id: a._id,
      filename: a.filename,
      contentType: a.contentType,
      size: a.size,
      checksum: a.checksum,
      uploadedBy: a.uploadedBy,
      uploadedAt: a.uploadedAt
    }));
    res.json({ attachments });
  } catch (error) {
    console.error('List attachments error:', error);
    res.status(500).json({ error: 'failed_to_list_attachments' });
  }
});

// Attachments: upload one or more files
router.post('/quotes/:id/attachments', authenticate, csrfProtection(['POST']), validateObjectId('id'), validateQuoteOwnership(), upload.array('files', 10), async (req, res) => {
  try {
    await connectDb();
    const quote = await Quote.findById(req.params.id);
    if (!quote) return res.status(404).json({ error: 'quote_not_found' });

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'no_files_uploaded' });
    }

    const added = [];
    for (const f of req.files) {
      const checksum = crypto.createHash('sha256').update(f.buffer).digest('hex');
      // Prevent duplicate by checksum+filename
      const exists = (quote.attachments || []).some(a => a.checksum === checksum && a.filename === f.originalname);
      if (exists) {
        continue; // skip duplicates silently
      }
      quote.attachments.push({
        filename: f.originalname,
        contentType: f.mimetype,
        size: f.size,
        data: f.buffer,
        checksum,
        uploadedBy: req.user.userId || req.user.sub,
        uploadedAt: new Date()
      });
      added.push({ filename: f.originalname, size: f.size });
    }

    await quote.save();
    res.status(201).json({ success: true, addedCount: added.length, added });
  } catch (error) {
    console.error('Upload attachments error:', error);
    const msg = typeof error?.message === 'string' && error.message.startsWith('unsupported_file_type')
      ? 'unsupported_file_type'
      : 'failed_to_upload_attachments';
    res.status(400).json({ error: msg, message: error.message });
  }
});

// Attachments: download
router.get('/quotes/:id/attachments/:attId/download', authenticate, validateObjectId('id'), validateObjectId('attId'), validateQuoteOwnership(), async (req, res) => {
  try {
    await connectDb();
    const quote = await Quote.findById(req.params.id).select('attachments').lean();
    if (!quote) return res.status(404).json({ error: 'quote_not_found' });
    const att = (quote.attachments || []).find(a => a._id?.toString() === req.params.attId);
    if (!att) return res.status(404).json({ error: 'attachment_not_found' });

    // Need a second query to get the binary data because of select:false on data
    const qWithData = await Quote.findOne({ _id: req.params.id, 'attachments._id': req.params.attId }, { 'attachments.$': 1 });
    const aFull = qWithData?.attachments?.[0];
    if (!aFull?.data) return res.status(404).json({ error: 'attachment_data_missing' });

    res.setHeader('Content-Type', aFull.contentType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${aFull.filename}"`);
    res.send(aFull.data);
  } catch (error) {
    console.error('Download attachment error:', error);
    res.status(500).json({ error: 'failed_to_download_attachment' });
  }
});

// Attachments: delete
router.delete('/quotes/:id/attachments/:attId', authenticate, csrfProtection(['DELETE']), validateObjectId('id'), validateObjectId('attId'), validateQuoteOwnership(), async (req, res) => {
  try {
    await connectDb();
    const quote = await Quote.findById(req.params.id);
    if (!quote) return res.status(404).json({ error: 'quote_not_found' });

    const before = quote.attachments?.length || 0;
    quote.attachments = (quote.attachments || []).filter(a => a._id.toString() !== req.params.attId);
    const after = quote.attachments.length;
    if (after === before) return res.status(404).json({ error: 'attachment_not_found' });
    await quote.save();
    res.json({ success: true, removed: before - after });
  } catch (error) {
    console.error('Delete attachment error:', error);
    res.status(500).json({ error: 'failed_to_delete_attachment' });
  }
});

// Admin-only job trigger
router.post('/jobs/run/weekly-report', authenticate, requireRole(['admin']), csrfProtection(['POST']), async (req, res) => {
  try {
    console.log('Manual trigger for weekly report job received.');
    await runWeeklyReportOnce();
    res.status(202).json({ message: 'Weekly report job triggered successfully.' });
  } catch (error) {
    console.error('Failed to trigger weekly report job:', error);
    res.status(500).json({ error: 'job_trigger_failed' });
  }
});

// Export routes
router.get('/export/rfq-excel', authenticate, requireRole(['admin', 'procurement']), exportRfqExcel);
router.get('/rfqs/:id/export', authenticate, requireRole(['admin', 'procurement']), exportRfqExcel);

export default router;
