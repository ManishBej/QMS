import React from 'react';

const navigationItems = [
  { id: 'dashboard', label: '🏠 Dashboard', group: 'main' },
  { id: 'rfq-create', label: '📝 Create RFQ', group: 'main' },
  { id: 'quote-entry', label: '💬 Enter Quotes', group: 'main' },
  { id: 'quote-management', label: '📋 Manage Quotes', group: 'main' },
  { id: 'compare', label: '📊 Compare & Score', group: 'main' },
  { id: 'approvals', label: '✅ Approvals', group: 'main' },
  { id: 'reports', label: '🗂️ Reports', group: 'main' },
  { id: 'settings', label: '⚙️ Settings', group: 'main' },
  { id: 'users', label: '👥 User Management', group: 'admin', adminOnly: true }
];

export default function AppNavigation({ currentView, onViewChange, userRoles = [] }) {
  const hasAdminRole = userRoles.includes('admin');

  return (
    <nav className="app-nav">
      <div className="nav-group">
        <div className="nav-title">Navigation</div>
        {navigationItems
          .filter(item => item.group === 'main')
          .map(item => (
            <div
              key={item.id}
              className={`nav-item ${currentView === item.id ? 'active' : ''}`}
              onClick={() => onViewChange(item.id)}
            >
              {item.label}
            </div>
          ))
        }
      </div>
      
      {hasAdminRole && (
        <div className="nav-group">
          <div className="nav-title">Administration</div>
          {navigationItems
            .filter(item => item.group === 'admin')
            .map(item => (
              <div
                key={item.id}
                className={`nav-item ${currentView === item.id ? 'active' : ''}`}
                onClick={() => onViewChange(item.id)}
              >
                {item.label}
              </div>
            ))
          }
        </div>
      )}
    </nav>
  );
}
