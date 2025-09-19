import mongoose from 'mongoose';

const ProductMasterSchema = new mongoose.Schema({
  productName: { 
    type: String, 
    required: true, 
    index: true,
    trim: true
  },
  productSubGroup: { 
    type: String, 
    index: true,
    trim: true
  },
  groupName: { 
    type: String, 
    index: true,
    trim: true
  },
  uniqueId: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true,
    trim: true,
    uppercase: true
  },
  searchText: { 
    type: String, 
    index: 'text' // Full-text search index
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true // Automatically manage createdAt and updatedAt
});

// Compound indexes for better search performance
ProductMasterSchema.index({ productName: 'text', uniqueId: 'text', productSubGroup: 'text' });
ProductMasterSchema.index({ groupName: 1, productSubGroup: 1 });
ProductMasterSchema.index({ isActive: 1, productName: 1 });

// Pre-save middleware to generate searchText
ProductMasterSchema.pre('save', function(next) {
  if (this.isModified('productName') || this.isModified('uniqueId') || this.isModified('productSubGroup')) {
    this.searchText = [
      this.productName,
      this.uniqueId,
      this.productSubGroup,
      this.groupName
    ].filter(Boolean).join(' ').toLowerCase();
  }
  next();
});

// Static method for text search
ProductMasterSchema.statics.searchProducts = function(searchTerm, options = {}) {
  const { limit = 50, skip = 0, includeInactive = false } = options;
  
  let query = {};
  
  if (!includeInactive) {
    query.isActive = true;
  }
  
  if (searchTerm && searchTerm.trim()) {
    // Use MongoDB text search with relevance scoring
    query.$text = { $search: searchTerm.trim() };
  }
  
  const searchQuery = this.find(query);
  
  if (searchTerm && searchTerm.trim()) {
    // Add text score for relevance sorting
    searchQuery.select({ score: { $meta: 'textScore' } });
    searchQuery.sort({ score: { $meta: 'textScore' } });
  } else {
    // Default sorting when no search term
    searchQuery.sort({ productName: 1 });
  }
  
  return searchQuery.skip(skip).limit(limit);
};

// Static method for category filtering
ProductMasterSchema.statics.getByCategory = function(groupName, productSubGroup, options = {}) {
  const { limit = 50, skip = 0 } = options;
  
  let query = { isActive: true };
  
  if (groupName) {
    query.groupName = new RegExp(groupName, 'i');
  }
  
  if (productSubGroup) {
    query.productSubGroup = new RegExp(productSubGroup, 'i');
  }
  
  return this.find(query)
    .sort({ productName: 1 })
    .skip(skip)
    .limit(limit);
};

// Instance method for formatting
ProductMasterSchema.methods.toSearchResult = function() {
  return {
    productName: this.productName,
    productSubGroup: this.productSubGroup,
    groupName: this.groupName,
    uniqueId: this.uniqueId,
    searchText: this.searchText
  };
};

const ProductMaster = mongoose.model('ProductMaster', ProductMasterSchema);

export default ProductMaster;
