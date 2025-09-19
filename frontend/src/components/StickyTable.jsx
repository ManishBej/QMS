import React from 'react';

export default function StickyTable({ columns = [], rows = [] }) {
  // columns: [{ key, header }...]
  // rows: [{ key: valueMap }...] where valueMap maps column.key to cell value
  return (
    <div style={{ 
      overflow: 'auto', 
      border: '1px solid var(--border)', 
      borderRadius: '8px',
      background: 'var(--panel)'
    }}>
      <table style={{ 
        width: '100%', 
        borderCollapse: 'collapse',
        background: 'var(--panel)'
      }}>
        <thead>
          <tr style={{ background: 'var(--panel-2)' }}>
            {columns.map((c, i) => (
              <th
                key={c.key}
                style={{
                  textAlign: 'left',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: 'var(--muted)',
                  padding: '12px',
                  borderBottom: '1px solid var(--border)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  ...(i === 0 ? {
                    position: 'sticky',
                    left: 0,
                    background: 'var(--panel-2)',
                    zIndex: 10,
                    borderRight: '1px solid var(--border)'
                  } : {})
                }}
                scope="col"
              >{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} style={{ 
              background: ri % 2 ? 'var(--panel)' : 'var(--panel-2)/50'
            }}>
              {columns.map((c, ci) => (
                <td
                  key={c.key}
                  style={{
                    fontSize: '14px',
                    padding: '12px',
                    borderBottom: '1px solid var(--border)',
                    color: 'var(--text)',
                    ...(ci === 0 ? {
                      position: 'sticky',
                      left: 0,
                      background: 'inherit',
                      zIndex: 1,
                      borderRight: '1px solid var(--border)',
                      fontWeight: '500'
                    } : {})
                  }}
                >
                  {typeof c.render === 'function' ? c.render(r[c.key]) : r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
