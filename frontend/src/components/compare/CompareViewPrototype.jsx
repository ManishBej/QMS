import React, { useState, useEffect } from 'react';
import api from '../../services/api.js';
import '../../styles/prototype-foundation.css';

const CompareViewPrototype = () => {
  const [rfqs, setRfqs] = useState([]);
  const [selectedRfqId, setSelectedRfqId] = useState('');
  const [selectedRfq, setSelectedRfq] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [scoreResults, setScoreResults] = useState(null);
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Default scoring weights from prototype
  const [weights] = useState({
    price: 0.5,      // 50%
    delivery: 0.2,   // 20%
    vendor: 0.2,     // 20%
    compliance: 0.1  // 10%
  });

  // Check authentication and load RFQs on component mount
  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    try {
      // Check if user is authenticated
      const userResponse = await api.get('/me');
      setUser(userResponse.data);
      setAuthChecked(true);
      
      // If authenticated, load RFQs
      await loadRfqs();
    } catch (error) {
      console.error('Authentication check failed:', error);
      setAuthChecked(true);
      if (error.response?.status === 401) {
        alert('Please log in first to access the compare & score page.');
      }
    }
  };

  const loadRfqs = async () => {
    try {
      const response = await api.get('/rfqs');
      // Only show RFQs that have quotes submitted
      const rfqsWithQuotes = [];
      
      for (const rfq of response.data) {
        try {
          const quotesResponse = await api.get(`/rfqs/${rfq._id}/quotes`);
          if (quotesResponse.data && quotesResponse.data.length > 0) {
            rfqsWithQuotes.push(rfq);
          }
        } catch (error) {
          // Skip RFQs with no quotes or errors
          console.log(`No quotes found for RFQ ${rfq._id}`);
        }
      }
      
      setRfqs(rfqsWithQuotes);
    } catch (error) {
      console.error('Failed to load RFQs:', error);
      alert('Failed to load RFQs: ' + (error.response?.data?.message || error.message));
    }
  };

  const loadQuotesForRfq = async (rfqId) => {
    try {
      setLoading(true);
      
      // Load RFQ details
      const rfqResponse = await api.get(`/rfqs/${rfqId}`);
      setSelectedRfq(rfqResponse.data);
      
      // Load quotes for this RFQ
      const quotesResponse = await api.get(`/rfqs/${rfqId}/quotes`);
      setQuotes(quotesResponse.data);
      
      // Clear previous scoring results
      setScoreResults(null);
      
    } catch (error) {
      console.error('Failed to load RFQ details and quotes:', error);
      alert('Failed to load RFQ details: ' + (error.response?.data?.message || error.message));
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
      setQuotes([]);
      setScoreResults(null);
    }
  }, [selectedRfqId]);

  const runScoring = () => {
    if (!selectedRfq || quotes.length === 0) {
      alert('Please select an RFQ with quotes to run scoring');
      return;
    }

    const scoredResults = calculateScores();
    setScoreResults(scoredResults);
  };

  const calculateScores = () => {
    const results = [];
    
    // Process each vendor's quote
    quotes.forEach(quote => {
      let totalLandedCost = 0;
      let averageDeliveryDays = 0;
      let validItems = 0;
      
      // Calculate totals for this vendor
      quote.items.forEach(item => {
        const landedCost = calculateLandedCost(item);
        totalLandedCost += landedCost;
        averageDeliveryDays += item.deliveryDays || 0;
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
    return match ? parseInt(match[1]) : 50; // Default 50%
  };

  const extractCompliance = (notes) => {
    const match = notes?.match(/Compliance: (\d+)%/);
    return match ? parseInt(match[1]) : 100; // Default 100%
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
          <p>Please log in first to access the compare & score page.</p>
          <button onClick={() => window.location.href = '/login'}>Go to Login</button>
        </div>
      )}
      
      {authChecked && user && (
        <div className="prototype-card">
          <h2>Compare & Score</h2>
          
          {/* Header Form */}
          <div className="prototype-row">
            <div className="prototype-field">
              <label className="prototype-label">Select RFQ</label>
              <select
                className="prototype-select"
                value={selectedRfqId}
                onChange={(e) => setSelectedRfqId(e.target.value)}
              >
                <option value="">-- Select RFQ --</option>
                {rfqs.map(rfq => (
                  <option key={rfq._id} value={rfq._id}>
                    {rfq._id} — {rfq.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="prototype-field prototype-field-right">
              <label className="prototype-label">&nbsp;</label>
              <button 
                className="prototype-btn primary" 
                onClick={runScoring}
                disabled={!selectedRfq || quotes.length === 0 || loading}
              >
                Run Scoring
              </button>
            </div>
          </div>
          
          {/* Loading State */}
          {loading && (
            <div className="prototype-row">
              <p>Loading RFQ details and quotes...</p>
            </div>
          )}
          
          {/* RFQ Info */}
          {selectedRfq && !loading && (
            <div className="prototype-row">
              <div className="prototype-info-panel">
                <h3>RFQ Information</h3>
                <p><strong>Title:</strong> {selectedRfq.title}</p>
                <p><strong>Status:</strong> {selectedRfq.status}</p>
                <p><strong>Items:</strong> {selectedRfq.items?.length || 0} line items</p>
                <p><strong>Quotes Received:</strong> {quotes.length} vendors</p>
              </div>
            </div>
          )}
          
          {/* Quotes Table */}
          {selectedRfq && quotes.length > 0 && !loading && (
            <div className="prototype-table-wrap">
              <table className="prototype-table">
                <thead>
                  <tr>
                    <th>Vendor</th>
                    <th>Total Cost</th>
                    <th>Avg Delivery</th>
                    <th>Vendor History</th>
                    <th>Compliance</th>
                    <th>Items</th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((quote, index) => (
                    <tr key={index}>
                      <td>{quote.supplierName}</td>
                      <td>₹ {quote.items.reduce((sum, item) => sum + calculateLandedCost(item), 0).toFixed(2)}</td>
                      <td>{(quote.items.reduce((sum, item) => sum + (item.deliveryDays || 0), 0) / quote.items.length).toFixed(0)} days</td>
                      <td>{extractVendorHistory(quote.notes)}%</td>
                      <td>{extractCompliance(quote.notes)}%</td>
                      <td>{quote.items.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Score Results */}
          {scoreResults && (
            <div className="prototype-scoring-results">
              <h3>Scoring Results</h3>
              <div className="prototype-table-wrap">
                <table className="prototype-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Vendor</th>
                      <th>Price Score</th>
                      <th>Delivery Score</th>
                      <th>Vendor Score</th>
                      <th>Compliance Score</th>
                      <th>Total Score</th>
                      <th>Total Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scoreResults.map((result, index) => (
                      <tr key={index} className={index === 0 ? 'prototype-winner-row' : ''}>
                        <td>{index + 1}</td>
                        <td>{result.vendor}</td>
                        <td>{result.priceScore.toFixed(1)}</td>
                        <td>{result.deliveryScore.toFixed(1)}</td>
                        <td>{result.vendorHistory}</td>
                        <td>{result.compliance}</td>
                        <td><strong>{result.totalScore.toFixed(1)}</strong></td>
                        <td>₹ {result.totalLandedCost.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {scoreResults.length > 0 && (
                <div className="prototype-winner-banner">
                  <strong>Best Vendor: {scoreResults[0].vendor}</strong> • 
                  Score: {scoreResults[0].totalScore.toFixed(1)} • 
                  Total Cost: ₹ {scoreResults[0].totalLandedCost.toFixed(2)}
                </div>
              )}
            </div>
          )}
          
          {/* Help Text */}
          <div className="prototype-row">
            <span className="prototype-help">
              Scores = 50% Price + 20% Delivery + 20% Vendor History + 10% Compliance (editable in future).
            </span>
          </div>
          
          {/* No Quotes Message */}
          {selectedRfq && quotes.length === 0 && !loading && (
            <div className="prototype-row">
              <p className="prototype-warning">No quotes found for this RFQ. Please ensure quotes have been submitted.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CompareViewPrototype;
