import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../services/api.js';
import '../../styles/prototype-foundation.css';

/**
 * Typeahead component for product selection with server-side search
 * Features:
 * - Search-as-you-type with debounced API calls
 * - Keyboard navigation (arrow keys, enter, escape)
 * - Click to select
 * - MongoDB-powered search with relevance scoring
 * - Fallback to free text input
 */
const ProductTypeahead = ({ 
  value = '', 
  onChange, 
  onSelect,
  placeholder = "Type to search products...",
  disabled = false,
  className = "prototype-input"
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const optionRefs = useRef([]);

  // Debounced search function
  const debounceTimeout = useRef(null);
  
  const searchProducts = useCallback(async (searchTerm) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setIsOpen(false);
      setTotalResults(0);
      return;
    }

    setIsSearching(true);
    
    try {
      const response = await api.get('/products/search', {
        params: { 
          q: searchTerm.trim(),
          limit: 15 // Limit for dropdown
        }
      });

      if (response.data?.success && Array.isArray(response.data.products)) {
        setSearchResults(response.data.products);
        setTotalResults(response.data.total);
        setIsOpen(response.data.products.length > 0);
        setSelectedIndex(-1);
      } else {
        setSearchResults([]);
        setTotalResults(0);
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Product search failed:', error);
      setSearchResults([]);
      setTotalResults(0);
      setIsOpen(false);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const debouncedSearch = useCallback((searchTerm) => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    debounceTimeout.current = setTimeout(() => {
      searchProducts(searchTerm);
    }, 300); // 300ms debounce for server calls
  }, [searchProducts]);

  // Handle input change
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    if (onChange) {
      onChange(newValue);
    }
    
    if (newValue.trim()) {
      debouncedSearch(newValue);
    } else {
      setSearchResults([]);
      setIsOpen(false);
      setTotalResults(0);
    }
  };

  // Handle option selection
  const handleSelect = (product) => {
    setInputValue(product.productName);
    setIsOpen(false);
    setSelectedIndex(-1);
    
    // Call onSelect for product selection
    if (onSelect) {
      onSelect(product);
    }
    
    // DO NOT call onChange for product selection to avoid conflicts
    // onChange is only for manual typing, onSelect handles product selection
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' && searchResults.length > 0) {
        e.preventDefault();
        setIsOpen(true);
        setSelectedIndex(0);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
        
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && searchResults[selectedIndex]) {
          handleSelect(searchResults[selectedIndex]);
        }
        break;
        
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
        
      default:
        break;
    }
  };

  // Scroll selected option into view
  useEffect(() => {
    if (selectedIndex >= 0 && optionRefs.current[selectedIndex]) {
      optionRefs.current[selectedIndex].scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [selectedIndex]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          inputRef.current && !inputRef.current.contains(event.target)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    const handleScroll = () => {
      if (isOpen && dropdownRef.current && inputRef.current) {
        // Update dropdown position on scroll
        const rect = inputRef.current.getBoundingClientRect();
        
        // Check if input is still visible on screen
        if (rect.bottom < 0 || rect.top > window.innerHeight) {
          setIsOpen(false); // Close if input is scrolled out of view
          return;
        }
        
        dropdownRef.current.style.top = `${rect.bottom + window.scrollY + 2}px`;
        dropdownRef.current.style.left = `${rect.left + window.scrollX}px`;
        dropdownRef.current.style.width = `${rect.width}px`;
      }
    };

    const handleResize = () => {
      if (isOpen) {
        setIsOpen(false); // Close dropdown on window resize
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll, true); // Use capture phase
      window.addEventListener('resize', handleResize);
      
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [isOpen]);

  // Update input value when prop changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Check if current value matches a product in search results
  const isValidProduct = searchResults.some(p => 
    p.productName.toLowerCase() === inputValue.toLowerCase() ||
    p.uniqueId.toLowerCase() === inputValue.toLowerCase()
  );

  return (
    <div className="typeahead-container" style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          className={className}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (inputValue.trim() && searchResults.length > 0) {
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-describedby={inputValue.trim() && !isValidProduct ? 'product-warning' : undefined}
          style={{
            width: '100%',
            borderColor: isOpen ? 'var(--brand)' : (!isValidProduct && inputValue.trim() ? '#f59e0b' : undefined),
            boxShadow: isOpen ? '0 0 0 3px rgba(24, 180, 167, 0.1)' : undefined,
            paddingRight: isSearching ? '36px' : '12px'
          }}
        />
        
        {/* Loading indicator */}
        {isSearching && (
          <div style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '12px',
            color: 'var(--muted)'
          }}>
            ⟳
          </div>
        )}
        
        {/* Dropdown indicator */}
        {!isSearching && inputValue.trim() && (
          <div style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            fontSize: '12px',
            color: 'var(--muted)',
            transition: 'transform 0.15s ease',
            transform: `translateY(-50%) ${isOpen ? 'rotate(180deg)' : 'rotate(0deg)'}`
          }}>
            ▼
          </div>
        )}
      </div>
      
      {/* Validation indicator */}
      {inputValue.trim() && !isValidProduct && (
        <div id="product-warning" style={{ 
          fontSize: '11px', 
          color: '#f59e0b', 
          marginTop: '2px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          ⚠️ Product not in master catalog
        </div>
      )}
      
      {/* Dropdown */}
      {isOpen && searchResults.length > 0 && (
        <div
          ref={dropdownRef}
          className="typeahead-dropdown"
          role="listbox"
          style={{
            position: 'fixed', // Changed from absolute to fixed
            top: inputRef.current ? inputRef.current.getBoundingClientRect().bottom + window.scrollY + 2 : '100%',
            left: inputRef.current ? inputRef.current.getBoundingClientRect().left + window.scrollX : 0,
            width: inputRef.current ? inputRef.current.getBoundingClientRect().width : '100%',
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
            maxHeight: '240px', // Increased from 200px
            overflowY: 'auto',
            zIndex: 9999, // Increased from 1000 to ensure it's above everything
            marginTop: '0px',
            animation: 'fadeIn 0.15s ease-out'
          }}
        >
          {/* Results header */}
          {searchResults.length > 0 && (
            <div style={{
              padding: '8px 16px',
              borderBottom: '1px solid var(--border)',
              background: 'var(--panel-2)',
              fontSize: '11px',
              color: 'var(--muted)',
              fontWeight: '500',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              {searchResults.length} product{searchResults.length !== 1 ? 's' : ''} found
            </div>
          )}
          
          {searchResults.map((product, index) => (
            <div
              key={product.uniqueId}
              ref={el => optionRefs.current[index] = el}
              className="typeahead-option"
              onClick={() => handleSelect(product)}
              style={{
                padding: '12px 16px',
                cursor: 'pointer',
                borderBottom: index < searchResults.length - 1 ? '1px solid var(--border)' : 'none',
                backgroundColor: index === selectedIndex ? 'var(--brand)' : 'transparent',
                color: index === selectedIndex ? 'white' : 'var(--text)',
                transition: 'all 0.15s ease',
                fontSize: '14px'
              }}
              onMouseEnter={() => setSelectedIndex(index)}
              onMouseLeave={() => setSelectedIndex(-1)}
            >
              <div style={{ 
                fontWeight: '500', 
                marginBottom: '4px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {product.productName}
              </div>
              <div style={{ 
                fontSize: '12px', 
                color: index === selectedIndex ? 'rgba(255, 255, 255, 0.8)' : 'var(--muted)', 
                display: 'flex',
                gap: '8px',
                alignItems: 'center'
              }}>
                <span style={{ 
                  background: index === selectedIndex ? 'rgba(255, 255, 255, 0.2)' : 'var(--chip)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: '500'
                }}>
                  {product.uniqueId}
                </span>
                <span>•</span>
                <span>{product.productSubGroup}</span>
                {product.groupName && (
                  <>
                    <span>•</span>
                    <span>{product.groupName}</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductTypeahead;
