import React, { useState } from 'react';

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

export default function MobileNavigation({ currentView, onViewChange, userRoles = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const hasAdminRole = userRoles.includes('admin');

  const closeMenu = () => setIsOpen(false);

  const handleNavigation = (viewId) => {
    onViewChange(viewId);
    closeMenu();
  };

  const currentItem = navigationItems.find(item => item.id === currentView);

  return (
    <>
      {/* Mobile Navigation Toggle */}
      <div className="mobile-nav-header">
        <button 
          className="mobile-nav-toggle"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle navigation menu"
        >
          <span className={`hamburger ${isOpen ? 'open' : ''}`}>
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>
        
        <div className="mobile-nav-current">
          {currentItem?.label || 'Navigation'}
        </div>
      </div>

      {/* Mobile Navigation Overlay */}
      {isOpen && (
        <div className="mobile-nav-overlay" onClick={closeMenu}>
          <div className="mobile-nav-content" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-nav-header-inside">
              <h3>QMS Navigation</h3>
              <button 
                className="mobile-nav-close"
                onClick={closeMenu}
                aria-label="Close navigation menu"
              >
                ✕
              </button>
            </div>
            
            <div className="mobile-nav-sections">
              <div className="mobile-nav-section">
                <div className="mobile-nav-title">Main Features</div>
                {navigationItems
                  .filter(item => item.group === 'main')
                  .map(item => (
                    <button
                      key={item.id}
                      className={`mobile-nav-item ${currentView === item.id ? 'active' : ''}`}
                      onClick={() => handleNavigation(item.id)}
                    >
                      {item.label}
                    </button>
                  ))
                }
              </div>
              
              {hasAdminRole && (
                <div className="mobile-nav-section">
                  <div className="mobile-nav-title">Administration</div>
                  {navigationItems
                    .filter(item => item.group === 'admin')
                    .map(item => (
                      <button
                        key={item.id}
                        className={`mobile-nav-item ${currentView === item.id ? 'active' : ''}`}
                        onClick={() => handleNavigation(item.id)}
                      >
                        {item.label}
                      </button>
                    ))
                  }
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
