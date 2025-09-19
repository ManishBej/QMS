import Quote from '../models/Quote.js';

/**
 * Check if user can edit a specific quote based on role and approval status
 * @param {Object} user - User object with roles and userId
 * @param {Object} quote - Quote object with approvalStatus and submittedBy
 * @returns {Boolean} - Whether user can edit the quote
 */
export const canEditQuote = (user, quote) => {
  const userRoles = user.roles || [];
  
  // Handle both populated and non-populated submittedBy
  const submittedById = quote.submittedBy?._id ? 
    quote.submittedBy._id.toString() : 
    quote.submittedBy?.toString();
  
  const isOwner = submittedById === user.userId;
  
  // Admin users: full access to everything
  if (userRoles.includes('admin')) {
    return true;
  }
  
  // Advanced users: full access to all quotes
  if (userRoles.includes('advanced')) {
    return true;
  }
  
  // Intermediate users: own quotes + ANY pre-approval quotes from others
  if (userRoles.includes('intermediate')) {
    if (isOwner) return true;
    return ['SUBMITTED', 'UNDER_REVIEW'].includes(quote.approvalStatus);
  }
  
  // Basic users: own quotes only (any state)
  if (userRoles.includes('basic')) {
    return isOwner;
  }
  
  return false;
};

/**
 * Determine new status after edit based on current status and user role
 * @param {String} currentStatus - Current approval status
 * @param {Object} user - User object with roles
 * @param {Boolean} isOwner - Whether user owns the quote
 * @returns {Object} - { newStatus, resetApproval }
 */
export const getStatusAfterEdit = (currentStatus, user, isOwner) => {
  const userRoles = user.roles || [];
  
  // Auto-reset rules
  if (currentStatus === 'UNDER_REVIEW' && !isOwner) {
    return { newStatus: 'SUBMITTED', resetApproval: true };
  }
  
  if (currentStatus === 'APPROVED') {
    return { newStatus: 'SUBMITTED', resetApproval: true };
  }
  
  return { newStatus: currentStatus, resetApproval: false };
};

/**
 * Middleware to check quote edit permissions
 */
export const checkQuoteEditPermission = async (req, res, next) => {
  try {
    const { quoteId } = req.params;
    const user = req.user;
    
    if (!quoteId) {
      return res.status(400).json({ error: 'Quote ID is required' });
    }
    
    const quote = await Quote.findById(quoteId);
    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }
    
    if (!canEditQuote(user, quote)) {
      const userRoles = user.roles || [];
      let errorMessage = 'You do not have permission to edit this quote';
      
      if (userRoles.includes('basic')) {
        errorMessage = 'Basic users can only edit their own quotes';
      } else if (userRoles.includes('intermediate')) {
        errorMessage = 'Intermediate users cannot edit approved quotes from other users';
      }
      
      return res.status(403).json({ error: errorMessage });
    }
    
    // Attach quote and ownership info to request
    req.quote = quote;
    
    // Handle both populated and non-populated submittedBy
    const submittedById = quote.submittedBy?._id ? 
      quote.submittedBy._id.toString() : 
      quote.submittedBy?.toString();
    
    req.isOwner = submittedById === user.userId;
    next();
    
  } catch (error) {
    console.error('Permission check error:', error);
    res.status(500).json({ error: 'Failed to check permissions' });
  }
};

/**
 * Update quote with automatic status reset logic
 */
export const updateQuoteWithStatusReset = async (quoteId, updates, user) => {
  const quote = await Quote.findById(quoteId);
  if (!quote) {
    throw new Error('Quote not found');
  }
  
  // Handle both populated and non-populated submittedBy
  const submittedById = quote.submittedBy?._id ? 
    quote.submittedBy._id.toString() : 
    quote.submittedBy?.toString();
  
  const isOwner = submittedById === user.userId;
  const { newStatus, resetApproval } = getStatusAfterEdit(quote.approvalStatus, user, isOwner);
  
  const updateData = {
    ...updates,
    approvalStatus: newStatus,
    lastEditedAt: new Date(),
    lastEditedBy: user.userId,
    $inc: { editCount: 1 }
  };
  
  if (resetApproval) {
    updateData.approvedAt = null;
    updateData.approvedBy = null;
  }
  
  return await Quote.findByIdAndUpdate(quoteId, updateData, { new: true })
    .populate('rfq', 'title status currency department')
    .populate('submittedBy', 'username')
    .populate('lastEditedBy', 'username');
};

export default {
  canEditQuote,
  getStatusAfterEdit,
  checkQuoteEditPermission,
  updateQuoteWithStatusReset
};
