import React from 'react';

// Updated PageLayout to work with the new design system
export function PageLayout({ title, subtitle, actions, loading, children }) {
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h2>{title}</h2>
          {subtitle && <p className="muted" style={{ margin: '5px 0 0 0', fontSize: '14px' }}>{subtitle}</p>}
        </div>
        {actions && (
          <div style={{ display: 'flex', gap: '8px' }}>
            {actions}
          </div>
        )}
      </div>
      
      {loading ? (
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
          <p className="muted">Loading...</p>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

export function FormSection({ title, subtitle, children }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      {title && (
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>{title}</h3>
          {subtitle && <p className="muted" style={{ margin: 0, fontSize: '13px' }}>{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
}

export function FormField({ label, required, error, helpText, className, children }) {
  return (
    <div className={`field ${className || ''}`}>
      {label && (
        <label>
          {label}
          {required && <span style={{ color: 'var(--danger)' }}> *</span>}
        </label>
      )}
      {children}
      {error && <span style={{ color: 'var(--danger)', fontSize: '12px' }}>{error}</span>}
      {helpText && !error && <span className="muted" style={{ fontSize: '12px' }}>{helpText}</span>}
    </div>
  );
}

export function Input({ error, className, ...props }) {
  return (
    <input
  className={`qms-input ${className || ''}`}
      style={{
        // Use theme variables by default so inputs honor light/dark modes
        background: 'var(--panel)',
        color: 'var(--text)',
        border: `1px solid ${error ? 'var(--danger)' : 'var(--border)'}`,
        borderRadius: '12px',
        padding: '10px 12px',
        transition: 'all 0.2s ease',
        ...(props.style || {})
      }}
      {...props}
    />
  );
}

export function Button({ 
  variant = 'secondary', 
  size = 'md', 
  loading = false, 
  disabled = false, 
  children, 
  className = '',
  ...props 
}) {
  const sizeStyles = {
    sm: { padding: '6px 10px', fontSize: '12px' },
    md: { padding: '10px 14px', fontSize: '14px' },
    lg: { padding: '12px 18px', fontSize: '16px' }
  };

  return (
    <button
      className={`btn ${variant} ${className}`}
      style={{
        ...sizeStyles[size],
        opacity: (disabled || loading) ? 0.6 : 1,
        cursor: (disabled || loading) ? 'not-allowed' : 'pointer'
      }}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <div style={{ 
          width: '12px', 
          height: '12px', 
          border: '2px solid transparent', 
          borderTop: '2px solid currentColor', 
          borderRadius: '50%', 
          animation: 'spin 1s linear infinite',
          marginRight: '4px'
        }}></div>
      )}
      {children}
    </button>
  );
}

export function Table({ columns, data }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((col, index) => (
              <th key={index}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{ textAlign: 'center', padding: '20px' }}>
                <span className="muted">No data available</span>
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {columns.map((col, colIndex) => (
                  <td key={colIndex}>
                    {col.render ? col.render(row[col.key], row, rowIndex) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default PageLayout;
