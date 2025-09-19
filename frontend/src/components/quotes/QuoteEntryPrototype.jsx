import React, { useState, useEffect } from 'react';
import api from '../../services/api.js';
import '../../styles/prototype-foundation.css';

const QuoteEntryPrototype = ({ editQuoteId = null }) => {
  const [rfqs, setRfqs] = useState([]);
  const [selectedRfqId, setSelectedRfqId] = useState('');
  const [selectedRfq, setSelectedRfq] = useState(null);
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  
  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [editingQuote, setEditingQuote] = useState(null);
  const [originalQuoteData, setOriginalQuoteData] = useState(null);
  
  const [formData, setFormData] = useState({
    supplierName: '',
    supplierContact: '',
    vendorHistory: 50,
    vendorCompliance: 100
  });
  
  const [quoteLines, setQuoteLines] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showQuoteTable, setShowQuoteTable] = useState(false);
  const [files, setFiles] = useState([]);
  const [fileErrors, setFileErrors] = useState([]);
  const [savedQuoteId, setSavedQuoteId] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [attachmentsError, setAttachmentsError] = useState('');
  
  // Default approver state
  const [approvers, setApprovers] = useState([]);
  const [selectedApprover, setSelectedApprover] = useState('');
  const [defaultApprover, setDefaultApprover] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check authentication and load data on component mount
  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  // Check for edit mode from editQuoteId prop
  useEffect(() => {
    if (editQuoteId) {
      if (editQuoteId.startsWith('view:')) {
        // View mode
        const quoteId = editQuoteId.replace('view:', '');
        setIsEditMode(false);
        setIsViewMode(true);
        loadQuoteForView(quoteId);
      } else {
        // Edit mode
        setIsEditMode(true);
        setIsViewMode(false);
        loadQuoteForEdit(editQuoteId);
      }
    } else {
      // Reset to new quote mode
      setIsEditMode(false);
      setIsViewMode(false);
      setEditingQuote(null);
      setOriginalQuoteData(null);
      resetQuoteForm();
    }
  }, [editQuoteId]);

  const checkAuthAndLoadData = async () => {
    try {
      // Check if user is authenticated by calling /me endpoint
      const userResponse = await api.get('/me');
      setUser(userResponse.data);
      setAuthChecked(true);
      
      // Check if user is admin
      const roles = userResponse.data.roles || [];
      setIsAdmin(roles.includes('admin'));
      
      // Load default approver if available
      if (userResponse.data.defaultApprover) {
        setDefaultApprover(userResponse.data.defaultApprover);
        setSelectedApprover(userResponse.data.defaultApprover._id);
      }
      
      // If authenticated, load RFQs and approvers
      await Promise.all([
        loadRfqs(),
        loadApprovers()
      ]);
    } catch (error) {
      console.error('Authentication check failed:', error);
      setAuthChecked(true);
      if (error.response?.status === 401) {
        alert('Please log in first to access the quote entry page.');
      }
    }
  };

  const loadApprovers = async () => {
    try {
      const response = await api.get('/users/approvers');
      if (response.data.success) {
        setApprovers(response.data.approvers);
      }
    } catch (error) {
      console.error('Failed to load approvers:', error);
    }
  };

  const updateDefaultApprover = async (approverId) => {
    if (!user?.userId) return;
    
    try {
      const response = await api.patch(`/users/${user.userId}/default-approver`, {
        defaultApproverId: approverId
      });
      
      if (response.data.success) {
        const updatedApprover = approvers.find(a => a._id === approverId);
        setDefaultApprover(updatedApprover || null);
        setSelectedApprover(approverId);
        alert('Default approver updated successfully');
      }
    } catch (error) {
      console.error('Failed to update default approver:', error);
      alert('Failed to update default approver. Please try again.');
    }
  };

  const loadQuoteForEdit = async (quoteId) => {
    try {
      const response = await api.get(`/quotes/${quoteId}/edit-info`);
      if (response.data.success) {
        const quote = response.data.quote;
        const permissions = response.data.permissions;
        
        if (!permissions.canEdit) {
          alert('You do not have permission to edit this quote.');
          setIsEditMode(false);
          return;
        }
        
        setEditingQuote(quote);
        setOriginalQuoteData(quote);
        
        // Pre-populate form with quote data
        setFormData({
          supplierName: quote.supplierName || '',
          supplierContact: quote.supplierContact || '',
          vendorHistory: extractVendorHistory(quote.notes) || 50,
          vendorCompliance: extractVendorCompliance(quote.notes) || 100
        });
        
        // Set RFQ
        setSelectedRfqId(quote.rfq._id);
        setSelectedRfq(quote.rfq);
        
        // Pre-populate quote lines
        const formattedLines = quote.items.map(item => ({
          productText: item.productText,
          productId: item.productId || '',
          quantity: item.quantity,
          uom: item.uom,
          targetDeliveryDays: item.deliveryDays || 14,
          unitPrice: item.unitPrice || 0,
          freight: item.freight || 0,
          insurance: item.insurance || 0,
          packaging: item.customsDuty || 0, // Map customsDuty to packaging
          unloading: 0, // Not in original schema
          installation: item.installation || 0,
          amc: item.amc || 0,
          taxPercent: 18,
          deliveryDays: item.deliveryDays || 14,
          subtotal: item.totalPrice || 0,
          taxAmount: item.taxes || 0,
          landedCost: calculateLandedCost(item)
        }));
        
        setQuoteLines(formattedLines);
        setShowQuoteTable(true);
        setSavedQuoteId(quote._id);
        
        // Load attachments if any
        if (quote.attachments && quote.attachments.length > 0) {
          setAttachments(quote.attachments);
        }
        
      }
    } catch (error) {
      console.error('Failed to load quote for editing:', error);
      alert('Failed to load quote data. Please try again.');
      setIsEditMode(false);
    }
  };

  const loadQuoteForView = async (quoteId) => {
    try {
      const response = await api.get(`/quotes/${quoteId}/edit-data`);
      if (response.data.success) {
        const quote = response.data.quote;
        
        setEditingQuote(quote);
        setOriginalQuoteData(quote);
        
        // Pre-populate form with quote data (read-only)
        setFormData({
          supplierName: quote.supplierName || '',
          supplierContact: quote.supplierContact || '',
          vendorHistory: extractVendorHistory(quote.notes) || 50,
          vendorCompliance: extractVendorCompliance(quote.notes) || 100
        });
        
        // Set RFQ
        setSelectedRfqId(quote.rfq._id);
        setSelectedRfq(quote.rfq);
        
        // Pre-populate quote lines
        const formattedLines = quote.items.map(item => ({
          productText: item.productText,
          productId: item.productId || '',
          quantity: item.quantity,
          uom: item.uom,
          targetDeliveryDays: item.deliveryDays || 14,
          unitPrice: item.unitPrice || 0,
          freight: item.freight || 0,
          insurance: item.insurance || 0,
          packaging: item.customsDuty || 0, // Map customsDuty to packaging
          unloading: 0, // Not in original schema
          installation: item.installation || 0,
          amc: item.amc || 0,
          taxPercent: 18,
          deliveryDays: item.deliveryDays || 14,
          subtotal: item.totalPrice || 0,
          taxAmount: item.taxes || 0,
          landedCost: calculateLandedCost(item)
        }));
        
        setQuoteLines(formattedLines);
        setShowQuoteTable(true);
        setSavedQuoteId(quote._id);
        
        // Load attachments if any
        if (quote.attachments && quote.attachments.length > 0) {
          setAttachments(quote.attachments);
        }
        
      }
    } catch (error) {
      console.error('Failed to load quote for viewing:', error);
      alert('Failed to load quote data. Please try again.');
      setIsViewMode(false);
    }
  };

  const calculateLandedCost = (item) => {
    return (item.totalPrice || 0) + 
           (item.freight || 0) + 
           (item.insurance || 0) + 
           (item.customsDuty || 0) + 
           (item.installation || 0) + 
           (item.taxes || 0);
  };

  const extractVendorHistory = (notes) => {
    const match = notes?.match(/Vendor History: (\d+)%/);
    return match ? parseInt(match[1]) : 50;
  };

  const extractVendorCompliance = (notes) => {
    const match = notes?.match(/Compliance: (\d+)%/);
    return match ? parseInt(match[1]) : 100;
  };

  // Load quote lines when RFQ is selected
  useEffect(() => {
    if (selectedRfqId) {
      loadRfqDetails(selectedRfqId);
    } else {
      setSelectedRfq(null);
      setQuoteLines([]);
      setShowQuoteTable(false);
    }
  }, [selectedRfqId]);

  const loadRfqs = async () => {
    try {
      const response = await api.get('/rfqs');
      const openRfqs = response.data.filter(rfq => rfq.status === 'OPEN');
      setRfqs(openRfqs);
    } catch (error) {
      console.error('Failed to load RFQs:', error);
      alert('Failed to load RFQs: ' + (error.response?.data?.message || error.message));
    }
  };

  const loadRfqDetails = async (rfqId) => {
    try {
      const response = await api.get(`/rfqs/${rfqId}`);
      const rfq = response.data;
      setSelectedRfq(rfq);
      
      // Build quote lines from RFQ items
      const lines = rfq.items.map((item, index) => ({
        lineId: `L${index + 1}`,
        productText: item.productText,
        productId: item.productId || null,
        quantity: item.quantity,
        uom: item.uom,
        targetDeliveryDays: item.targetDeliveryDays || 14,
        // Quote-specific fields with defaults
        unitPrice: 0,
        freight: 0,
        insurance: 0,
        packaging: 0,
        unloading: 0,
        installation: 0,
        amc: 0,
        taxPercent: 18,
        deliveryDays: item.targetDeliveryDays || 14,
        // Calculated fields
        subtotal: 0,
        taxAmount: 0,
        landedCost: 0
      }));
      
      setQuoteLines(lines);
      setShowQuoteTable(true);
  setFiles([]);
  setFileErrors([]);
  setSavedQuoteId('');
  setAttachments([]);
  setAttachmentsError('');
    } catch (error) {
      console.error('Failed to load RFQ details:', error);
      alert('Failed to load RFQ details: ' + (error.response?.data?.message || error.message));
    }
  };

  // Update form data
  const updateFormData = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  // Update quote line
  const updateQuoteLine = (index, field, value) => {
    const newLines = [...quoteLines];
    newLines[index] = { ...newLines[index], [field]: Number(value) || 0 };
    
    // Recalculate totals for this line
    const line = newLines[index];
    line.subtotal = line.unitPrice * line.quantity;
    line.taxAmount = line.subtotal * (line.taxPercent / 100);
    line.landedCost = line.subtotal + line.freight + line.insurance + line.packaging + 
                     line.unloading + line.installation + line.amc + line.taxAmount;
    
    setQuoteLines(newLines);
  };

  // Reset form
  const resetQuoteForm = () => {
    setFormData({
      supplierName: '',
      supplierContact: '',
      vendorHistory: 50,
      vendorCompliance: 100
    });
    
    if (selectedRfq) {
      // Reset quote lines to default values
      const resetLines = quoteLines.map(line => ({
        ...line,
        unitPrice: 0,
        freight: 0,
        insurance: 0,
        packaging: 0,
        unloading: 0,
        installation: 0,
        amc: 0,
        taxPercent: 18,
        deliveryDays: line.targetDeliveryDays || 14,
        subtotal: 0,
        taxAmount: 0,
        landedCost: 0
      }));
      setQuoteLines(resetLines);
    }
    alert('Form reset');
    setFiles([]);
    setFileErrors([]);
  setSavedQuoteId('');
  setAttachments([]);
  setAttachmentsError('');
  };

  // Client-side validation for files
  const allowedExtensions = ['pdf','doc','docx','xls','xlsx','jpg','jpeg','png'];
  const maxFileSize = 10 * 1024 * 1024; // 10MB, keep in sync with backend
  const onFilesSelected = (e) => {
    const list = Array.from(e.target.files || []);
    const errs = [];
    const valid = [];
    for (const f of list) {
      const ext = (f.name.split('.').pop() || '').toLowerCase();
      if (!allowedExtensions.includes(ext)) {
        errs.push(`${f.name}: unsupported type`);
        continue;
      }
      if (f.size > maxFileSize) {
        errs.push(`${f.name}: exceeds 10MB`);
        continue;
      }
      valid.push(f);
    }
    setFileErrors(errs);
    setFiles(valid);
  };

  // Save quote
  const saveQuote = async () => {
    // Authentication check
    if (!user) {
      alert('Please log in first to submit quotes.');
      return;
    }
    
    // Validation
    if (!selectedRfqId) {
      alert('Please select an RFQ');
      return;
    }
    
    if (!formData.supplierName.trim()) {
      alert('Please enter supplier name');
      return;
    }

    if (formData.supplierName.trim().length < 2) {
      alert('Supplier name must be at least 2 characters');
      return;
    }

    // Check if at least one line has pricing
    const hasValidLines = quoteLines.some(line => line.unitPrice > 0);
    if (!hasValidLines) {
      alert('Please enter unit prices for at least one line item');
      return;
    }

    // Validate that all priced lines have valid data
    const invalidLines = quoteLines.filter(line => line.unitPrice > 0).filter(line => 
      !line.productText.trim() || 
      !line.quantity || 
      line.quantity <= 0 ||
      !line.unitPrice ||
      line.unitPrice < 0
    );

    if (invalidLines.length > 0) {
      alert('Please ensure all priced lines have valid product text, quantity, and unit price');
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare quote data
      const quoteData = {
        rfq: selectedRfqId, // Add RFQ reference
        supplierName: formData.supplierName.trim(),
        currency: 'INR',
        items: quoteLines
          .filter(line => line.unitPrice > 0) // Only include lines with prices
          .map(line => ({
            productText: line.productText.trim(), // Use productText as expected by model
            productId: line.productId || '',
            quantity: parseFloat(line.quantity),
            uom: line.uom || 'PCS', // Default UOM since it's required
            unitPrice: parseFloat(line.unitPrice),
            totalPrice: parseFloat(line.quantity) * parseFloat(line.unitPrice), // Calculate total
            deliveryDays: parseInt(line.deliveryDays) || 0,
            // Additional cost components (optional)
            freight: parseFloat(line.freight) || 0,
            insurance: parseFloat(line.insurance) || 0,
            customsDuty: parseFloat(line.packaging) || 0, // Using packaging as customs duty
            amc: parseFloat(line.amc) || 0,
            warranty: 0,
            installation: parseFloat(line.installation) || 0,
            training: 0,
            taxes: parseFloat(line.taxAmount) || 0
          })),
        notes: `Vendor History: ${formData.vendorHistory}%, Compliance: ${formData.vendorCompliance}%`
      };

      console.log('Sending quote data:', JSON.stringify(quoteData, null, 2));
      
      let response;
      if (isEditMode && editingQuote) {
        // Update existing quote
        response = await api.put(`/quotes/${editingQuote._id}`, quoteData);
      } else {
        // Create new quote
        response = await api.post('/quotes', quoteData);
      }

      if (response.data.success) {
        const savedQuote = response.data.quote;
        setSavedQuoteId(savedQuote?._id || '');
        
        // Show success message with status change info
        let successMessage = isEditMode ? 
          `Quote updated for ${formData.supplierName}` : 
          `Quote saved for ${formData.supplierName}`;
        
        if (response.data.statusChanged) {
          successMessage += `\n\nStatus changed from "${response.data.originalStatus}" to "${response.data.newStatus}".`;
          if (response.data.newStatus === 'SUBMITTED') {
            successMessage += ' Quote will require re-approval.';
          }
        }
        let uploadMsg = '';
        if (files.length > 0 && savedQuote?._id) {
          try {
            const form = new FormData();
            files.forEach(f => form.append('files', f));
            const upRes = await api.post(`/quotes/${savedQuote._id}/attachments`, form, {
              headers: { /* Let axios set multipart boundary */ }
            });
            uploadMsg = `, attachments uploaded: ${upRes.data.addedCount || 0}`;
            // Fetch full attachment list for UI
            try {
              const listRes = await api.get(`/quotes/${savedQuote._id}/attachments`);
              setAttachments(listRes.data.attachments || []);
              setAttachmentsError('');
            } catch (listErr) {
              console.error('List attachments failed:', listErr);
              setAttachmentsError('Failed to load attachments list');
            }
          } catch (upErr) {
            console.error('Attachment upload failed:', upErr);
            // Resilient fallback: if 404, try to find the quote by RFQ and supplier and retry once
            if (upErr?.response?.status === 404) {
              try {
                const quotesRes = await api.get(`/rfqs/${selectedRfqId}/quotes`);
                const found = (quotesRes.data || []).find(q =>
                  (q.supplierName || '').toLowerCase() === formData.supplierName.trim().toLowerCase()
                );
                if (found?._id) {
                  setSavedQuoteId(found._id);
                  const retryForm = new FormData();
                  files.forEach(f => retryForm.append('files', f));
                  const retryRes = await api.post(`/quotes/${found._id}/attachments`, retryForm);
                  uploadMsg = `, attachments uploaded: ${retryRes.data.addedCount || 0}`;
                  try {
                    const listRes = await api.get(`/quotes/${found._id}/attachments`);
                    setAttachments(listRes.data.attachments || []);
                    setAttachmentsError('');
                  } catch (listErr2) {
                    console.error('List attachments (retry) failed:', listErr2);
                    setAttachmentsError('Failed to load attachments list');
                  }
                } else {
                  uploadMsg = ', but attachments failed to upload (quote not located)';
                  setAttachmentsError('Attachment upload failed (quote not located)');
                }
              } catch (fallbackErr) {
                console.error('Attachment upload fallback failed:', fallbackErr);
                uploadMsg = ', but attachments failed to upload';
                setAttachmentsError('Attachment upload failed');
              }
            } else {
              uploadMsg = ', but attachments failed to upload';
              setAttachmentsError('Attachment upload failed');
            }
          }
        }
        alert(`${successMessage}${uploadMsg}`);
        
        // For edit mode, optionally navigate back to quote management
        if (isEditMode) {
          const shouldReturn = confirm('Quote updated successfully! Would you like to return to Quote Management?');
          if (shouldReturn) {
            window.dispatchEvent(new CustomEvent('navigate', { detail: 'quote-management' }));
          }
        }
        
        // Do not reset immediately if we have a saved quote; keep attachment panel visible
        if (!files.length && !isEditMode) {
          // If no attachments to show and not in edit mode, allow full reset
          resetQuoteForm();
        }
      } else {
        throw new Error(response.data.message || 'Failed to save quote');
      }
      
    } catch (error) {
      console.error('Save quote error:', error);
      console.error('Error response status:', error.response?.status);
      console.error('Error response data:', JSON.stringify(error.response?.data, null, 2));
      console.error('Error response headers:', error.response?.headers);
      console.error('Error details:', error.response?.data?.details);
      
      let errorMessage = 'Failed to save quote';
      if (error.response?.data?.details) {
        errorMessage = error.response.data.details.map(d => `${d.field}: ${d.message}`).join(', ');
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Download an attachment as a Blob and trigger browser download
  const handleDownloadAttachment = async (attId, filename) => {
    if (!savedQuoteId) return;
    try {
      const res = await api.get(`/quotes/${savedQuoteId}/attachments/${attId}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename || 'attachment');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
      alert('Failed to download attachment');
    }
  };

  // Delete an attachment then refresh the list
  const handleDeleteAttachment = async (attId) => {
    if (!savedQuoteId) return;
    if (!confirm('Delete this attachment?')) return;
    try {
      await api.delete(`/quotes/${savedQuoteId}/attachments/${attId}`);
      // Refresh list
      const listRes = await api.get(`/quotes/${savedQuoteId}/attachments`);
      setAttachments(listRes.data.attachments || []);
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete attachment');
    }
  };

  return (
    <div className="prototype-app">
      {!authChecked && (
        <div className="prototype-card">
          <p>Checking authentication...</p>
        </div>
      )}
      
      {authChecked && !user && (
        <div className="prototype-card">
          <h2>Authentication Required</h2>
          <p>Please log in first to access the quote entry page.</p>
          <button onClick={() => window.location.href = '/login'}>Go to Login</button>
        </div>
      )}
      
      {authChecked && user && (
        <div className="prototype-card">
          <h2>
            {isEditMode ? `Edit Quote - ${editingQuote?.supplierName || 'Unknown Supplier'}` : 
             isViewMode ? `View Quote - ${editingQuote?.supplierName || 'Unknown Supplier'}` : 
             'Enter Quotes (Manual)'}
          </h2>
          <p>Welcome, {user.username}!</p>
        
        {/* Header Form */}
        <div className="prototype-row">
          <div className="prototype-field">
            <label className="prototype-label">Select RFQ</label>
            <select
              className="prototype-select"
              value={selectedRfqId}
              onChange={(e) => setSelectedRfqId(e.target.value)}
              disabled={isViewMode}
            >
              <option value="">-- Select RFQ --</option>
              {rfqs.map(rfq => (
                <option key={rfq._id} value={rfq._id}>
                  {rfq._id} — {rfq.title}
                </option>
              ))}
            </select>
          </div>
          <div className="prototype-field">
            <label className="prototype-label">Vendor Name</label>
            <input
              className="prototype-input"
              placeholder="Vendor A"
              value={formData.supplierName}
              onChange={(e) => updateFormData('supplierName', e.target.value)}
              readOnly={isViewMode}
            />
          </div>
          <div className="prototype-field">
            <label className="prototype-label">Vendor History (0-100)</label>
            <input
              className="prototype-input"
              type="number"
              min="0"
              max="100"
              value={formData.vendorHistory}
              onChange={(e) => updateFormData('vendorHistory', e.target.value)}
              readOnly={isViewMode}
            />
          </div>
          <div className="prototype-field">
            <label className="prototype-label">Compliant?</label>
            <select
              className="prototype-select"
              value={formData.vendorCompliance}
              onChange={(e) => updateFormData('vendorCompliance', e.target.value)}
              disabled={isViewMode}
            >
              <option value="100">Yes</option>
              <option value="50">Partially</option>
              <option value="0">No</option>
            </select>
          </div>
          
          {/* Default Approver Section */}
          <div className="prototype-field">
            <label className="prototype-label">
              Assigned Approver
              {isAdmin && !isViewMode && <span style={{ fontSize: '12px', color: 'var(--muted)' }}> (Admin can change)</span>}
            </label>
            {isAdmin && !isViewMode ? (
              <select
                className="prototype-select"
                value={selectedApprover}
                onChange={(e) => {
                  setSelectedApprover(e.target.value);
                  updateDefaultApprover(e.target.value);
                }}
              >
                <option value="">Select Approver</option>
                {approvers.map(approver => (
                  <option key={approver._id} value={approver._id}>
                    {approver.firstName} {approver.lastName} ({approver.position || approver.username})
                  </option>
                ))}
              </select>
            ) : (
              <div style={{ 
                padding: '8px 12px', 
                background: 'var(--panel-2)', 
                border: '1px solid var(--border)', 
                borderRadius: '4px',
                fontSize: '14px'
              }}>
                {defaultApprover ? (
                  <>
                    <strong>{defaultApprover.firstName} {defaultApprover.lastName}</strong>
                    <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                      {defaultApprover.position || defaultApprover.username}
                    </div>
                  </>
                ) : (
                  <span style={{ color: 'var(--muted)' }}>No default approver set</span>
                )}
              </div>
            )}
            {defaultApprover && (
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
                💡 This approver will be automatically assigned to your quotes
              </div>
            )}
          </div>
        </div>

        {/* Attachments */}
        <div className="prototype-row" style={{ marginTop: '12px' }}>
          <div className="prototype-field" style={{ width: '100%' }}>
            <label className="prototype-label">
              {isViewMode ? 'Attached files' : 'Attach files (PDF, Images, Excel) — max 10MB each'}
            </label>
            {!isViewMode && (
              <input
                className="prototype-input"
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                onChange={onFilesSelected}
              />
            )}
            {fileErrors.length > 0 && (
              <div style={{ color: 'var(--danger)', marginTop: '6px' }}>
                {fileErrors.map((e, i) => (
                  <div key={i}>• {e}</div>
                ))}
              </div>
            )}
            {files.length > 0 && (
              <div style={{ color: 'var(--muted)', marginTop: '6px', fontSize: '12px' }}>
                Selected: {files.map(f => f.name).join(', ')}
              </div>
            )}
          </div>
        </div>

        {/* Quote Lines Table */}
        {showQuoteTable && (
          <div className="prototype-table-wrap" style={{ marginTop: '16px' }}>
            <table className="prototype-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                  <th>Freight</th>
                  <th>Insurance</th>
                  <th>Packaging</th>
                  <th>Unloading</th>
                  <th>Installation</th>
                  <th>AMC</th>
                  <th>Tax %</th>
                  <th>Delivery Days</th>
                </tr>
              </thead>
              <tbody>
                {quoteLines.map((line, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>
                      <div>{line.productText}</div>
                      <div className="text-muted" style={{ fontSize: '11px', marginTop: '4px' }}>
                        {line.productId || 'No Product ID'}
                        {!line.productId && <span className="text-warning"> • warn: free‑text</span>}
                      </div>
                    </td>
                    <td>{line.quantity}</td>
                    <td>
                      <input
                        className="prototype-input"
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.unitPrice}
                        onChange={(e) => updateQuoteLine(index, 'unitPrice', e.target.value)}
                        style={{ width: '100px', margin: 0 }}
                        readOnly={isViewMode}
                      />
                    </td>
                    <td>
                      <input
                        className="prototype-input"
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.freight}
                        onChange={(e) => updateQuoteLine(index, 'freight', e.target.value)}
                        style={{ width: '80px', margin: 0 }}
                        readOnly={isViewMode}
                      />
                    </td>
                    <td>
                      <input
                        className="prototype-input"
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.insurance}
                        onChange={(e) => updateQuoteLine(index, 'insurance', e.target.value)}
                        style={{ width: '80px', margin: 0 }}
                      />
                    </td>
                    <td>
                      <input
                        className="prototype-input"
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.packaging}
                        onChange={(e) => updateQuoteLine(index, 'packaging', e.target.value)}
                        style={{ width: '80px', margin: 0 }}
                      />
                    </td>
                    <td>
                      <input
                        className="prototype-input"
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.unloading}
                        onChange={(e) => updateQuoteLine(index, 'unloading', e.target.value)}
                        style={{ width: '80px', margin: 0 }}
                      />
                    </td>
                    <td>
                      <input
                        className="prototype-input"
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.installation}
                        onChange={(e) => updateQuoteLine(index, 'installation', e.target.value)}
                        style={{ width: '80px', margin: 0 }}
                      />
                    </td>
                    <td>
                      <input
                        className="prototype-input"
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.amc}
                        onChange={(e) => updateQuoteLine(index, 'amc', e.target.value)}
                        style={{ width: '80px', margin: 0 }}
                      />
                    </td>
                    <td>
                      <input
                        className="prototype-input"
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.taxPercent}
                        onChange={(e) => updateQuoteLine(index, 'taxPercent', e.target.value)}
                        style={{ width: '70px', margin: 0 }}
                      />
                    </td>
                    <td>
                      <input
                        className="prototype-input"
                        type="number"
                        min="0"
                        step="1"
                        value={line.deliveryDays}
                        onChange={(e) => updateQuoteLine(index, 'deliveryDays', e.target.value)}
                        style={{ width: '80px', margin: 0 }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Attachments panel (visible after save with uploads) */}
        {savedQuoteId && attachments && attachments.length > 0 && (
          <div className="prototype-card" style={{ marginTop: '16px' }}>
            <h3 style={{ marginTop: 0 }}>Attachments for this quote</h3>
            {attachmentsError && (
              <div style={{ color: 'var(--danger)', marginBottom: '8px' }}>{attachmentsError}</div>
            )}
            <div className="prototype-table-wrap">
              <table className="prototype-table">
                <thead>
                  <tr>
                    <th>File</th>
                    <th>Size</th>
                    <th>Uploaded</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {attachments.map(att => (
                    <tr key={att._id}>
                      <td>{att.filename}</td>
                      <td>{Math.round((att.size || 0) / 1024)} KB</td>
                      <td>{att.uploadedAt ? new Date(att.uploadedAt).toLocaleString() : ''}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="prototype-btn" onClick={() => handleDownloadAttachment(att._id, att.filename)}>Download</button>
                          {!isViewMode && (
                            <button className="prototype-btn danger" onClick={() => handleDeleteAttachment(att._id)}>Delete</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!showQuoteTable && selectedRfqId && (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>
            Loading RFQ details...
          </div>
        )}

        {!selectedRfqId && (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>
            Please select an RFQ to enter quotes
          </div>
        )}

        {/* Sticky Actions */}
        <div className="prototype-sticky-actions">
          {isViewMode ? (
            <button 
              className="prototype-btn" 
              onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'quote-management' }))}
            >
              Back to Quote Management
            </button>
          ) : (
            <>
              <button 
                className="prototype-btn" 
                onClick={resetQuoteForm}
                disabled={isSubmitting}
              >
                Reset
              </button>
              <button 
                className="prototype-btn primary" 
                onClick={saveQuote}
                disabled={isSubmitting || !showQuoteTable}
              >
                {isSubmitting ? (isEditMode ? 'Updating...' : 'Saving...') : (isEditMode ? 'Update Quote' : 'Save Quote')}
              </button>
            </>
          )}
        </div>
        </div>
      )}
    </div>
  );
};

export default QuoteEntryPrototype;
