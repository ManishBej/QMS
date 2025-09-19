import React, { useState, useEffect } from 'react';
import { PageLayout, FormSection, FormField, Button, Table } from '../components/PageLayout.jsx';
import QuoteAttachments from '../components/QuoteAttachments.jsx';
import api from '../services/api.js';

export default function QuoteManagement() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, my, pending, approved
  const [searchTerm, setSearchTerm] = useState('');
  const [userRole, setUserRole] = useState([]);
  const [selectedQuotes, setSelectedQuotes] = useState(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [editingQuote, setEditingQuote] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [viewingFiles, setViewingFiles] = useState(null); // For file viewing modal

  useEffect(() => {
    loadQuotes();
  }, [filter]);

  const loadQuotes = async () => {
    try {
      setLoading(true);
      let endpoint = '/quotes/manageable';
      
      if (filter === 'my') {
        endpoint = '/quotes/my';
      }
      
      const response = await api.get(endpoint);
      if (response.data.success) {
        setQuotes(response.data.quotes);
        setUserRole(response.data.userRole || []);
      }
    } catch (error) {
      console.error('Failed to load quotes:', error);
      alert('Failed to load quotes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (quoteId) => {
    // Navigate to quote entry in edit mode using custom navigation
    window.dispatchEvent(new CustomEvent('navigateWithQuote', { 
      detail: `quote-edit:${quoteId}`
    }));
    // Also trigger the main navigation to switch to quote-entry page
    window.dispatchEvent(new CustomEvent('navigate', { 
      detail: 'quote-entry'
    }));
  };

  const handleView = (quoteId) => {
    // Navigate to quote entry in view-only mode using custom navigation
    window.dispatchEvent(new CustomEvent('navigateWithQuote', { 
      detail: `quote-view:${quoteId}`
    }));
    // Also trigger the main navigation to switch to quote-entry page
    window.dispatchEvent(new CustomEvent('navigate', { 
      detail: 'quote-entry'
    }));
  };

  const handleInlineEdit = async (quoteId) => {
    try {
      const response = await api.get(`/quotes/${quoteId}/edit-data`);
      if (response.data.success) {
        setEditingQuote(quoteId);
        setEditFormData(response.data.quote);
      }
    } catch (error) {
      console.error('Failed to load quote data for editing:', error);
      alert('Failed to load quote data. Please try again.');
    }
  };

  const handleSaveInlineEdit = async () => {
    try {
      const response = await api.put(`/quotes/${editingQuote}`, editFormData);
      if (response.data.success) {
        alert('Quote updated successfully');
        setEditingQuote(null);
        setEditFormData({});
        loadQuotes();
      }
    } catch (error) {
      console.error('Failed to update quote:', error);
      alert('Failed to update quote. Please try again.');
    }
  };

  const handleCancelInlineEdit = () => {
    setEditingQuote(null);
    setEditFormData({});
  };

  const handleViewFiles = (quote) => {
    setViewingFiles(quote);
  };

  const handleCloseFilesView = () => {
    setViewingFiles(null);
  };

  const handleDelete = async (quoteId, supplierName) => {
    if (!confirm(`Are you sure you want to delete the quote from ${supplierName}?`)) {
      return;
    }

    try {
      const response = await api.delete(`/quotes/${quoteId}`);
      if (response.data.success) {
        alert('Quote deleted successfully');
        loadQuotes(); // Reload the list
      }
    } catch (error) {
      console.error('Failed to delete quote:', error);
      alert('Failed to delete quote. Please try again.');
    }
  };

  // Bulk operation handlers
  const handleSelectQuote = (quoteId) => {
    const newSelected = new Set(selectedQuotes);
    if (newSelected.has(quoteId)) {
      newSelected.delete(quoteId);
    } else {
      newSelected.add(quoteId);
    }
    setSelectedQuotes(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedQuotes.size === filteredQuotes.length) {
      setSelectedQuotes(new Set());
    } else {
      setSelectedQuotes(new Set(filteredQuotes.map(q => q._id)));
    }
  };

  const handleBulkStatusUpdate = async (newStatus) => {
    if (selectedQuotes.size === 0) {
      alert('Please select quotes to update');
      return;
    }

    if (!confirm(`Are you sure you want to update ${selectedQuotes.size} quotes to ${newStatus} status?`)) {
      return;
    }

    try {
      setBulkLoading(true);
      const response = await api.post('/quotes/bulk-edit', {
        quoteIds: Array.from(selectedQuotes),
        updates: { approvalStatus: newStatus }
      });

      if (response.data.success) {
        alert(`Successfully updated ${response.data.updatedCount} quotes`);
        setSelectedQuotes(new Set());
        loadQuotes();
      }
    } catch (error) {
      console.error('Failed to bulk update quotes:', error);
      alert('Failed to update quotes. Please try again.');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedQuotes.size === 0) {
      alert('Please select quotes to delete');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedQuotes.size} selected quotes? This action cannot be undone.`)) {
      return;
    }

    try {
      setBulkLoading(true);
      const response = await api.post('/quotes/bulk-edit', {
        quoteIds: Array.from(selectedQuotes),
        operation: 'delete'
      });

      if (response.data.success) {
        alert(`Successfully deleted ${response.data.deletedCount} quotes`);
        setSelectedQuotes(new Set());
        loadQuotes();
      }
    } catch (error) {
      console.error('Failed to bulk delete quotes:', error);
      alert('Failed to delete quotes. Please try again.');
    } finally {
      setBulkLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'SUBMITTED': { class: 'badge', color: 'green', text: 'Submitted' },
      'UNDER_REVIEW': { class: 'badge warn', color: 'yellow', text: 'Under Review' },
      'APPROVED': { class: 'badge ok', color: 'blue', text: 'Approved' },
      'REJECTED': { class: 'badge danger', color: 'red', text: 'Rejected' }
    };
    
    const config = statusConfig[status] || { class: 'badge', text: status };
    return <span className={config.class}>{config.text}</span>;
  };

  const getPermissionIndicator = (quote) => {
    if (!quote.canEdit) {
      return (
        <span className="text-muted" style={{ fontSize: '12px' }}>
          View Only
        </span>
      );
    }
    
    if (quote.isOwner) {
      return (
        <span className="text-success" style={{ fontSize: '12px' }}>
          Owner
        </span>
      );
    }
    
    return (
      <span className="text-info" style={{ fontSize: '12px' }}>
        Can Edit
      </span>
    );
  };

  // Filter quotes based on search term
  const filteredQuotes = quotes.filter(quote => {
    if (!searchTerm) return true;
    
    const search = searchTerm.toLowerCase();
    return (
      quote.supplierName.toLowerCase().includes(search) ||
      quote.rfq?.title?.toLowerCase().includes(search) ||
      quote.submittedBy?.username?.toLowerCase().includes(search)
    );
  });

  const columns = [
    {
      key: 'select',
      header: (
        <input
          type="checkbox"
          checked={selectedQuotes.size === filteredQuotes.length && filteredQuotes.length > 0}
          onChange={handleSelectAll}
          style={{ margin: 0 }}
        />
      ),
      render: (_, quote) => (
        <input
          type="checkbox"
          checked={selectedQuotes.has(quote._id)}
          onChange={() => handleSelectQuote(quote._id)}
          style={{ margin: 0 }}
        />
      )
    },
    { 
      key: 'rfq', 
      header: 'RFQ', 
      render: (rfq, quote) => {
        if (editingQuote === quote._id) {
          return (
            <div>
              <input
                type="text"
                value={editFormData.rfq?.title || ''}
                onChange={(e) => setEditFormData({
                  ...editFormData,
                  rfq: { ...editFormData.rfq, title: e.target.value }
                })}
                style={{ width: '100%', fontSize: '12px' }}
              />
              <div style={{ fontSize: '10px', color: 'var(--muted)' }}>
                {editFormData.rfq?.department || 'General'}
              </div>
            </div>
          );
        }
        return (
          <div>
            <div style={{ fontWeight: '500' }}>{rfq?.title || 'N/A'}</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
              {rfq?.department || 'General'}
            </div>
          </div>
        );
      }
    },
    { 
      key: 'supplierName', 
      header: 'Supplier',
      render: (value, quote) => {
        if (editingQuote === quote._id) {
          return (
            <div>
              <input
                type="text"
                value={editFormData.supplierName || ''}
                onChange={(e) => setEditFormData({
                  ...editFormData,
                  supplierName: e.target.value
                })}
                style={{ width: '100%', fontSize: '12px' }}
              />
              <div style={{ fontSize: '10px', color: 'var(--muted)' }}>
                {editFormData.items?.length || 0} items
              </div>
            </div>
          );
        }
        return (
          <div>
            <div style={{ fontWeight: '500' }}>{value}</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
              {quote.items?.length || 0} items
            </div>
          </div>
        );
      }
    },
    { 
      key: 'submittedBy', 
      header: 'Submitted By',
      render: (submittedBy, quote) => (
        <div>
          <div>{submittedBy?.firstName} {submittedBy?.lastName}</div>
          <div style={{ fontSize: '12px' }}>
            {getPermissionIndicator(quote)}
          </div>
        </div>
      )
    },
    { 
      key: 'approvalStatus', 
      header: 'Status',
      render: (status, quote) => {
        if (editingQuote === quote._id) {
          return (
            <select
              value={editFormData.approvalStatus || status}
              onChange={(e) => setEditFormData({
                ...editFormData,
                approvalStatus: e.target.value
              })}
              style={{ fontSize: '12px' }}
            >
              <option value="SUBMITTED">Submitted</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          );
        }
        return getStatusBadge(status);
      }
    },
    { 
      key: 'grandTotal', 
      header: 'Total Value',
      render: (value, quote) => {
        if (editingQuote === quote._id) {
          return (
            <input
              type="number"
              value={editFormData.grandTotal || value || 0}
              onChange={(e) => setEditFormData({
                ...editFormData,
                grandTotal: parseFloat(e.target.value) || 0
              })}
              style={{ width: '100%', textAlign: 'right', fontSize: '12px' }}
            />
          );
        }
        return (
          <div style={{ textAlign: 'right', fontWeight: '500' }}>
            ₹{(value || 0).toLocaleString()}
          </div>
        );
      }
    },
    { 
      key: 'lastEditedAt', 
      header: 'Last Updated',
      render: (value, quote) => (
        <div>
          <div>{value ? new Date(value).toLocaleDateString() : new Date(quote.createdAt).toLocaleDateString()}</div>
          <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
            {quote.editCount || 0} edits
          </div>
        </div>
      )
    },
    { 
      key: 'actions', 
      header: 'Actions',
      render: (_, quote) => {
        if (editingQuote === quote._id) {
          return (
            <div style={{ display: 'flex', gap: '4px', flexDirection: 'column' }}>
              <div style={{ display: 'flex', gap: '4px' }}>
                <Button 
                  variant="primary" 
                  size="sm" 
                  onClick={handleSaveInlineEdit}
                >
                  Save
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={handleCancelInlineEdit}
                >
                  Cancel
                </Button>
              </div>
            </div>
          );
        }

        return (
          <div style={{ display: 'flex', gap: '4px', flexDirection: 'column' }}>
            {quote.canEdit ? (
              <div style={{ display: 'flex', gap: '4px' }}>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleInlineEdit(quote._id)}
                  title="Quick edit"
                >
                  ✏️
                </Button>
                <Button 
                  variant="primary" 
                  size="sm" 
                  onClick={() => handleEdit(quote._id)}
                  title="Full edit"
                >
                  Edit
                </Button>
              </div>
            ) : (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleView(quote._id)}
                title="View quote details"
              >
                View
              </Button>
            )}
            <div style={{ display: 'flex', gap: '4px' }}>
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => handleViewFiles(quote)}
                title="View uploaded files"
              >
                📎 Files
              </Button>
            </div>
            {quote.canEdit && (
              <Button 
                variant="danger" 
                size="sm" 
                onClick={() => handleDelete(quote._id, quote.supplierName)}
              >
                Delete
              </Button>
            )}
          </div>
        );
      }
    }
  ];

  const filterOptions = [
    { value: 'all', label: 'All Quotes', disabled: userRole.includes('basic') },
    { value: 'my', label: 'My Quotes' },
    { value: 'pending', label: 'Pending Approval' },
    { value: 'approved', label: 'Approved' }
  ];

  const actions = (
    <div className="flex gap-2">
      <Button variant="secondary" onClick={loadQuotes}>
        Refresh
      </Button>
      <Button 
        variant="primary" 
        onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'quote-entry' }))}
      >
        Create New Quote
      </Button>
    </div>
  );

  const bulkActions = selectedQuotes.size > 0 && (
    <div style={{ 
      marginBottom: '20px', 
      padding: '12px', 
      background: 'var(--panel-2)', 
      borderRadius: '6px',
      borderLeft: '4px solid var(--primary)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <span style={{ fontWeight: '500' }}>
          {selectedQuotes.size} quote{selectedQuotes.size !== 1 ? 's' : ''} selected
        </span>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => handleBulkStatusUpdate('SUBMITTED')}
            disabled={bulkLoading}
          >
            Mark as Submitted
          </Button>
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => handleBulkStatusUpdate('UNDER_REVIEW')}
            disabled={bulkLoading}
          >
            Mark as Under Review
          </Button>
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => handleBulkStatusUpdate('APPROVED')}
            disabled={bulkLoading}
          >
            Mark as Approved
          </Button>
          <Button 
            variant="danger" 
            size="sm" 
            onClick={handleBulkDelete}
            disabled={bulkLoading}
          >
            {bulkLoading ? 'Processing...' : 'Delete Selected'}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <PageLayout
      title="Quote Management"
      subtitle="Manage and edit submitted quotes based on your role permissions"
      actions={actions}
      loading={loading}
    >
      <FormSection>
        <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <FormField label="Filter">
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value)}
              style={{ minWidth: '150px' }}
            >
              {filterOptions.map(option => (
                <option 
                  key={option.value} 
                  value={option.value} 
                  disabled={option.disabled}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </FormField>
          
          <FormField label="Search">
            <input
              type="text"
              placeholder="Search by supplier, RFQ, or user..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ minWidth: '250px' }}
            />
          </FormField>
        </div>

        {/* Role Information */}
        <div style={{ 
          marginBottom: '20px', 
          padding: '12px', 
          background: 'var(--panel-2)', 
          borderRadius: '6px',
          fontSize: '14px'
        }}>
          <strong>Your Permissions:</strong> {' '}
          {userRole.includes('basic') && !userRole.includes('intermediate') && (
            <span className="badge">Basic - Can edit own quotes only</span>
          )}
          {userRole.includes('intermediate') && !userRole.includes('advanced') && (
            <span className="badge warn">Intermediate - Can edit pre-approval quotes</span>
          )}
          {userRole.includes('advanced') && (
            <span className="badge ok">Advanced - Can edit all quotes including approved</span>
          )}
        </div>

        {/* Bulk Actions */}
        {bulkActions}

        {/* Edit Mode Info */}
        {editingQuote && (
          <div style={{ 
            marginBottom: '20px', 
            padding: '12px', 
            background: '#fff3cd', 
            border: '1px solid #ffeaa7',
            borderRadius: '6px',
            fontSize: '14px'
          }}>
            <strong>✏️ Inline Edit Mode:</strong> You are currently editing a quote. Make your changes and click "Save" to apply them, or "Cancel" to discard changes.
          </div>
        )}

        {filteredQuotes.length > 0 ? (
          <Table columns={columns} data={filteredQuotes} />
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
            {searchTerm ? (
              <>
                <h3>No quotes match your search</h3>
                <p>Try different search terms or clear the search filter.</p>
              </>
            ) : (
              <>
                <h3>No quotes found</h3>
                <p>Start by creating your first quote or check your filter settings.</p>
              </>
            )}
          </div>
        )}

        {/* Status Legend */}
        <div style={{ 
          marginTop: '20px', 
          padding: '16px', 
          background: 'var(--panel-2)', 
          borderRadius: '8px',
          fontSize: '13px'
        }}>
          <strong>Status Guide:</strong>
          <div style={{ display: 'flex', gap: '16px', marginTop: '8px', flexWrap: 'wrap' }}>
            <div><span className="badge">Submitted</span> - Ready for review</div>
            <div><span className="badge warn">Under Review</span> - Being evaluated</div>
            <div><span className="badge ok">Approved</span> - Approved for use</div>
            <div><span className="badge danger">Rejected</span> - Requires changes</div>
          </div>
          <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--muted)' }}>
            💡 <strong>Note:</strong> Editing quotes under review or approved will reset their status to "Submitted" for re-approval.
          </div>
          <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--muted)' }}>
            ✏️ <strong>Quick Edit:</strong> Click the pencil icon for inline editing, or "Edit" for the full form. 
            📋 <strong>Bulk Actions:</strong> Select multiple quotes using checkboxes to perform bulk operations.
            📎 <strong>View Files:</strong> Click the "Files" button to view and download attached files.
          </div>
        </div>
      </FormSection>

      {/* Files Modal */}
      {viewingFiles && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={handleCloseFilesView}
        >
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              maxWidth: '800px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              padding: '20px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
                Files for Quote from {viewingFiles.supplierName}
              </h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleCloseFilesView}
                style={{ padding: '4px 8px' }}
              >
                ✕
              </Button>
            </div>
            <div style={{ padding: '20px' }}>
              <QuoteAttachments quotes={[viewingFiles]} />
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
