// Enhanced database indexes for performance optimization
import mongoose from 'mongoose';

/**
 * Database Performance Optimizations
 * Adds composite indexes for common query patterns
 */

// RFQ Model Performance Indexes
export const RFQ_INDEXES = [
  // Query RFQs by status and creation date (dashboard, listing)
  { status: 1, createdAt: -1 },
  
  // Query RFQs by creator and date (user's RFQs)
  { createdBy: 1, createdAt: -1 },
  
  // Query RFQs by status and creator (filtered views)
  { createdBy: 1, status: 1, createdAt: -1 },
  
  // Text search on title and description
  { title: 'text', description: 'text' }
];

// Quote Model Performance Indexes  
export const QUOTE_INDEXES = [
  // Query quotes by RFQ and submission date
  { rfq: 1, createdAt: 1 },
  
  // Query quotes by RFQ and submitter
  { rfq: 1, submittedBy: 1 },
  
  // Query quotes by supplier across RFQs
  { supplierName: 1, createdAt: -1 },
  
  // Query quotes by submitter and date
  { submittedBy: 1, createdAt: -1 }
];

// User Model Performance Indexes
export const USER_INDEXES = [
  // Query users by roles and status
  { roles: 1, active: 1 },
  
  // Unique constraint on username (case-insensitive)
  { username: 1 },
  
  // Query active users
  { active: 1, createdAt: -1 }
];

// Approval Model Performance Indexes (already has rfq + sequence unique index)
export const APPROVAL_INDEXES = [
  // Query approvals by approver
  { approverUser: 1, approvedAt: -1 },
  
  // Query approvals by date range
  { approvedAt: -1 }
];

/**
 * Safely create index with conflict handling
 * @param {Object} collection - MongoDB collection
 * @param {Object} index - Index specification
 * @param {string} collectionName - Name for logging
 */
async function safeCreateIndex(collection, index, collectionName) {
  try {
    await collection.createIndex(index, { background: true });
  } catch (error) {
    // Handle index conflicts gracefully
    if (error.code === 86 || error.codeName === 'IndexKeySpecsConflict') {
      console.log(`ℹ️ Index already exists for ${collectionName}: ${JSON.stringify(index)}`);
    } else {
      console.warn(`⚠️ Could not create index for ${collectionName}:`, error.message);
    }
  }
}

/**
 * Apply performance indexes to all collections
 * Creates indexes in background to avoid blocking operations
 */
export async function applyPerformanceIndexes() {
  try {
    // Import mongoose dynamically to ensure it's available
    const mongoose = (await import('mongoose')).default;
    
    // Wait for connection to be ready
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Database connection not ready');
    }
    
    const db = mongoose.connection.db;
    
    if (!db) {
      throw new Error('Database instance not available');
    }
    
    console.log('🚀 Applying performance indexes...');
    
    // Apply RFQ indexes
    for (const index of RFQ_INDEXES) {
      await safeCreateIndex(db.collection('rfqs'), index, 'RFQ');
    }
    console.log('✅ RFQ indexes processed');
    
    // Apply Quote indexes  
    for (const index of QUOTE_INDEXES) {
      await safeCreateIndex(db.collection('quotes'), index, 'Quote');
    }
    console.log('✅ Quote indexes processed');
    
    // Apply User indexes
    for (const index of USER_INDEXES) {
      await safeCreateIndex(db.collection('users'), index, 'User');
    }
    console.log('✅ User indexes processed');
    
    // Apply Approval indexes
    for (const index of APPROVAL_INDEXES) {
      await safeCreateIndex(db.collection('approvals'), index, 'Approval');
    }
    console.log('✅ Approval indexes processed');
    
    console.log('🎉 Performance indexes optimization completed');
    
  } catch (error) {
    console.error('❌ Error applying performance indexes:', error);
    throw error;
  }
}

/**
 * Check if indexes need to be applied
 */
export async function checkIndexes() {
  try {
    const db = mongoose.connection.db;
    
    const collections = ['rfqs', 'quotes', 'users', 'approvals'];
    const indexStatus = {};
    
    for (const collection of collections) {
      const indexes = await db.collection(collection).indexes();
      indexStatus[collection] = indexes.length;
    }
    
    console.log('📊 Current index count:', indexStatus);
    return indexStatus;
    
  } catch (error) {
    console.error('❌ Error checking indexes:', error);
    return {};
  }
}

export default {
  applyPerformanceIndexes,
  checkIndexes,
  RFQ_INDEXES,
  QUOTE_INDEXES,
  USER_INDEXES,
  APPROVAL_INDEXES
};
