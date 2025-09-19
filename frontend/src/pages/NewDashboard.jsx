import React, { useState, useEffect } from 'react';
import { PageLayout, FormSection, FormField, Button, Table } from '../components/PageLayout.jsx';
import { ResponsiveTable, ResponsiveGrid } from '../components/ResponsiveComponents.jsx';
import api from '../services/api.js';

export default function Dashboard() {
  const [stats, setStats] = useState({
    openRfqs: 0,
    quotesAwaiting: 0,
    approvalsPending: 0,
    weeklySavings: 0
  });
  const [recentRfqs, setRecentRfqs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load RFQs for stats and recent list
      const rfqsResponse = await api.get('/rfqs');
      const rfqs = rfqsResponse.data || [];
      
      // Calculate stats
      const openRfqs = rfqs.filter(rfq => rfq.status === 'Open' || rfq.status === 'OPEN').length;
      const quotesAwaiting = rfqs.reduce((acc, rfq) => acc + (rfq.quotes?.length || 0), 0);
      
      setStats({
        openRfqs,
        quotesAwaiting,
        approvalsPending: Math.floor(Math.random() * 5), // Placeholder
        weeklySavings: Math.floor(Math.random() * 50000) // Placeholder
      });
      
      // Set recent RFQs (last 5)
      setRecentRfqs(rfqs.slice(-5).reverse());
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewRFQ = (rfqId) => {
    // Navigate to compare view with the RFQ ID pre-filled
    window.dispatchEvent(new CustomEvent('navigate', { 
      detail: 'compare', 
      rfqId: rfqId 
    }));
    
    // Store the RFQ ID in sessionStorage for the compare view to pick up
    sessionStorage.setItem('compareRfqId', rfqId);
  };

  if (loading) {
    return (
      <div className="app-main">
        <div className="card">
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              border: '4px solid var(--border)', 
              borderTop: '4px solid var(--brand)', 
              borderRadius: '50%', 
              animation: 'spin 1s linear infinite',
              margin: '0 auto 20px'
            }}></div>
            <p className="muted">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-main">
      {/* KPIs - Now with ResponsiveGrid */}
      <ResponsiveGrid columns={4} gap="md">
        <div className="kpi">
          <div className="label muted">Open RFQs</div>
          <div className="value">{stats.openRfqs}</div>
        </div>
        <div className="kpi">
          <div className="label muted">Quotes Awaiting</div>
          <div className="value">{stats.quotesAwaiting}</div>
        </div>
        <div className="kpi">
          <div className="label muted">Approvals Pending</div>
          <div className="value">{stats.approvalsPending}</div>
        </div>
        <div className="kpi">
          <div className="label muted">Weekly Savings (₹)</div>
          <div className="value">{stats.weeklySavings.toLocaleString()}</div>
        </div>
      </ResponsiveGrid>

      {/* Recent RFQs */}
      {/* Recent RFQs - Now using ResponsiveTable */}
      <div className="card" style={{ marginTop: '20px' }}>
        <h2 style={{ margin: '0 0 16px 0' }}>Recent RFQs</h2>
        <ResponsiveTable
          columns={[
            { key: 'id', header: 'RFQ ID', render: (value, row) => (
              <code style={{ 
                background: 'var(--chip)', 
                padding: '2px 6px', 
                borderRadius: '4px',
                fontSize: '12px'
              }}>
                {(row._id || row.id)?.slice(-8)}
              </code>
            )},
            { key: 'title', header: 'Title' },
            { key: 'status', header: 'Status', render: (value) => (
              <span className={`badge ${value === 'Open' || value === 'OPEN' ? 'ok' : ''}`}>
                {value}
              </span>
            )},
            { key: 'items', header: 'Items', render: (value, row) => (
              row.items?.length || row.lineItems?.length || 0
            )},
            { key: 'createdAt', header: 'Created', render: (value) => (
              new Date(value).toLocaleDateString()
            )},
            { key: 'actions', header: 'Actions', render: (value, row) => (
              <button 
                className="btn" 
                style={{ padding: '4px 8px', fontSize: '12px' }}
                onClick={() => handleViewRFQ(row._id || row.id)}
              >
                View
              </button>
            )}
          ]}
          data={recentRfqs}
          loading={loading}
          emptyMessage="No RFQs found. Create your first RFQ to get started!"
        />
      </div>

      {/* Quick Actions - Now using ResponsiveGrid */}
      {/* Quick Actions - Now using ResponsiveGrid */}
      <ResponsiveGrid columns={3} gap="md" style={{ marginTop: '20px' }}>
        <div className="card" style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'rfq-create' }))}>
          <div style={{ fontSize: '2em', marginBottom: '10px' }}>📝</div>
          <h3 style={{ margin: '0 0 5px 0' }}>Create RFQ</h3>
          <p className="muted" style={{ margin: 0, fontSize: '12px' }}>Start a new request for quotation</p>
        </div>
        
        <div className="card" style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'quote-entry' }))}>
          <div style={{ fontSize: '2em', marginBottom: '10px' }}>💬</div>
          <h3 style={{ margin: '0 0 5px 0' }}>Enter Quotes</h3>
          <p className="muted" style={{ margin: 0, fontSize: '12px' }}>Submit supplier quotations</p>
        </div>
        
        <div className="card" style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'compare' }))}>
          <div style={{ fontSize: '2em', marginBottom: '10px' }}>📊</div>
          <h3 style={{ margin: '0 0 5px 0' }}>Compare Quotes</h3>
          <p className="muted" style={{ margin: 0, fontSize: '12px' }}>Analyze and score quotations</p>
        </div>

        <div className="card" style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'approvals' }))}>
          <div style={{ fontSize: '2em', marginBottom: '10px' }}>✅</div>
          <h3 style={{ margin: '0 0 5px 0' }}>Approvals</h3>
          <p className="muted" style={{ margin: 0, fontSize: '12px' }}>Manage approval workflow</p>
        </div>

        <div className="card" style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'reports' }))}>
          <div style={{ fontSize: '2em', marginBottom: '10px' }}>📊</div>
          <h3 style={{ margin: '0 0 5px 0' }}>Reports</h3>
          <p className="muted" style={{ margin: 0, fontSize: '12px' }}>Generate performance reports</p>
        </div>

        <div className="card" style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'settings' }))}>
          <div style={{ fontSize: '2em', marginBottom: '10px' }}>⚙️</div>
          <h3 style={{ margin: '0 0 5px 0' }}>Settings</h3>
          <p className="muted" style={{ margin: 0, fontSize: '12px' }}>Configure system preferences</p>
        </div>
      </ResponsiveGrid>
    </div>
  );
}
