import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validateObjectId } from '../middleware/validation.js';
import { csrfProtection } from '../middleware/csrf.js';
import Product from '../models/Product.js';
import ProductMaster from '../models/ProductMaster.js';
import { connectDb } from '../config/db.js';

const router = Router();

// Products search endpoint for typeahead (must be before /:id route)
router.get('/products/search', authenticate, async (req, res) => {
  try {
    await connectDb();
    const { q = '', limit = 50, skip = 0, category, subGroup } = req.query;
    
    let results;
    let total = 0;
    
    if (category || subGroup) {
      // Category-based filtering
      results = await ProductMaster.getByCategory(category, subGroup, {
        limit: parseInt(limit),
        skip: parseInt(skip)
      });
      
      // Get total count for pagination
      let countQuery = { isActive: true };
      if (category) countQuery.groupName = new RegExp(category, 'i');
      if (subGroup) countQuery.productSubGroup = new RegExp(subGroup, 'i');
      total = await ProductMaster.countDocuments(countQuery);
    } else if (q && q.trim()) {
      // Text search
      results = await ProductMaster.searchProducts(q.trim(), {
        limit: parseInt(limit),
        skip: parseInt(skip)
      });
      
      // Get total count for search results
      total = await ProductMaster.countDocuments({
        $text: { $search: q.trim() },
        isActive: true
      });
    } else {
      // Return first N products when no search term
      results = await ProductMaster.find({ isActive: true })
        .sort({ productName: 1 })
        .skip(parseInt(skip))
        .limit(parseInt(limit));
      
      total = await ProductMaster.countDocuments({ isActive: true });
    }
    
    // Format results for frontend compatibility
    const products = results.map(product => product.toSearchResult());
    
    res.json({
      success: true,
      products: products,
      total: total,
      query: q || '',
      pagination: {
        skip: parseInt(skip),
        limit: parseInt(limit),
        hasMore: (parseInt(skip) + results.length) < total
      }
    });
  } catch (error) {
    console.error('Products search error:', error);
    res.status(500).json({ 
      success: false,
      error: 'search_failed',
      message: 'Failed to search products',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get all products
router.get('/products', authenticate, async (req, res) => {
  try {
    await connectDb();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const products = await Product.find()
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
    
    const total = await Product.countDocuments();
    
    res.json({
      success: true,
      data: products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ 
      error: 'internal_server_error',
      message: 'Failed to fetch products' 
    });
  }
});

// Get single product
router.get('/products/:id', authenticate, validateObjectId('id'), async (req, res) => {
  try {
    await connectDb();
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ 
        error: 'not_found',
        message: 'Product not found' 
      });
    }
    
    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ 
      error: 'internal_server_error',
      message: 'Failed to fetch product' 
    });
  }
});

// Create product
router.post('/products', authenticate, csrfProtection(['POST']), async (req, res) => {
  try {
    await connectDb();
    const product = new Product({
      ...req.body,
      createdBy: req.user.userId
    });
    
    await product.save();
    
    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product
    });
  } catch (error) {
    console.error('Create product error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        error: 'validation_error',
        message: error.message 
      });
    }
    res.status(500).json({ 
      error: 'internal_server_error',
      message: 'Failed to create product' 
    });
  }
});

// Update product
router.put('/products/:id', authenticate, csrfProtection(['PUT']), validateObjectId('id'), async (req, res) => {
  try {
    await connectDb();
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!product) {
      return res.status(404).json({ 
        error: 'not_found',
        message: 'Product not found' 
      });
    }
    
    res.json({
      success: true,
      message: 'Product updated successfully',
      data: product
    });
  } catch (error) {
    console.error('Update product error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        error: 'validation_error',
        message: error.message 
      });
    }
    res.status(500).json({ 
      error: 'internal_server_error',
      message: 'Failed to update product' 
    });
  }
});

// Delete product
router.delete('/products/:id', authenticate, csrfProtection(['DELETE']), validateObjectId('id'), async (req, res) => {
  try {
    await connectDb();
    const product = await Product.findByIdAndDelete(req.params.id);
    
    if (!product) {
      return res.status(404).json({ 
        error: 'not_found',
        message: 'Product not found' 
      });
    }
    
    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ 
      error: 'internal_server_error',
      message: 'Failed to delete product' 
    });
  }
});

export default router;
