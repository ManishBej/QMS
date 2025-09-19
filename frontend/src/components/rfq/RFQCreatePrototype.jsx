import React, { useState, useEffect } from 'react';
import api from '../../services/api.js';
import ProductTypeahead from '../common/ProductTypeahead.jsx';

const RFQCreatePrototype = () => {
  const [formData, setFormData] = useState({
    title: '',
    department: '',
    currency: 'INR'
  });
  
  const [lineItems, setLineItems] = useState([
    {
      productText: '',
      productId: '',
      quantity: 1,
      uom: 'Nos',
      targetDeliveryDays: 14
    }
  ]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [productValidation, setProductValidation] = useState({});
  const [weights] = useState({
    price: 0.5,
    delivery: 0.2,
    vendor: 0.2,
    compliance: 0.1
  });

  // Add new line item
  const addRfqLine = (data = {}) => {
    const newItem = {
      productText: data.productText || '',
      productId: data.productId || '',
      quantity: data.quantity || 1,
      uom: data.uom || 'Nos',
      targetDeliveryDays: data.targetDeliveryDays || 14
    };
    setLineItems([...lineItems, newItem]);
  };

  // Remove line item
  const removeRfqLine = (index) => {
    if (lineItems.length > 1) {
      const newItems = lineItems.filter((_, i) => i !== index);
      setLineItems(newItems);
    } else {
      alert('At least one line item is required');
    }
  };

  // Validate Product ID exists in database
  const validateProductId = async (productId, lineIndex) => {
    if (!productId.trim()) {
      setProductValidation(prev => ({
        ...prev,
        [lineIndex]: { isValid: true, message: '' }
      }));
      return;
    }

    try {
      const response = await api.get(`/api/products/search?q=${encodeURIComponent(productId)}&limit=10`);
      if (response.data.success) {
        const exactMatch = response.data.products.find(p => 
          p.uniqueId.toLowerCase() === productId.toLowerCase()
        );
        
        if (exactMatch) {
          setProductValidation(prev => ({
            ...prev,
            [lineIndex]: { 
              isValid: true, 
              message: '',
              product: exactMatch
            }
          }));
        } else {
          setProductValidation(prev => ({
            ...prev,
            [lineIndex]: { 
              isValid: false, 
              message: 'Product ID not found in catalog'
            }
          }));
        }
      }
    } catch (error) {
      console.error('Product validation error:', error);
      setProductValidation(prev => ({
        ...prev,
        [lineIndex]: { 
          isValid: false, 
          message: 'Unable to validate Product ID'
        }
      }));
    }
  };

  // Update line item
  const updateLineItem = (index, field, value) => {
    const newItems = [...lineItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setLineItems(newItems);
    
    // Validate Product ID if it was manually changed
    if (field === 'productId') {
      // Clear product text if Product ID is manually changed and doesn't match current validation
      const currentValidation = productValidation[index];
      if (currentValidation?.product && currentValidation.product.uniqueId !== value) {
        newItems[index].productText = '';
        setLineItems(newItems);
      }
      
      // Debounced validation
      setTimeout(() => validateProductId(value, index), 500);
    }
  };

  // Handle product selection from typeahead
  const handleProductSelect = (index, product) => {
    const newItems = [...lineItems];
    newItems[index] = { 
      ...newItems[index], 
      productText: product.productName,
      productId: product.uniqueId
    };
    
    // Set validation state for auto-filled Product ID
    setProductValidation(prev => ({
      ...prev,
      [index]: { 
        isValid: true, 
        message: '',
        product: product
      }
    }));
    
    setLineItems(newItems);
  };

  // Update form data
  const updateFormData = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  // Reset form
  const resetRfqForm = () => {
    setFormData({
      title: '',
      department: '',
      currency: 'INR'
    });
    setLineItems([{
      productText: '',
      productId: '',
      quantity: 1,
      uom: 'Nos',
      targetDeliveryDays: 14
    }]);
    alert('Form reset');
  };

  // Save RFQ
  const saveRFQ = async () => {
    // Validation
    if (!formData.title.trim()) {
      alert('Title is required');
      return;
    }

    const validItems = lineItems.filter(item => item.productText.trim());
    if (validItems.length === 0) {
      alert('Add at least one line item with product description');
      return;
    }

    setIsSubmitting(true);

    try {
      const rfqData = {
        title: formData.title.trim(),
        department: formData.department.trim() || 'General',
        currency: formData.currency,
        status: 'OPEN',
        config: { weights },
        items: validItems.map(item => ({
          productText: item.productText.trim(),
          productId: item.productId.trim() || null,
          quantity: Number(item.quantity) || 1,
          uom: item.uom.trim() || 'Nos',
          targetDeliveryDays: Number(item.targetDeliveryDays) || 14
        }))
      };

      const response = await api.post('/rfqs', rfqData);

      if (response.data.success) {
        alert(`RFQ saved: ${response.data.rfq.title}`);
        resetRfqForm();
      } else {
        throw new Error(response.data.message || 'Failed to save RFQ');
      }
      
    } catch (error) {
      console.error('Save RFQ error:', error);
      alert(error.response?.data?.message || error.message || 'Failed to save RFQ');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="prototype-app">
      <div className="prototype-card">
        <h2>Create RFQ</h2>
        
        {/* Header Form */}
        <div className="prototype-row">
          <div className="prototype-field">
            <label className="prototype-label">Title</label>
            <input
              className="prototype-input"
              placeholder="e.g., RFQ - Hydraulic Spares Aug 2025"
              value={formData.title}
              onChange={(e) => updateFormData('title', e.target.value)}
            />
          </div>
          <div className="prototype-field">
            <label className="prototype-label">Department</label>
            <input
              className="prototype-input"
              placeholder="Engineering"
              value={formData.department}
              onChange={(e) => updateFormData('department', e.target.value)}
            />
          </div>
          <div className="prototype-field">
            <label className="prototype-label">Target Currency</label>
            <select
              className="prototype-select"
              value={formData.currency}
              onChange={(e) => updateFormData('currency', e.target.value)}
            >
              <option value="INR">INR</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
        </div>

        <div className="prototype-divider"></div>

        {/* Weights Display */}
        <div className="prototype-row">
          <span className="prototype-chip">
            Weights (default): Price {(weights.price * 100).toFixed(0)}% • 
            Delivery {(weights.delivery * 100).toFixed(0)}% • 
            Vendor {(weights.vendor * 100).toFixed(0)}% • 
            Compliance {(weights.compliance * 100).toFixed(0)}%
          </span>
        </div>

        <div className="prototype-divider"></div>

        {/* Line Items Section */}
        <h3 className="text-muted" style={{ fontSize: '13px', margin: '0 0 10px 0' }}>Line Items</h3>
        
        <div className="prototype-table-wrap">
          <table className="prototype-table">
            <thead>
              <tr>
                <th style={{ minWidth: '40px' }}>#</th>
                <th style={{ minWidth: '220px' }}>Product (search or free text)</th>
                <th>Product ID (optional)</th>
                <th>Qty</th>
                <th>UOM</th>
                <th>Target Delivery (days)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td>
                    <ProductTypeahead
                      value={item.productText}
                      onChange={(value) => updateLineItem(index, 'productText', value)}
                      onSelect={(product) => handleProductSelect(index, product)}
                      placeholder="Type to search products..."
                      className="prototype-input"
                    />
                  </td>
                  <td>
                    <div style={{ position: 'relative' }}>
                      <input
                        className="prototype-input"
                        placeholder="e.g., PRD-00123"
                        value={item.productId}
                        onChange={(e) => updateLineItem(index, 'productId', e.target.value)}
                        style={{ 
                          width: '100%', 
                          margin: 0,
                          borderColor: productValidation[index]?.isValid === false ? '#dc3545' : undefined
                        }}
                      />
                      {productValidation[index]?.isValid === false && (
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          fontSize: '11px',
                          color: '#dc3545',
                          background: 'white',
                          border: '1px solid #dc3545',
                          borderTop: 'none',
                          padding: '4px 8px',
                          borderRadius: '0 0 4px 4px',
                          zIndex: 1000
                        }}>
                          ⚠️ {productValidation[index].message}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <input
                      className="prototype-input"
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                      style={{ width: '80px', margin: 0 }}
                    />
                  </td>
                  <td>
                    <input
                      className="prototype-input"
                      value={item.uom}
                      onChange={(e) => updateLineItem(index, 'uom', e.target.value)}
                      style={{ width: '80px', margin: 0 }}
                    />
                  </td>
                  <td>
                    <input
                      className="prototype-input"
                      type="number"
                      min="0"
                      value={item.targetDeliveryDays}
                      onChange={(e) => updateLineItem(index, 'targetDeliveryDays', e.target.value)}
                      style={{ width: '80px', margin: 0 }}
                    />
                  </td>
                  <td>
                    <button
                      className="prototype-btn"
                      onClick={() => removeRfqLine(index)}
                      disabled={lineItems.length === 1}
                      style={{ padding: '6px 10px', fontSize: '12px' }}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add Line Button */}
        <div className="prototype-row" style={{ marginTop: '10px' }}>
          <button className="prototype-btn" onClick={() => addRfqLine()}>
            + Add Line
          </button>
          <span className="prototype-help">
            Start typing to search product catalog. Free‑text allowed.
            <span className="text-warning"> Warning</span> will show if Product not in master.
          </span>
        </div>

        {/* Sticky Actions */}
        <div className="prototype-sticky-actions">
          <button 
            className="prototype-btn" 
            onClick={resetRfqForm}
            disabled={isSubmitting}
          >
            Reset
          </button>
          <button 
            className="prototype-btn primary" 
            onClick={saveRFQ}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save RFQ'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RFQCreatePrototype;
