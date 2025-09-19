import { Router } from 'express';
import { connectDb } from '../config/db.js';
import Quote from '../models/Quote.js';
import RFQ from '../models/RFQ.js';
import { authenticate } from '../middleware/auth.js';
import { csrfProtection } from '../middleware/csrf.js';
import { validateQuote } from '../middleware/validation.js';
import { 
  checkQuoteEditPermission, 
  updateQuoteWithStatusReset,
  canEditQuote 
} from '../middleware/quotePermissions.js';

const router = Router();

// Get user's own quotes
router.get('/my', authenticate, async (req, res) => {
  try {
    await connectDb();
    const quotes = await Quote.find({ submittedBy: req.user.userId })
      .populate('rfq', 'title status currency department')
      .populate('submittedBy', 'username')
      .populate('lastEditedBy', 'username')
      .sort({ lastEditedAt: -1, createdAt: -1 });
    
    res.json({
      success: true,
      quotes,
      count: quotes.length
    });
  } catch (error) {
    console.error('Get my quotes error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch your quotes',
      message: error.message 
    });
  }
});

// Get quotes user can manage (based on role permissions)
router.get('/manageable', authenticate, async (req, res) => {
  try {
    await connectDb();
    const userRoles = req.user.roles || [];
    let query = {};
    
    // Admin and Advanced users: all quotes
    if (userRoles.includes('admin') || userRoles.includes('advanced')) {
      // No filter - get all quotes
    }
    // Intermediate users: all quotes (will filter edit permissions later)
    else if (userRoles.includes('intermediate')) {
      // No filter - get all quotes, permission filtering in frontend
    }
    // Basic users: only their own quotes
    else if (userRoles.includes('basic')) {
      query.submittedBy = req.user.userId;
    }
    
    const quotes = await Quote.find(query)
      .populate('rfq', 'title status currency department')
      .populate('submittedBy', 'username firstName lastName')
      .populate('lastEditedBy', 'username firstName lastName')
      .sort({ lastEditedAt: -1, createdAt: -1 });
    
    // Add permission info for each quote
    const quotesWithPermissions = quotes.map(quote => {
      // Handle both populated and non-populated submittedBy
      const submittedById = quote.submittedBy?._id ? 
        quote.submittedBy._id.toString() : 
        quote.submittedBy?.toString();
      
      return {
        ...quote.toObject(),
        canEdit: canEditQuote(req.user, quote),
        isOwner: submittedById === req.user.userId
      };
    });
    
    res.json({
      success: true,
      quotes: quotesWithPermissions,
      count: quotesWithPermissions.length,
      userRole: userRoles
    });
  } catch (error) {
    console.error('Get manageable quotes error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch manageable quotes',
      message: error.message 
    });
  }
});

// Get specific quote for editing (with permission check)
router.get('/:id/edit-info', authenticate, async (req, res) => {
  try {
    await connectDb();
    const quote = await Quote.findById(req.params.id)
      .populate('rfq', 'title status currency department items')
      .populate('submittedBy', 'username')
      .populate('lastEditedBy', 'username');
    
    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }
    
    const canEdit = canEditQuote(req.user, quote);
    const isOwner = quote.submittedBy._id.toString() === req.user.userId;
    
    res.json({
      success: true,
      quote,
      permissions: {
        canEdit,
        isOwner,
        userRoles: req.user.roles || []
      }
    });
  } catch (error) {
    console.error('Get quote edit info error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch quote information',
      message: error.message 
    });
  }
});

// Update specific quote (with permission check and auto-status reset)
router.put('/:id', authenticate, csrfProtection(['PUT']), checkQuoteEditPermission, validateQuote, async (req, res) => {
  try {
    await connectDb();
    
    // Get the original approval status for comparison
    const originalStatus = req.quote.approvalStatus;
    
    // Update quote with automatic status reset logic
    const updatedQuote = await updateQuoteWithStatusReset(
      req.params.id,
      req.body,
      req.user
    );
    
    // Prepare response message
    let message = 'Quote updated successfully';
    if (originalStatus !== updatedQuote.approvalStatus) {
      if (originalStatus === 'UNDER_REVIEW') {
        message += '. Status reset to SUBMITTED as quote was under review.';
      } else if (originalStatus === 'APPROVED') {
        message += '. Status reset to SUBMITTED - quote will require re-approval.';
      }
    }
    
    res.json({
      success: true,
      message,
      quote: updatedQuote,
      statusChanged: originalStatus !== updatedQuote.approvalStatus,
      originalStatus,
      newStatus: updatedQuote.approvalStatus
    });
  } catch (error) {
    console.error('Update quote error:', error);
    res.status(400).json({ 
      success: false,
      error: 'Failed to update quote',
      message: error.message 
    });
  }
});

// Delete specific quote (with permission check)
router.delete('/:id', authenticate, csrfProtection(['DELETE']), checkQuoteEditPermission, async (req, res) => {
  try {
    await connectDb();
    
    await Quote.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'Quote deleted successfully'
    });
  } catch (error) {
    console.error('Delete quote error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete quote',
      message: error.message 
    });
  }
});

// Get all quotes (admin/reporting purposes)
router.get('/all', authenticate, async (req, res) => {
  try {
    await connectDb();
    
    // Only advanced users can access all quotes unrestricted
    const userRoles = req.user.roles || [];
    if (!userRoles.includes('advanced') && !userRoles.includes('admin')) {
      return res.status(403).json({ 
        error: 'Access denied. Advanced role required.' 
      });
    }
    
    const { page = 1, limit = 50, status, supplier } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    let query = {};
    if (status) query.approvalStatus = status;
    if (supplier) query.supplierName = new RegExp(supplier, 'i');
    
    const quotes = await Quote.find(query)
      .populate('rfq', 'title status currency department')
      .populate('submittedBy', 'username')
      .populate('lastEditedBy', 'username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Quote.countDocuments(query);
    
    res.json({
      success: true,
      quotes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get all quotes error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch quotes',
      message: error.message 
    });
  }
});

// Get quote data for editing
router.get('/:id/edit-data', authenticate, async (req, res) => {
  try {
    await connectDb();
    const quote = await Quote.findById(req.params.id)
      .populate('rfq', 'title status currency department items')
      .populate('submittedBy', 'username firstName lastName');
    
    if (!quote) {
      return res.status(404).json({
        success: false,
        error: 'Quote not found'
      });
    }
    
    // Check edit permissions
    if (!canEditQuote(req.user, quote)) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to edit this quote'
      });
    }
    
    res.json({
      success: true,
      quote: quote.toObject(),
      canEdit: true,
      editInfo: {
        currentStatus: quote.approvalStatus,
        willResetTo: quote.approvalStatus === 'APPROVED' ? 'SUBMITTED' : 
                     (quote.approvalStatus === 'UNDER_REVIEW' ? 'SUBMITTED' : quote.approvalStatus)
      }
    });
    
  } catch (error) {
    console.error('Get quote edit data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch quote data',
      message: error.message
    });
  }
});

// Bulk edit quotes
router.put('/bulk-edit', authenticate, async (req, res) => {
  try {
    await connectDb();
    const { quoteIds, updates } = req.body;
    
    if (!quoteIds || !Array.isArray(quoteIds) || quoteIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Quote IDs array is required'
      });
    }
    
    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Updates object is required'
      });
    }
    
    const results = [];
    const errors = [];
    
    for (const quoteId of quoteIds) {
      try {
        // Check permissions for each quote
        const quote = await Quote.findById(quoteId);
        if (!quote) {
          errors.push({ quoteId, error: 'Quote not found' });
          continue;
        }
        
        if (!canEditQuote(req.user, quote)) {
          errors.push({ quoteId, error: 'Permission denied' });
          continue;
        }
        
        // Update quote with status reset logic
        const updatedQuote = await updateQuoteWithStatusReset(quoteId, updates, req.user);
        results.push({
          quoteId,
          success: true,
          quote: updatedQuote
        });
        
      } catch (error) {
        errors.push({ quoteId, error: error.message });
      }
    }
    
    res.json({
      success: true,
      results,
      errors,
      totalProcessed: quoteIds.length,
      successCount: results.length,
      errorCount: errors.length
    });
    
  } catch (error) {
    console.error('Bulk edit quotes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk edit quotes',
      message: error.message
    });
  }
});

export default router;
