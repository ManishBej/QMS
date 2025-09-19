import React, { useState, useEffect } from 'react';
import { PageLayout, FormSection, FormField, Button, Table } from '../components/PageLayout.jsx';
import api from '../services/api.js';

export default function Approvals() {
  const [rfqs, setRfqs] = useState([]);
  const [selectedRfq, setSelectedRfq] = useState('');
  const [currentApprover, setCurrentApprover] = useState('');
  const [approvalFlow, setApprovalFlow] = useState([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadUserAndRfqs();
  }, []);

  useEffect(() => {
    if (selectedRfq) {
      loadApprovalFlow(selectedRfq);
    }
  }, [selectedRfq]);

  // Auto-populate approver when user data is loaded
  useEffect(() => {
    if (user) {
      // Use fullName first, fallback to firstName + lastName, then username
      let approverName = '';
      if (user.fullName) {
        approverName = user.fullName;
      } else if (user.firstName && user.lastName) {
        approverName = `${user.firstName} ${user.lastName}`;
      } else if (user.firstName) {
        approverName = user.firstName;
      } else if (user.username) {
        approverName = user.username;
      } else {
        approverName = 'Unknown User';
      }
      
      // Add role information if available
      const roleInfo = user.roles?.includes('advanced') ? ' (Advanced)' : 
                      user.roles?.includes('admin') ? ' (Admin)' : '';
      setCurrentApprover(`${approverName}${roleInfo}`);
    }
  }, [user]);

  const loadUserAndRfqs = async () => {
    try {
      // Load user information first
      const userResponse = await api.get('/me');
      setUser(userResponse.data);
      
      // Then load RFQs
      await loadRfqs();
    } catch (error) {
      console.error('Failed to load user data:', error);
      // Continue to load RFQs even if user load fails
      await loadRfqs();
    }
  };

  const loadRfqs = async () => {
    try {
      const response = await api.get('/secure/rfqs');
      setRfqs(response.data);
      if (response.data.length > 0 && !selectedRfq) {
        setSelectedRfq(response.data[0]._id);
      }
    } catch (error) {
      console.error('Failed to load RFQs:', error);
    }
  };

  const loadApprovalFlow = (rfqId) => {
    // Create default approval flow (simulated backend logic)
    const defaultFlow = [
      { seq: 1, role: 'Procurement Manager', status: 'PENDING', ts: null, by: null },
      { seq: 2, role: 'Finance', status: 'PENDING', ts: null, by: null },
      { seq: 3, role: 'Management', status: 'PENDING', ts: null, by: null }
    ];

    // Load existing approvals from localStorage (simulating backend)
    const existingApprovals = JSON.parse(localStorage.getItem('approvals') || '{}');
    const flow = existingApprovals[rfqId] || defaultFlow;
    setApprovalFlow(flow);
  };

  const saveApprovalFlow = (flow) => {
    const existingApprovals = JSON.parse(localStorage.getItem('approvals') || '{}');
    existingApprovals[selectedRfq] = flow;
    localStorage.setItem('approvals', JSON.stringify(existingApprovals));
  };

  const handleApprove = () => {
    if (!selectedRfq) {
      alert('Please select an RFQ first');
      return;
    }
    
    if (!currentApprover.trim()) {
      alert('Unable to identify current approver. Please refresh the page and try again.');
      return;
    }

    const updatedFlow = [...approvalFlow];
    const currentStep = updatedFlow.find(step => step.status === 'PENDING');
    
    if (!currentStep) {
      alert('All approval steps are already completed');
      return;
    }

    currentStep.status = 'APPROVED';
    currentStep.ts = new Date().toLocaleString();
    currentStep.by = currentApprover.trim();

    // Check if all steps are approved
    const allApproved = updatedFlow.every(step => step.status === 'APPROVED');
    if (allApproved) {
      // Update RFQ status to approved (in a real app, this would be an API call)
      alert('All approval steps completed! RFQ is now fully approved.');
    }

    setApprovalFlow(updatedFlow);
    saveApprovalFlow(updatedFlow);
  };

  const handleReject = () => {
    if (!selectedRfq) {
      alert('Please select an RFQ first');
      return;
    }
    
    if (!currentApprover.trim()) {
      alert('Unable to identify current approver. Please refresh the page and try again.');
      return;
    }

    const updatedFlow = [...approvalFlow];
    const currentStep = updatedFlow.find(step => step.status === 'PENDING');
    
    if (!currentStep) {
      alert('All approval steps are already completed');
      return;
    }

    currentStep.status = 'REJECTED';
    currentStep.ts = new Date().toLocaleString();
    currentStep.by = currentApprover.trim();

    setApprovalFlow(updatedFlow);
    saveApprovalFlow(updatedFlow);
    alert('Step rejected. Approval process stopped.');
  };

  const approvalColumns = [
    { key: 'seq', header: 'Seq' },
    { key: 'role', header: 'Role' },
    { 
      key: 'status', 
      header: 'Status',
      render: (value) => (
        <span className={`badge ${value === 'APPROVED' ? 'ok' : value === 'REJECTED' ? 'danger' : 'warn'}`}>
          {value}
        </span>
      )
    },
    { key: 'ts', header: 'Timestamp' },
    { key: 'by', header: 'By' }
  ];

  const selectedRfqData = rfqs.find(rfq => rfq._id === selectedRfq);

  return (
    <PageLayout
      title="Approvals (Strict Sequence)"
      subtitle="Manage sequential approval workflow for RFQs"
      loading={loading}
    >
      <FormSection>
        <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <FormField label="Select RFQ">
            <select 
              value={selectedRfq} 
              onChange={(e) => setSelectedRfq(e.target.value)}
              style={{ minWidth: '200px' }}
            >
              <option value="">-- Select RFQ --</option>
              {rfqs.map(rfq => (
                <option key={rfq._id} value={rfq._id}>
                  {rfq._id} - {rfq.title}
                </option>
              ))}
            </select>
          </FormField>
          
          <FormField label="Current Approver (Auto-filled with your name)">
            <input
              value={currentApprover}
              placeholder="Loading your name..."
              style={{ 
                minWidth: '180px',
                backgroundColor: 'var(--panel-2)',
                color: 'var(--muted)',
                cursor: 'not-allowed'
              }}
              readOnly
              disabled
            />
          </FormField>
        </div>

        {selectedRfqData && (
          <div className="card" style={{ padding: '16px', marginBottom: '20px', background: 'var(--panel-2)' }}>
            <h3 style={{ margin: '0 0 8px 0' }}>RFQ Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '14px' }}>
              <div><strong>Title:</strong> {selectedRfqData.title}</div>
              <div><strong>Status:</strong> <span className="badge">{selectedRfqData.status}</span></div>
              <div><strong>Created:</strong> {new Date(selectedRfqData.createdAt).toLocaleDateString()}</div>
              <div><strong>Items:</strong> {selectedRfqData.items?.length || 0}</div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          <Button variant="primary" onClick={handleApprove}>
            ✅ Approve
          </Button>
          <Button variant="danger" onClick={handleReject}>
            ❌ Reject
          </Button>
        </div>

        <div style={{ height: '1px', background: 'var(--border)', margin: '20px 0' }}></div>

        <div>
          <h3 style={{ marginBottom: '16px' }}>Approval Flow</h3>
          <Table columns={approvalColumns} data={approvalFlow} />
        </div>

        {approvalFlow.length > 0 && (
          <div style={{ marginTop: '16px', padding: '12px', background: 'var(--panel-2)', borderRadius: '8px' }}>
            <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
              💡 <strong>Instructions:</strong> Approvals must be completed in sequence. 
              Each step must be approved by the designated role before the next step becomes available.
              {approvalFlow.find(s => s.status === 'PENDING') && (
                <span> Current pending step: <strong>{approvalFlow.find(s => s.status === 'PENDING').role}</strong></span>
              )}
            </div>
          </div>
        )}
      </FormSection>
    </PageLayout>
  );
}
