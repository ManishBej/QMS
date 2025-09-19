import { useState, useEffect } from 'react';
import api from '../services/api.js';

/**
 * Hook to manage product master data loading and search
 * Now uses MongoDB backend for efficient search and pagination
 */
export const useProductMaster = () => {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalProducts, setTotalProducts] = useState(0);

  // Search products with query
  const searchProducts = async (query = '', limit = 50) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log(`🔍 Searching products: "${query}" (limit: ${limit})`);
      const response = await api.get('/products/search', {
        params: { 
          q: query.trim(),
          limit: limit 
        }
      });

      if (response.data?.success && Array.isArray(response.data.products)) {
        console.log(`✅ Found ${response.data.products.length} products (total: ${response.data.total})`);
        setProducts(response.data.products);
        setTotalProducts(response.data.total);
        return response.data.products;
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('❌ Search failed:', err);
      setError(err.message || 'Failed to search products');
      setProducts([]);
      setTotalProducts(0);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Load initial products on mount (without search query)
  useEffect(() => {
    let isMounted = true;

    const loadInitialProducts = async () => {
      setIsLoading(true);
      setError(null);

      try {
        console.log('🔄 Loading initial products...');
        const response = await api.get('/products/search', {
          params: { limit: 100 } // Load first 100 products for initial display
        });

        if (!isMounted) return;

        if (response.data?.success && Array.isArray(response.data.products)) {
          console.log(`✅ Initial products loaded: ${response.data.products.length} of ${response.data.total}`);
          setProducts(response.data.products);
          setTotalProducts(response.data.total);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('❌ Failed to load initial products:', err);
        setError(err.message || 'Failed to load products');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadInitialProducts();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array - only run once

  return {
    products,
    isLoading,
    error,
    totalProducts,
    searchProducts, // New function for dynamic search
    // Legacy compatibility
    isLoadingProducts: isLoading
  };
};
