import React from 'react';

// Enhanced responsive table component
export function ResponsiveTable({ columns, data, loading, emptyMessage = "No data available" }) {
  if (loading) {
    return (
      <div className="responsive-table-loading">
        <div className="table-skeleton">
          <div className="skeleton-header"></div>
          <div className="skeleton-row"></div>
          <div className="skeleton-row"></div>
          <div className="skeleton-row"></div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="responsive-table-empty">
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <p>{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="responsive-table-container">
      {/* Desktop Table View */}
      <div className="desktop-table-view">
        <div className="prototype-table-wrap">
          <table className="prototype-table">
            <thead>
              <tr>
                {columns.map(col => (
                  <th key={col.key}>{col.header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr key={index}>
                  {columns.map(col => (
                    <td key={col.key}>
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="mobile-card-view">
        {data.map((row, index) => (
          <div key={index} className="mobile-data-card">
            {columns.map(col => (
              <div key={col.key} className="mobile-data-row">
                <div className="mobile-data-label">{col.header}</div>
                <div className="mobile-data-value">
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Mobile-friendly form layout
export function ResponsiveForm({ children, onSubmit, title, subtitle }) {
  return (
    <form onSubmit={onSubmit} className="responsive-form">
      {title && (
        <div className="form-header">
          <h2>{title}</h2>
          {subtitle && <p className="form-subtitle">{subtitle}</p>}
        </div>
      )}
      <div className="form-content">
        {children}
      </div>
    </form>
  );
}

// Mobile-optimized grid component
export function ResponsiveGrid({ children, columns = 'auto', gap = 'md' }) {
  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4', 
    lg: 'gap-6'
  };

  const columnClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    'auto': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
  };

  return (
    <div className={`responsive-grid grid ${columnClasses[columns]} ${gapClasses[gap]}`}>
      {children}
    </div>
  );
}

// Mobile-friendly modal
export function ResponsiveModal({ isOpen, onClose, title, children, size = 'md' }) {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-full'
  };

  return (
    <div className="responsive-modal-overlay" onClick={onClose}>
      <div 
        className={`responsive-modal-content ${sizeClasses[size]}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>{title}</h3>
          <button 
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}

// Mobile-optimized button group
export function ResponsiveButtonGroup({ children, orientation = 'horizontal', size = 'md' }) {
  const orientationClasses = {
    horizontal: 'flex-row flex-wrap',
    vertical: 'flex-col'
  };

  const sizeClasses = {
    sm: 'gap-1',
    md: 'gap-2',
    lg: 'gap-3'
  };

  return (
    <div className={`responsive-btn-group flex ${orientationClasses[orientation]} ${sizeClasses[size]}`}>
      {children}
    </div>
  );
}

// Touch-friendly tabs component
export function ResponsiveTabs({ tabs, activeTab, onTabChange }) {
  return (
    <div className="responsive-tabs">
      <div className="tabs-header">
        <div className="tabs-nav">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.icon && <span className="tab-icon">{tab.icon}</span>}
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="tabs-content">
        {tabs.find(tab => tab.id === activeTab)?.content}
      </div>
    </div>
  );
}
