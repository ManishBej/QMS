import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  sku: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
    maxlength: 50
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  category: {
    type: String,
    trim: true,
    maxlength: 100
  },
  unit: {
    type: String,
    required: true,
    trim: true,
    maxlength: 20,
    default: 'EA'
  },
  standardPrice: {
    type: Number,
    min: 0
  },
  specifications: {
    type: Map,
    of: String,
    default: new Map()
  },
  suppliers: [{
    name: String,
    contactEmail: String,
    lastPrice: Number,
    lastPriceDate: Date
  }],
  active: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { 
  timestamps: true 
});

// Indexes for performance
productSchema.index({ category: 1 });
productSchema.index({ name: 'text', description: 'text' });

// Virtual for display name
productSchema.virtual('displayName').get(function() {
  return `${this.sku} - ${this.name}`;
});

// Ensure virtual fields are serialized
productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

export const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
export default Product;
