import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api.js';
import StickyTable from '../components/StickyTable.jsx';
import QuoteAttachments from '../components/QuoteAttachments.jsx';
import { PageLayout, FormSection, FormField, Input, Button, Table } from '../components/PageLayout.jsx';

export default function CompareView() {
  const [rfqId, setRfqId] = useState('');
  const [rfq, setRfq] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState(null);
  const [scoreResults, setScoreResults] = useState(null);
  
  // New state for RFQ selection functionality
  const [rfqs, setRfqs] = useState([]);
  const [selectedRfqId, setSelectedRfqId] = useState('');
  const [selectedRfq, setSelectedRfq] = useState(null);
  
  // Default scoring weights
  const [weights] = useState({
    price: 0.5,      // 50%
    delivery: 0.2,   // 20%
    vendor: 0.2,     // 20%
    compliance: 0.1  // 10%
  });

  // Check for RFQ ID from dashboard navigation
  useEffect(() => {
    const storedRfqId = sessionStorage.getItem('compareRfqId');
    if (storedRfqId) {
      setRfqId(storedRfqId);
      // Auto-load the RFQ
      sessionStorage.removeItem('compareRfqId'); // Clean up
      // Set a small timeout to ensure the state is updated
      setTimeout(() => {
        loadRfq(storedRfqId);
      }, 100);
    }
  }, []);

  const loadRfq = async (idToLoad = rfqId) => {
    setError(null);
    setRfq(null);
    setResult(null);
    
    if (!idToLoad.trim()) { 
      setError('Enter RFQ ID'); 
      return; 
    }
    
    setLoading(true);
    try {
      console.log('Loading RFQ for comparison:', idToLoad.trim());
      const res = await api.get(`/rfqs/${idToLoad.trim()}`);
      console.log('RFQ loaded:', res.data);
      setRfq(res.data);
      setError(null);
      
      if (!res.data.quotes || res.data.quotes.length === 0) {
        setResult({
          success: false,
          message: 'No quotes found for this RFQ. Please ensure quotes have been submitted.'
        });
      } else {
        setResult({
          success: true,
          message: `Loaded ${res.data.quotes.length} quotes for comparison.`
        });
      }
    } catch (e) {
      console.error('Failed to load RFQ:', e);
      setError('RFQ not found or unauthorized');
    } finally {
      setLoading(false);
    }
  };

  // Load all RFQs for selection dropdown
  const loadRfqs = async () => {
    try {
      const response = await api.get('/rfqs');
      // Only show RFQs that have quotes submitted (quotes are already populated by backend)
      const rfqsWithQuotes = response.data.filter(rfq => 
        rfq.quotes && rfq.quotes.length > 0
      );
      
      setRfqs(rfqsWithQuotes);
    } catch (error) {
      console.error('Failed to load RFQs:', error);
      setResult({
        success: false,
        message: 'Failed to load RFQs: ' + (error.response?.data?.message || error.message)
      });
    }
  };

  // Load quotes for a specific RFQ
  const loadQuotesForRfq = async (rfqId) => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);
      
      // Load RFQ details with populated quotes
      const rfqResponse = await api.get(`/rfqs/${rfqId}`);
      setSelectedRfq(rfqResponse.data);
      setRfq(rfqResponse.data); // Keep compatibility with existing code
      
      // Clear previous scoring results
      setScoreResults(null);
      
      if (!rfqResponse.data.quotes || rfqResponse.data.quotes.length === 0) {
        setResult({
          success: false,
          message: 'No quotes found for this RFQ. Please ensure quotes have been submitted.'
        });
      } else {
        setResult({
          success: true,
          message: `Loaded ${rfqResponse.data.quotes.length} quotes for comparison.`
        });
      }
      
    } catch (error) {
      console.error('Failed to load RFQ details and quotes:', error);
      setError('RFQ not found or unauthorized');
      setResult({
        success: false,
        message: 'Failed to load RFQ details: ' + (error.response?.data?.message || error.message)
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle RFQ selection
  useEffect(() => {
    if (selectedRfqId) {
      loadQuotesForRfq(selectedRfqId);
    } else {
      setSelectedRfq(null);
      setRfq(null); // Keep compatibility
      setScoreResults(null);
    }
  }, [selectedRfqId]);

  // Load RFQs on component mount
  useEffect(() => {
    loadRfqs();
  }, []);

  // Scoring functionality
  const runScoring = () => {
    if (!rfq || !rfq.quotes || rfq.quotes.length === 0) {
      setResult({
        success: false,
        message: 'Please load an RFQ with quotes to run scoring'
      });
      return;
    }

    const scoredResults = calculateScores();
    setScoreResults(scoredResults);
    setResult({
      success: true,
      message: `Scoring completed for ${scoredResults.length} quotes. Results sorted by total score.`
    });
  };

  const calculateScores = () => {
    const results = [];
    
    // Process each vendor's quote
    rfq.quotes.forEach(quote => {
      let totalLandedCost = 0;
      let averageDeliveryDays = 0;
      let validItems = 0;
      
      // Calculate totals for this vendor
      quote.items.forEach(item => {
        const landedCost = calculateLandedCost(item);
        totalLandedCost += landedCost;
        averageDeliveryDays += item.deliveryDays || 7; // Default 7 days
        validItems++;
      });
      
      if (validItems > 0) {
        averageDeliveryDays = averageDeliveryDays / validItems;
      }
      
      results.push({
        vendor: quote.supplierName,
        quote: quote,
        totalLandedCost,
        averageDeliveryDays,
        vendorHistory: extractVendorHistory(quote.notes),
        compliance: extractCompliance(quote.notes)
      });
    });
    
    // Calculate relative scores
    if (results.length > 0) {
      const minCost = Math.min(...results.map(r => r.totalLandedCost));
      const minDelivery = Math.min(...results.map(r => r.averageDeliveryDays));
      
      results.forEach(result => {
        // Price score (lower cost = higher score)
        result.priceScore = minCost > 0 ? (minCost / result.totalLandedCost) * 100 : 100;
        
        // Delivery score (shorter delivery = higher score) 
        result.deliveryScore = minDelivery > 0 ? (minDelivery / result.averageDeliveryDays) * 100 : 100;
        
        // Total weighted score
        result.totalScore = 
          (weights.price * result.priceScore) +
          (weights.delivery * result.deliveryScore) +
          (weights.vendor * result.vendorHistory) +
          (weights.compliance * result.compliance);
      });
      
      // Sort by total score (highest first)
      results.sort((a, b) => b.totalScore - a.totalScore);
    }
    
    return results;
  };

  const calculateLandedCost = (item) => {
    const basePrice = item.totalPrice || (item.unitPrice * item.quantity);
    return basePrice + 
           (item.freight || 0) + 
           (item.insurance || 0) + 
           (item.customsDuty || 0) + 
           (item.installation || 0) + 
           (item.taxes || 0);
  };

  const extractVendorHistory = (notes) => {
    const match = notes?.match(/Vendor History: (\d+)%/);
    return match ? parseInt(match[1]) : 75; // Default 75%
  };

  const extractCompliance = (notes) => {
    const match = notes?.match(/Compliance: (\d+)%/);
    return match ? parseInt(match[1]) : 95; // Default 95%
  };

  const load = () => loadRfq();

  const columns = useMemo(() => {
    if (!rfq) return [];
    const base = [
      { key: 'desc', header: 'Item / SKU' }, 
      { key: 'qty', header: 'Quantity' }, 
      { key: 'unit', header: 'Unit' }
    ];
    const vendorCols = (rfq.quotes || []).map(q => ({ 
      key: `v_${q._id}`, 
      header: q.supplierName,
      render: (value) => value ? `₹${Number(value).toFixed(2)}` : '-'
    }));
    return [...base, ...vendorCols];
  }, [rfq?._id]);

  const rows = useMemo(() => {
    if (!rfq) return [];
    const rowList = rfq.items.map(it => ({ 
      desc: it.productText || it.productId || 'N/A', 
      qty: it.quantity, 
      unit: it.uom 
    }));
    
    // Fill vendor price per row
    (rfq.quotes || []).forEach(q => {
      q.items.forEach(li => {
        const row = rowList.find(r => 
          (r.desc || '').toUpperCase() === (li.productText || li.productId || '').toUpperCase()
        );
        if (row) row[`v_${q._id}`] = li.unitPrice;
      });
    });
    return rowList;
  }, [rfq?._id]);

  const exportExcel = async () => {
    if (!rfqId.trim()) { 
      setError('Enter RFQ ID'); 
      return; 
    }
    
    setExporting(true);
    setResult(null);
    
    try {
      console.log('Exporting RFQ to Excel:', rfqId.trim());
      const url = `${api.defaults.baseURL.replace(/\/$/, '')}/reports/export?rfqId=${encodeURIComponent(rfqId.trim())}`;
      const resp = await fetch(url, { 
        headers: { 
          Authorization: (api.defaults.headers.common.Authorization || '') 
        } 
      });
      
      if (!resp.ok) throw new Error('Export failed');
      
      const blob = await resp.blob();
      const a = document.createElement('a');
      const dlUrl = URL.createObjectURL(blob);
      a.href = dlUrl;
      a.download = `rfq-${rfqId.trim()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(dlUrl);
      
      setResult({
        success: true,
        message: 'Excel file downloaded successfully!'
      });
      
    } catch (e) {
      console.error('Failed to export:', e);
      setResult({
        success: false,
        message: e.message || 'Export failed. Please try again.'
      });
    } finally {
      setExporting(false);
    }
  };

  const resetForm = () => {
    setRfqId('');
    setRfq(null);
    setError(null);
    setResult(null);
    setSelectedRfqId('');
    setSelectedRfq(null);
    setScoreResults(null);
  };

  const actions = rfq ? (
    <div className="flex gap-2">
      <Button 
        variant="secondary" 
        onClick={resetForm}
      >
        Reset
      </Button>
      <Button 
        variant="primary" 
        onClick={exportExcel}
        loading={exporting}
      >
        Export to Excel
      </Button>
    </div>
  ) : null;

  return (
    <PageLayout
      title="Compare Quotes"
      subtitle={rfq ? `Comparing quotes for: ${rfq.title}` : "Load an RFQ to compare quotes from different suppliers"}
      actions={actions}
    >
      {/* Result Message */}
      {result && (
        <div style={{ 
          marginBottom: '24px', 
          padding: '16px', 
          borderRadius: '8px',
          background: result.success ? 'var(--ok)/10' : 'var(--danger)/10',
          border: `1px solid ${result.success ? 'var(--ok)' : 'var(--danger)'}`,
          color: 'var(--text)'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start' }}>
            <div style={{ flexShrink: 0, marginRight: '12px' }}>
              {result.success ? (
                <svg style={{ width: '20px', height: '20px', color: 'var(--ok)' }} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg style={{ width: '20px', height: '20px', color: 'var(--danger)' }} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div>
              <p style={{ 
                fontSize: '14px', 
                fontWeight: '500',
                margin: 0,
                color: result.success ? 'var(--ok)' : 'var(--danger)'
              }}>
                {result.message}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Load RFQ Section */}
      <FormSection 
        title="Load RFQ"
        subtitle="Select an RFQ from dropdown or enter RFQ ID manually"
      >
        {/* RFQ Selection Dropdown */}
        <div className="flex gap-2 mb-4">
          <FormField className="flex-1">
            <label style={{ 
              display: 'block', 
              fontSize: '13px', 
              fontWeight: '500', 
              color: 'var(--text)', 
              marginBottom: '8px' 
            }}>
              Select RFQ
            </label>
            <select
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--panel)',
                color: 'var(--text)',
                fontSize: '14px',
                outline: 'none'
              }}
              value={selectedRfqId}
              onChange={(e) => setSelectedRfqId(e.target.value)}
              disabled={loading}
            >
              <option value="">-- Select RFQ --</option>
              {rfqs.map(rfq => (
                <option key={rfq._id} value={rfq._id}>
                  {rfq._id} — {rfq.title}
                </option>
              ))}
            </select>
          </FormField>
          <Button 
            variant="primary" 
            onClick={runScoring}
            disabled={!selectedRfq || !selectedRfq.quotes || selectedRfq.quotes.length === 0 || loading}
            style={{ background: 'var(--brand)', border: 'none', alignSelf: 'end' }}
          >
            Score Quotes
          </Button>
        </div>

        {/* Manual RFQ ID Input (Alternative Option) */}
        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
          <label style={{ 
            display: 'block', 
            fontSize: '13px', 
            fontWeight: '500', 
            color: 'var(--muted)', 
            marginBottom: '8px' 
          }}>
            Or enter RFQ ID manually
          </label>
          <div className="flex gap-2">
            <FormField 
              error={error}
              className="flex-1"
            >
              <Input
                placeholder="Enter RFQ ID (e.g., 67745..."
                value={rfqId}
                onChange={(e) => setRfqId(e.target.value)}
                error={error}
                disabled={loading}
              />
            </FormField>
            <Button 
              variant="secondary" 
              onClick={load}
              loading={loading}
              disabled={!rfqId.trim()}
            >
              Load RFQ
            </Button>
          </div>
        </div>
      </FormSection>

      {/* RFQ Information */}
      {rfq && (
        <FormSection 
          title="RFQ Information"
          subtitle="Overview of the RFQ and available quotes"
        >
          <div style={{ background: 'var(--panel-2)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)', margin: '0 0 4px 0' }}>Title</p>
                <p style={{ fontSize: '14px', color: 'var(--muted)', margin: 0 }}>{rfq.title}</p>
              </div>
              <div>
                <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)', margin: '0 0 4px 0' }}>Status</p>
                <p style={{ fontSize: '14px', color: 'var(--muted)', margin: 0 }}>{rfq.status}</p>
              </div>
              <div>
                <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)', margin: '0 0 4px 0' }}>Items</p>
                <p style={{ fontSize: '14px', color: 'var(--muted)', margin: 0 }}>{rfq.items?.length || 0} line items</p>
              </div>
              <div>
                <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)', margin: '0 0 4px 0' }}>Quotes Received</p>
                <p style={{ fontSize: '14px', color: 'var(--muted)', margin: 0 }}>{rfq.quotes?.length || 0} quotes</p>
              </div>
              <div>
                <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)', margin: '0 0 4px 0' }}>Created</p>
                <p style={{ fontSize: '14px', color: 'var(--muted)', margin: 0 }}>{new Date(rfq.createdAt).toLocaleDateString()}</p>
              </div>
              {rfq.quotes?.length > 0 && (
                <div>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)', margin: '0 0 4px 0' }}>Suppliers</p>
                  <p style={{ fontSize: '14px', color: 'var(--muted)', margin: 0 }}>
                    {rfq.quotes.map(q => q.supplierName).join(', ')}
                  </p>
                </div>
              )}
              {rfq.description && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)', margin: '0 0 4px 0' }}>Description</p>
                  <p style={{ fontSize: '14px', color: 'var(--muted)', margin: 0 }}>{rfq.description}</p>
                </div>
              )}
            </div>
          </div>
        </FormSection>
      )}

      {/* Quote Scoring Results */}
      {scoreResults && scoreResults.length > 0 && (
        <FormSection 
          title="Quote Scoring Results"
          subtitle="AI-powered scoring based on price, delivery, vendor history, and compliance"
        >
          <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ background: 'var(--panel-2)', padding: '16px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '16px', fontSize: '13px', fontWeight: '600', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <div>Rank</div>
                <div>Vendor</div>
                <div>Price Score</div>
                <div>Delivery Score</div>
                <div>Vendor Score</div>
                <div>Compliance Score</div>
                <div>Total Score</div>
                <div>Total Cost</div>
              </div>
            </div>
            <div>
              {scoreResults.map((result, index) => (
                <div key={index} style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(8, 1fr)', 
                  gap: '16px', 
                  padding: '16px', 
                  borderBottom: index < scoreResults.length - 1 ? '1px solid var(--border)' : 'none',
                  background: index === 0 ? 'linear-gradient(90deg, var(--brand)/10, transparent)' : 'transparent',
                  color: 'var(--text)'
                }}>
                  <div style={{ fontWeight: index === 0 ? '700' : '500', color: index === 0 ? 'var(--brand)' : 'var(--text)' }}>
                    {index === 1 ? '🥇' : index === 2 ? '🥈' : index === 3 ? '🥉' : index + 1}
                  </div>
                  <div style={{ fontWeight: index === 0 ? '600' : '500' }}>{result.vendor}</div>
                  <div>{result.priceScore.toFixed(1)}</div>
                  <div>{result.deliveryScore.toFixed(1)}</div>
                  <div>{result.vendorHistory}</div>
                  <div>{result.compliance}</div>
                  <div style={{ fontWeight: '600', color: index === 0 ? 'var(--brand)' : 'var(--text)' }}>
                    {result.totalScore.toFixed(1)}
                  </div>
                  <div style={{ fontWeight: '500' }}>₹ {result.totalLandedCost.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
          
          {scoreResults.length > 0 && (
            <div style={{ 
              marginTop: '16px', 
              padding: '12px', 
              background: 'var(--panel-2)', 
              border: '1px solid var(--border)', 
              borderRadius: '8px',
              color: 'var(--muted)',
              fontSize: '13px'
            }}>
              <strong style={{ color: 'var(--brand)' }}>Best Vendor: {scoreResults[0].vendor}</strong> • 
              Score: {scoreResults[0].totalScore.toFixed(1)} • 
              Total Cost: ₹ {scoreResults[0].totalLandedCost.toLocaleString()}
              <br />
              <span style={{ fontSize: '12px', marginTop: '4px', display: 'block' }}>
                Scoring weights: 50% Price + 20% Delivery + 20% Vendor History + 10% Compliance
              </span>
            </div>
          )}
        </FormSection>
      )}

      {/* Quote Comparison Table */}
      {rfq && rfq.quotes?.length > 0 && (
        <FormSection 
          title="Quote Comparison"
          subtitle="Side-by-side comparison of quotes from all suppliers"
        >
          <StickyTable columns={columns} rows={rows} />
          
          <div style={{ 
            marginTop: '16px', 
            padding: '12px', 
            background: 'var(--brand)/10', 
            borderRadius: '8px',
            border: '1px solid var(--brand)/20'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
              <div style={{ flexShrink: 0, marginRight: '12px' }}>
                <svg style={{ width: '20px', height: '20px', color: 'var(--brand)' }} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p style={{ fontSize: '14px', color: 'var(--text)', margin: 0 }}>
                  <strong>Tips:</strong> Use arrow keys to scroll the table. The first column is sticky for easy reference. 
                  Click "Export to Excel" to download a detailed comparison report.
                </p>
              </div>
            </div>
          </div>
        </FormSection>
      )}

      {/* Quote Attachments Section */}
      {rfq && rfq.quotes?.length > 0 && (
        <FormSection 
          title="Quote Attachments"
          subtitle="View and download files attached to each quote"
        >
          <QuoteAttachments quotes={rfq.quotes} />
        </FormSection>
      )}

      {/* No Quotes Available */}
      {rfq && (!rfq.quotes || rfq.quotes.length === 0) && (
        <FormSection 
          title="No Quotes Available"
          subtitle="This RFQ doesn't have any quotes yet"
        >
          <div style={{ textAlign: 'center', padding: '32px' }}>
            <svg style={{ 
              width: '48px', 
              height: '48px', 
              color: 'var(--muted)', 
              margin: '0 auto 16px auto',
              display: 'block'
            }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 style={{ 
              margin: '8px 0 4px 0', 
              fontSize: '14px', 
              fontWeight: '500', 
              color: 'var(--text)' 
            }}>No quotes submitted</h3>
            <p style={{ 
              margin: '4px 0 0 0', 
              fontSize: '14px', 
              color: 'var(--muted)' 
            }}>
              Suppliers haven't submitted quotes for this RFQ yet. Please check back later or contact your suppliers directly.
            </p>
          </div>
        </FormSection>
      )}
    </PageLayout>
  );
}
