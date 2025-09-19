import React, { useState, useEffect } from 'react';
import api from '../../services/api.js';
import '../../styles/prototype-foundation.css';

const CompareViewPrototypeTest = () => {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  
  // Mock data for testing
  const mockRfqs = [
    { _id: '1', title: 'Office Supplies RFQ', status: 'Published' },
    { _id: '2', title: 'IT Hardware RFQ', status: 'Published' }
  ];
  
  const mockQuotes = [
    {
      supplierName: 'VendorAlpha',
      items: [
        {
          productText: 'PAPER-A4 - Copy Paper',
          quantity: 1000,
          unitPrice: 0.9,
          totalPrice: 900,
          deliveryDays: 7,
          freight: 45,
          insurance: 18,
          customsDuty: 27,
          installation: 0,
          taxes: 72
        }
      ]
    },
    {
      supplierName: 'VendorBravo',
      items: [
        {
          productText: 'PAPER-A4 - Copy Paper',
          quantity: 1000,
          unitPrice: 0.85,
          totalPrice: 850,
          deliveryDays: 9,
          freight: 42,
          insurance: 17,
          customsDuty: 25,
          installation: 0,
          taxes: 68
        }
      ]
    }
  ];

  const [selectedRfqId, setSelectedRfqId] = useState('1');
  const [rfqs] = useState(mockRfqs);
  const [quotes] = useState(mockQuotes);
  const [scoreResults, setScoreResults] = useState(null);
  
  const weights = {
    price: 0.5,
    delivery: 0.2,
    vendor: 0.2,
    compliance: 0.1
  };

  useEffect(() => {
    // Mock auth check
    setUser({ username: 'testuser' });
    setAuthChecked(true);
  }, []);

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
    return 75; // Mock vendor history score
  };

  const extractCompliance = (notes) => {
    return 90; // Mock compliance score
  };

  const runScoring = () => {
    const results = [];
    
    quotes.forEach(quote => {
      let totalLandedCost = 0;
      let averageDeliveryDays = 0;
      let validItems = 0;
      
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
    
    if (results.length > 0) {
      const minCost = Math.min(...results.map(r => r.totalLandedCost));
      const minDelivery = Math.min(...results.map(r => r.averageDeliveryDays));
      
      results.forEach(result => {
        result.priceScore = minCost > 0 ? (minCost / result.totalLandedCost) * 100 : 100;
        result.deliveryScore = minDelivery > 0 ? (minDelivery / result.averageDeliveryDays) * 100 : 100;
        
        result.totalScore = 
          (weights.price * result.priceScore) +
          (weights.delivery * result.deliveryScore) +
          (weights.vendor * result.vendorHistory) +
          (weights.compliance * result.compliance);
      });
      
      results.sort((a, b) => b.totalScore - a.totalScore);
    }
    
    setScoreResults(results);
  };

  const selectedRfq = rfqs.find(r => r._id === selectedRfqId);

  return (
    <div className="prototype-app">
      {authChecked && user && (
        <div className="prototype-card">
          <h2>Compare & Score (Test Mode)</h2>
          
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
                disabled={!selectedRfq || quotes.length === 0}
              >
                Run Scoring
              </button>
            </div>
          </div>
          
          {selectedRfq && (
            <div className="prototype-row">
              <div className="prototype-info-panel">
                <h3>RFQ Information</h3>
                <p><strong>Title:</strong> {selectedRfq.title}</p>
                <p><strong>Status:</strong> {selectedRfq.status}</p>
                <p><strong>Quotes Received:</strong> {quotes.length} vendors</p>
              </div>
            </div>
          )}
          
          {selectedRfq && quotes.length > 0 && (
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
          
          <div className="prototype-row">
            <span className="prototype-help">
              Scores = 50% Price + 20% Delivery + 20% Vendor History + 10% Compliance (Test Mode)
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompareViewPrototypeTest;
