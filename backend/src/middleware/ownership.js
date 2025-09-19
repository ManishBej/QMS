// IDOR Protection: Ownership validation middleware
import mongoose from 'mongoose';
import { connectDb } from '../config/db.js';
import RFQ from '../models/RFQ.js';
import Quote from '../models/Quote.js';
import { logger } from '../utils/logger.js';

/**
 * Validates that the authenticated user owns or has access to the RFQ
 * Prevents Insecure Direct Object References (IDOR)
 */
export function validateRFQOwnership(options = {}) {
  const { allowAdmin = true, allowAll = false } = options;
  
  return async (req, res, next) => {
    try {
      await connectDb();
      
      const rfqId = req.params.id;
      if (!rfqId) {
        return res.status(400).json({ error: 'missing_rfq_id' });
      }

      const rfq = await RFQ.findById(rfqId).lean();
      if (!rfq) {
        return res.status(404).json({ error: 'rfq_not_found' });
      }

  // Support both shapes set by authenticate middleware
  const userId = req.user?.userId || req.user?.sub;
      const userRoles = req.user.roles || [];

      // Admin can access all RFQs (if allowed)
      if (allowAdmin && userRoles.includes('admin')) {
        req.rfq = rfq; // Attach to request for later use
        return next();
      }

      // Check if user created this RFQ
      if (rfq.createdBy && rfq.createdBy.toString() === userId) {
        req.rfq = rfq;
        return next();
      }

      // Allow all authenticated users if specified (for view-only operations)
      if (allowAll) {
        req.rfq = rfq;
        return next();
      }

      logger.warn('IDOR attempt detected', {
        userId,
        rfqId,
        createdBy: rfq.createdBy,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });

      return res.status(403).json({ 
        error: 'access_denied',
        message: 'You do not have permission to access this resource'
      });

    } catch (error) {
      logger.error('Ownership validation error:', { error: error.message, rfqId: req.params.id });
      return res.status(500).json({ error: 'internal_server_error' });
    }
  };
}

/**
 * Validates quote ownership - user must own the quote or the related RFQ
 */
export function validateQuoteOwnership(options = {}) {
  const { allowAdmin = true } = options;
  
  return async (req, res, next) => {
    try {
      await connectDb();
      
      const quoteId = req.params.quoteId || req.params.id;
      if (!quoteId) {
        return res.status(400).json({ error: 'missing_quote_id' });
      }

      const quote = await Quote.findById(quoteId).populate('rfq').lean();
      if (!quote) {
        return res.status(404).json({ error: 'quote_not_found' });
      }

  // Support both shapes set by authenticate middleware
  const userId = req.user?.userId || req.user?.sub;
      const userRoles = req.user.roles || [];

      // Admin can access all quotes
      if (allowAdmin && userRoles.includes('admin')) {
        req.quote = quote;
        return next();
      }

      // Check if user submitted this quote
      if (quote.submittedBy && quote.submittedBy.toString() === userId) {
        req.quote = quote;
        return next();
      }

      // Check if user owns the related RFQ
      if (quote.rfq && quote.rfq.createdBy && quote.rfq.createdBy.toString() === userId) {
        req.quote = quote;
        return next();
      }

      logger.warn('Quote IDOR attempt detected', {
        userId,
        quoteId,
        submittedBy: quote.submittedBy,
        rfqCreatedBy: quote.rfq?.createdBy,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });

      return res.status(403).json({ 
        error: 'access_denied',
        message: 'You do not have permission to access this quote'
      });

    } catch (error) {
      logger.error('Quote ownership validation error:', { error: error.message, quoteId });
      return res.status(500).json({ error: 'internal_server_error' });
    }
  };
}

export default {
  validateRFQOwnership,
  validateQuoteOwnership
};
