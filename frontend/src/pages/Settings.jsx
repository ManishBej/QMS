import React, { useState, useEffect } from 'react';
import { PageLayout, FormSection, FormField, Button } from '../components/PageLayout.jsx';

export default function Settings() {
  const [weights, setWeights] = useState({
    price: 0.5,
    delivery: 0.2,
    vendor: 0.2,
    compliance: 0.1
  });
  const [originalWeights, setOriginalWeights] = useState({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadWeights();
  }, []);

  useEffect(() => {
    const changed = JSON.stringify(weights) !== JSON.stringify(originalWeights);
    setHasChanges(changed);
  }, [weights, originalWeights]);

  const loadWeights = () => {
    const storedWeights = JSON.parse(
      localStorage.getItem('weights') || 
      '{"price":0.5,"delivery":0.2,"vendor":0.2,"compliance":0.1}'
    );
    setWeights(storedWeights);
    setOriginalWeights(storedWeights);
  };

  const handleWeightChange = (field, value) => {
    const numValue = parseFloat(value) || 0;
    setWeights(prev => ({
      ...prev,
      [field]: Math.max(0, Math.min(1, numValue)) // Clamp between 0 and 1
    }));
  };

  const saveWeights = () => {
    const sum = weights.price + weights.delivery + weights.vendor + weights.compliance;
    
    if (Math.abs(sum - 1) > 0.001) {
      alert(`Weights must sum to 1.0. Current sum: ${sum.toFixed(3)}`);
      return;
    }

    localStorage.setItem('weights', JSON.stringify(weights));
    setOriginalWeights({...weights});
    alert('Scoring weights saved successfully!');
  };

  const resetWeights = () => {
    const defaultWeights = {
      price: 0.5,
      delivery: 0.2,
      vendor: 0.2,
      compliance: 0.1
    };
    setWeights(defaultWeights);
  };

  const restoreWeights = () => {
    setWeights({...originalWeights});
  };

  const totalWeight = weights.price + weights.delivery + weights.vendor + weights.compliance;
  const isValidTotal = Math.abs(totalWeight - 1) <= 0.001;

  return (
    <PageLayout
      title="Settings"
      subtitle="Configure scoring weights and system preferences"
    >
      <FormSection
        title="Quote Scoring Weights"
        subtitle="Adjust the importance of each factor in quote evaluation"
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          <FormField label="Price Weight" helpText="Weight for price comparison">
            <input
              type="number"
              step="0.1"
              min="0"
              max="1"
              value={weights.price}
              onChange={(e) => handleWeightChange('price', e.target.value)}
            />
          </FormField>
          
          <FormField label="Delivery Weight" helpText="Weight for delivery time">
            <input
              type="number"
              step="0.1"
              min="0"
              max="1"
              value={weights.delivery}
              onChange={(e) => handleWeightChange('delivery', e.target.value)}
            />
          </FormField>
          
          <FormField label="Vendor Weight" helpText="Weight for vendor history">
            <input
              type="number"
              step="0.1"
              min="0"
              max="1"
              value={weights.vendor}
              onChange={(e) => handleWeightChange('vendor', e.target.value)}
            />
          </FormField>
          
          <FormField label="Compliance Weight" helpText="Weight for compliance rating">
            <input
              type="number"
              step="0.1"
              min="0"
              max="1"
              value={weights.compliance}
              onChange={(e) => handleWeightChange('compliance', e.target.value)}
            />
          </FormField>
        </div>

        {/* Weight Summary */}
        <div className="card" style={{ 
          padding: '16px', 
          marginBottom: '20px', 
          background: isValidTotal ? 'var(--panel-2)' : 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${isValidTotal ? 'var(--border)' : 'rgba(239, 68, 68, 0.2)'}`
        }}>
          <h4 style={{ margin: '0 0 12px 0' }}>Weight Summary</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', fontSize: '14px' }}>
            <div><strong>Price:</strong> {(weights.price * 100).toFixed(1)}%</div>
            <div><strong>Delivery:</strong> {(weights.delivery * 100).toFixed(1)}%</div>
            <div><strong>Vendor:</strong> {(weights.vendor * 100).toFixed(1)}%</div>
            <div><strong>Compliance:</strong> {(weights.compliance * 100).toFixed(1)}%</div>
          </div>
          <div style={{ marginTop: '12px', fontWeight: 'bold' }}>
            <span style={{ color: isValidTotal ? 'var(--ok)' : 'var(--danger)' }}>
              Total: {(totalWeight * 100).toFixed(1)}%
            </span>
            {!isValidTotal && (
              <span style={{ color: 'var(--danger)', marginLeft: '8px', fontSize: '12px' }}>
                ⚠️ Must equal 100%
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <Button 
            variant="primary" 
            onClick={saveWeights}
            disabled={!isValidTotal || !hasChanges}
          >
            💾 Save Weights
          </Button>
          
          <Button 
            variant="secondary" 
            onClick={resetWeights}
          >
            🔄 Reset to Default
          </Button>
          
          {hasChanges && (
            <Button 
              variant="secondary" 
              onClick={restoreWeights}
            >
              ↩️ Restore Original
            </Button>
          )}
        </div>

        <div style={{ padding: '12px', background: 'var(--panel-2)', borderRadius: '8px', fontSize: '13px', color: 'var(--muted)' }}>
          <div style={{ marginBottom: '8px' }}><strong>💡 About Scoring Weights:</strong></div>
          <ul style={{ margin: 0, paddingLeft: '18px' }}>
            <li><strong>Price Weight:</strong> How much price influences the final score (lower prices score higher)</li>
            <li><strong>Delivery Weight:</strong> How much delivery time affects scoring (faster delivery scores higher)</li>
            <li><strong>Vendor Weight:</strong> How much vendor history/reliability matters in scoring</li>
            <li><strong>Compliance Weight:</strong> How much regulatory compliance affects the evaluation</li>
          </ul>
          <div style={{ marginTop: '8px' }}>
            These weights mirror the agreed defaults and can be tweaked per RFQ in the future. 
            All weights must sum to exactly 1.0 (100%).
          </div>
        </div>
      </FormSection>

      <FormSection
        title="System Preferences"
        subtitle="General system configuration options"
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
          <FormField label="Auto-refresh Interval" helpText="Dashboard refresh rate in seconds">
            <select defaultValue="30">
              <option value="10">10 seconds</option>
              <option value="30">30 seconds</option>
              <option value="60">1 minute</option>
              <option value="300">5 minutes</option>
              <option value="0">Disabled</option>
            </select>
          </FormField>
          
          <FormField label="Default Page Size" helpText="Number of items per page in tables">
            <select defaultValue="10">
              <option value="5">5 items</option>
              <option value="10">10 items</option>
              <option value="25">25 items</option>
              <option value="50">50 items</option>
            </select>
          </FormField>
        </div>
        
        <div style={{ marginTop: '20px', padding: '12px', background: 'var(--panel-2)', borderRadius: '8px' }}>
          <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
            <strong>🔧 Additional Settings:</strong> More configuration options will be available in future updates, 
            including email notifications, approval timeouts, and integration settings.
          </div>
        </div>
      </FormSection>
    </PageLayout>
  );
}
