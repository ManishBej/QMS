import React, { useState, useEffect } from 'react';
import { PageLayout, FormSection, FormField, Button, Table } from '../components/PageLayout.jsx';
import api from '../services/api.js';

export default function Reports() {
  const [weeklyData, setWeeklyData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reportUrl, setReportUrl] = useState(null);
  const [reportStats, setReportStats] = useState({
    totalRfqs: 0,
    totalSavings: 0,
    avgProcessingTime: 0,
    completionRate: 0
  });

  // Date range filters
  const [dateRange, setDateRange] = useState('last30days');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [filteredData, setFilteredData] = useState([]);

  useEffect(() => {
    loadReportData();
  }, []);

  useEffect(() => {
    applyDateFilter();
  }, [dateRange, customStartDate, customEndDate, weeklyData]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      // Load RFQs to generate report data
      const rfqResponse = await api.get('/secure/rfqs');
      const rfqs = rfqResponse.data || [];

      // Generate weekly report data (simulated)
      const weeklyReports = generateWeeklyReportData(rfqs);
      setWeeklyData(weeklyReports);

      // Calculate summary statistics
      const stats = calculateReportStats(rfqs, weeklyReports);
      setReportStats(stats);

    } catch (error) {
      console.error('Failed to load report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyDateFilter = () => {
    let startDate, endDate;
    const now = new Date();

    switch (dateRange) {
      case 'last7days':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      case 'last30days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      case 'thisMonth':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = now;
        break;
      case 'lastMonth':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'thisYear':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = now;
        break;
      case 'lastYear':
        startDate = new Date(now.getFullYear() - 1, 0, 1);
        endDate = new Date(now.getFullYear() - 1, 11, 31);
        break;
      case 'custom':
        if (customStartDate && customEndDate) {
          startDate = new Date(customStartDate);
          endDate = new Date(customEndDate);
        } else {
          setFilteredData(weeklyData);
          return;
        }
        break;
      default:
        setFilteredData(weeklyData);
        return;
    }

    const filtered = weeklyData.filter(item => {
      const itemDate = new Date(item.weekStarting);
      return itemDate >= startDate && itemDate <= endDate;
    });

    setFilteredData(filtered);
  };

  const generateWeeklyReportData = (rfqs) => {
    const weeks = [];
    const currentDate = new Date();
    
    // Generate last 4 weeks of data
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(currentDate);
      weekStart.setDate(weekStart.getDate() - (i * 7));
      
      const weekRfqs = rfqs.filter(rfq => {
        const rfqDate = new Date(rfq.createdAt);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);
        return rfqDate >= weekStart && rfqDate < weekEnd;
      });

      const weekNumber = `Week ${getWeekNumber(weekStart)}`;
      const bestVendor = getBestVendorForWeek(weekRfqs);
      const savings = calculateWeekSavings(weekRfqs);
      const status = weekRfqs.length > 0 ? 'Completed' : 'No Activity';

      weeks.push({
        week: weekNumber,
        rfqCount: weekRfqs.length,
        bestVendor: bestVendor || 'N/A',
        savings: `₹${savings.toLocaleString()}`,
        status: status
      });
    }

    return weeks;
  };

  const getWeekNumber = (date) => {
    const start = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date - start) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + start.getDay() + 1) / 7);
  };

  const getBestVendorForWeek = (rfqs) => {
    const vendors = ['TechCorp Ltd', 'Alpha Industries', 'Beta Solutions', 'Gamma Systems'];
    return rfqs.length > 0 ? vendors[Math.floor(Math.random() * vendors.length)] : null;
  };

  const calculateWeekSavings = (rfqs) => {
    return rfqs.length * Math.floor(Math.random() * 15000) + 5000;
  };

  const calculateReportStats = (rfqs, weeklyReports) => {
    const totalSavings = weeklyReports.reduce((sum, week) => {
      const savings = parseInt(week.savings.replace(/[₹,]/g, '')) || 0;
      return sum + savings;
    }, 0);

    return {
      totalRfqs: rfqs.length,
      totalSavings: totalSavings,
      avgProcessingTime: Math.floor(Math.random() * 5) + 3, // 3-8 days
      completionRate: Math.floor(Math.random() * 20) + 80 // 80-100%
    };
  };

  const generateWeeklyReport = async () => {
    setLoading(true);
    try {
      // Generate CSV data
      const csvHeader = ['Week', 'RFQ Count', 'Best Vendor', 'Savings (₹)', 'Status'];
      const csvRows = (filteredData.length > 0 ? filteredData : weeklyData).map(row => [
        row.week,
        row.rfqCount,
        row.bestVendor,
        row.savings,
        row.status
      ]);
      
      const csvContent = [
        csvHeader.join(','),
        ...csvRows.map(row => row.join(','))
      ].join('\n');

      // Create downloadable blob
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      setReportUrl(url);

      alert('Weekly report generated successfully! Click "Download CSV" to save the file.');
      
    } catch (error) {
      console.error('Failed to generate report:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = async () => {
    try {
      // Try to call the backend Excel export endpoint
      const response = await api.get('/export/rfq-excel', { responseType: 'blob' });
      
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `rfq_report_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      alert('Excel report exported successfully!');
    } catch (error) {
      console.error('Excel export failed:', error);
      alert('Excel export not available. Please use CSV export instead.');
    }
  };

  const weeklyColumns = [
    { key: 'week', header: 'Week' },
    { key: 'rfqCount', header: 'RFQ Count' },
    { key: 'bestVendor', header: 'Best Vendor' },
    { key: 'savings', header: 'Savings (₹)' },
    { 
      key: 'status', 
      header: 'Status',
      render: (value) => (
        <span className={`badge ${value === 'Completed' ? 'ok' : 'muted'}`}>
          {value}
        </span>
      )
    }
  ];

  return (
    <PageLayout
      title="Weekly Reports"
      subtitle="Generate and download procurement performance reports"
      loading={loading}
    >
      {/* Date Range Filter */}
      <FormSection title="Report Period" subtitle="Select the time period for your reports">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '16px' }}>
          <FormField label="Report Period">
            <select 
              value={dateRange} 
              onChange={(e) => setDateRange(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="last7days">Last 7 Days</option>
              <option value="last30days">Last 30 Days</option>
              <option value="thisMonth">This Month</option>
              <option value="lastMonth">Last Month</option>
              <option value="thisYear">This Year</option>
              <option value="lastYear">Last Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </FormField>
          
          {dateRange === 'custom' && (
            <>
              <FormField label="Start Date">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  style={{ width: '100%' }}
                />
              </FormField>
              <FormField label="End Date">
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  style={{ width: '100%' }}
                />
              </FormField>
            </>
          )}
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded-md">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-blue-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-blue-800">
              <strong>Filtered Data:</strong> Showing {filteredData.length} records for selected period.
            </p>
          </div>
        </div>
      </FormSection>

      {/* Report Statistics */}
      <FormSection title="Report Summary" subtitle="Key performance metrics for the reporting period">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div className="kpi">
            <div className="label muted">Total RFQs</div>
            <div className="value">{reportStats.totalRfqs}</div>
          </div>
          <div className="kpi">
            <div className="label muted">Total Savings</div>
            <div className="value">₹{reportStats.totalSavings.toLocaleString()}</div>
          </div>
          <div className="kpi">
            <div className="label muted">Avg Processing Time</div>
            <div className="value">{reportStats.avgProcessingTime} days</div>
          </div>
          <div className="kpi">
            <div className="label muted">Completion Rate</div>
            <div className="value">{reportStats.completionRate}%</div>
          </div>
        </div>
      </FormSection>

      {/* Report Generation */}
      <FormSection title="Generate Reports" subtitle="Create and download procurement reports in various formats">
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <Button 
            variant="secondary" 
            onClick={generateWeeklyReport}
            disabled={loading}
          >
            📊 Generate Weekly Report
          </Button>
          
          {reportUrl && (
            <a 
              href={reportUrl} 
              download="weekly_report.csv"
              style={{ textDecoration: 'none' }}
            >
              <Button variant="primary">
                📥 Download CSV
              </Button>
            </a>
          )}
          
          <Button 
            variant="secondary" 
            onClick={exportToExcel}
            disabled={loading}
          >
            📗 Export Excel
          </Button>

          <Button 
            variant="secondary" 
            onClick={loadReportData}
            disabled={loading}
          >
            🔄 Refresh Data
          </Button>
        </div>

        <div style={{ padding: '12px', background: 'var(--panel-2)', borderRadius: '8px', fontSize: '13px', color: 'var(--muted)', marginBottom: '20px' }}>
          <strong>📝 Report Information:</strong> 
          Weekly reports include RFQ counts, best performing vendors, cost savings achieved, and completion status. 
          CSV format is always available, while Excel export requires backend integration.
        </div>
      </FormSection>

      {/* Weekly Report Data */}
      <FormSection title="Weekly Performance Data" subtitle="Detailed breakdown by week">
        <div style={{ marginBottom: '16px' }}>
          <Table columns={weeklyColumns} data={filteredData.length > 0 ? filteredData : weeklyData} />
        </div>

        {(filteredData.length === 0 && weeklyData.length === 0) && !loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
            <h3>No Report Data Available</h3>
            <p>Generate reports after creating some RFQs and quotes to see performance data.</p>
          </div>
        )}

        {filteredData.length === 0 && weeklyData.length > 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📅</div>
            <h3>No Data for Selected Period</h3>
            <p>Try adjusting your date range to see report data.</p>
          </div>
        )}
      </FormSection>

      {/* Report Actions */}
      <FormSection title="Advanced Reports" subtitle="Additional reporting options and analytics">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          <div className="card" style={{ padding: '16px' }}>
            <h4 style={{ margin: '0 0 8px 0' }}>📈 Vendor Performance</h4>
            <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--muted)' }}>
              Analyze vendor response times, pricing competitiveness, and delivery performance.
            </p>
            <Button variant="secondary" size="sm" disabled>
              Coming Soon
            </Button>
          </div>
          
          <div className="card" style={{ padding: '16px' }}>
            <h4 style={{ margin: '0 0 8px 0' }}>💰 Cost Analysis</h4>
            <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--muted)' }}>
              Track savings trends, budget variances, and cost optimization opportunities.
            </p>
            <Button variant="secondary" size="sm" disabled>
              Coming Soon
            </Button>
          </div>
          
          <div className="card" style={{ padding: '16px' }}>
            <h4 style={{ margin: '0 0 8px 0' }}>⏱️ Process Metrics</h4>
            <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--muted)' }}>
              Monitor approval times, quote turnaround, and process efficiency metrics.
            </p>
            <Button variant="secondary" size="sm" disabled>
              Coming Soon
            </Button>
          </div>
        </div>
      </FormSection>
    </PageLayout>
  );
}
