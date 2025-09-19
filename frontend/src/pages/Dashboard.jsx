import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import { PageLayout, FormSection, Button, Table } from '../components/PageLayout.jsx';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalRFQs: 0,
    pendingQuotes: 0,
    completedRFQs: 0,
    totalSuppliers: 0
  });
  const [recentRFQs, setRecentRFQs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // For now, we'll use placeholder data since we don't have dashboard API endpoints
      // In a real application, you would fetch this from the backend
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setStats({
        totalRFQs: 12,
        pendingQuotes: 5,
        completedRFQs: 7,
        totalSuppliers: 25
      });

      setRecentRFQs([
        { id: 'RFQ-001', title: 'Office Supplies Q1', status: 'Open', created: '2025-08-20', quotes: 3 },
        { id: 'RFQ-002', title: 'IT Equipment Purchase', status: 'Pending', created: '2025-08-19', quotes: 1 },
        { id: 'RFQ-003', title: 'Facility Maintenance', status: 'Completed', created: '2025-08-18', quotes: 5 },
        { id: 'RFQ-004', title: 'Marketing Materials', status: 'Open', created: '2025-08-17', quotes: 2 },
        { id: 'RFQ-005', title: 'Safety Equipment', status: 'Pending', created: '2025-08-16', quotes: 0 }
      ]);
      
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const testApiHealth = async () => {
    try {
      const response = await api.get('/health');
      alert(`API Health Check Successful!\n\nResponse: ${JSON.stringify(response.data, null, 2)}`);
    } catch (err) {
      alert(`API Health Check Failed!\n\nError: ${err.message}`);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      'Open': 'bg-green-100 text-green-800',
      'Pending': 'bg-yellow-100 text-yellow-800',
      'Completed': 'bg-blue-100 text-blue-800',
      'Closed': 'bg-slate-100 text-slate-800'
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles['Closed']}`}>
        {status}
      </span>
    );
  };

  const tableColumns = [
    { key: 'id', header: 'RFQ ID' },
    { key: 'title', header: 'Title' },
    { 
      key: 'status', 
      header: 'Status',
      render: (value) => getStatusBadge(value)
    },
    { key: 'created', header: 'Created' },
    { 
      key: 'quotes', 
      header: 'Quotes',
      render: (value) => (
        <span className="text-center">{value}</span>
      )
    }
  ];

  const actions = (
    <div className="flex gap-2">
      <Button variant="ghost" size="sm" onClick={testApiHealth}>
        Test API
      </Button>
      <Button variant="secondary" size="sm" onClick={loadDashboardData}>
        Refresh
      </Button>
    </div>
  );

  return (
    <PageLayout
      title="Dashboard"
      subtitle="Overview of your procurement activities"
      actions={actions}
      loading={loading}
      error={error}
    >
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-blue-100 text-sm font-medium">Total RFQs</p>
              <p className="text-3xl font-bold">{stats.totalRFQs}</p>
            </div>
            <div className="ml-4">
              <div className="w-12 h-12 bg-blue-400 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                  <path fillRule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 102 0V3h4v1a1 1 0 102 0V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 100-2 1 1 0 000 2zm3 0a1 1 0 100-2 1 1 0 000 2zm3 0a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg p-6 text-white">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-yellow-100 text-sm font-medium">Pending Quotes</p>
              <p className="text-3xl font-bold">{stats.pendingQuotes}</p>
            </div>
            <div className="ml-4">
              <div className="w-12 h-12 bg-yellow-400 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-green-100 text-sm font-medium">Completed RFQs</p>
              <p className="text-3xl font-bold">{stats.completedRFQs}</p>
            </div>
            <div className="ml-4">
              <div className="w-12 h-12 bg-green-400 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-purple-100 text-sm font-medium">Total Suppliers</p>
              <p className="text-3xl font-bold">{stats.totalSuppliers}</p>
            </div>
            <div className="ml-4">
              <div className="w-12 h-12 bg-purple-400 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM9 1a1 1 0 000 2v3a1 1 0 102 0V3a1 1 0 100-2H9z"/>
                  <path fillRule="evenodd" d="M6 15a2 2 0 100-4 2 2 0 000 4zm8 0a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent RFQs Table */}
      <FormSection
        title="Recent RFQs"
        subtitle="Your most recent Request for Quotes"
      >
        {recentRFQs.length > 0 ? (
          <Table columns={tableColumns} data={recentRFQs} />
        ) : (
          <div className="text-center py-8 text-slate-500">
            <svg className="mx-auto h-12 w-12 text-slate-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path d="M34 40h10v-4a6 6 0 00-10.712-3.714M34 40H14m20 0v-4a9.971 9.971 0 00-.712-3.714M14 40H4v-4a6 6 0 0110.713-3.714M14 40v-4c0-1.313.253-2.566.713-3.714m0 0A10.003 10.003 0 0124 26c4.21 0 7.813 2.602 9.288 6.286M30 14a6 6 0 11-12 0 6 6 0 0112 0zm12 6a4 4 0 11-8 0 4 4 0 018 0zm-28 0a4 4 0 11-8 0 4 4 0 018 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-slate-900">No RFQs found</h3>
            <p className="mt-1 text-sm text-slate-500">Get started by creating your first RFQ.</p>
          </div>
        )}
      </FormSection>

      {/* Quick Actions */}
      <FormSection
        title="Quick Actions"
        subtitle="Common tasks you can perform"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-slate-200 rounded-lg p-6 hover:bg-slate-50 transition-colors">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/>
                </svg>
              </div>
              <h3 className="ml-3 text-lg font-medium text-slate-900">Create RFQ</h3>
            </div>
            <p className="text-sm text-slate-600 mb-4">Start a new Request for Quote to collect supplier bids.</p>
            <Button variant="secondary" size="sm" className="w-full">
              Get Started
            </Button>
          </div>

          <div className="border border-slate-200 rounded-lg p-6 hover:bg-slate-50 transition-colors">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                </svg>
              </div>
              <h3 className="ml-3 text-lg font-medium text-slate-900">Enter Quote</h3>
            </div>
            <p className="text-sm text-slate-600 mb-4">Submit a supplier quote for an existing RFQ.</p>
            <Button variant="secondary" size="sm" className="w-full">
              Submit Quote
            </Button>
          </div>

          <div className="border border-slate-200 rounded-lg p-6 hover:bg-slate-50 transition-colors">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/>
                </svg>
              </div>
              <h3 className="ml-3 text-lg font-medium text-slate-900">Compare Quotes</h3>
            </div>
            <p className="text-sm text-slate-600 mb-4">Analyze and compare quotes from different suppliers.</p>
            <Button variant="secondary" size="sm" className="w-full">
              Compare Now
            </Button>
          </div>
        </div>
      </FormSection>
    </PageLayout>
  );
}
