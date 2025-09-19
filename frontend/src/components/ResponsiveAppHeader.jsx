import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext.jsx';
import MobileNavigation from './MobileNavigation.jsx';

export default function ResponsiveAppHeader({ user, onLogout, currentView, onViewChange, userRoles }) {
  const { theme, toggleTheme } = useTheme();
  const [isMobile, setIsMobile] = useState(false);
  
  // Helpers to format displayed user info safely
  const getUserDisplay = () => {
    if (!user) return 'User';
    const username = user.username || user.user || user.email?.split('@')[0] || 'User';
    const fullName = user.fullName || [user.firstName, user.lastName].filter(Boolean).join(' ');
    return fullName ? `${username} • ${fullName}` : username;
  };

  const getUserContextChip = () => {
    if (!user) return 'Production • Node.js • MongoDB';
    const access = (user.accessLevel || '').toString().trim();
    const accessLabel = access ? access.charAt(0).toUpperCase() + access.slice(1) : '—';
    const department = (user.department || '—').trim() || '—';
    const position = (user.position || '—').trim() || '—';
    return `${accessLabel} • ${department} • ${position}`;
  };

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <header className="app-header responsive-header">
      {/* Mobile Navigation - Only shown on mobile */}
      {isMobile && (
        <MobileNavigation 
          currentView={currentView}
          onViewChange={onViewChange}
          userRoles={userRoles}
        />
      )}
      
      {/* Brand Section */}
      <div className="brand">
        <div className="logo"></div>
        <div className="brand-content">
          <h1>QMS</h1>
          <span className="brand-subtitle">Quotation Management</span>
        </div>
        <span className="chip environment-chip">
          {getUserContextChip()}
        </span>
      </div>
      
      {/* Actions Section */}
      <div className="header-actions">
        <button className="btn ghost theme-toggle" onClick={toggleTheme}>
          {theme === 'dark' ? '☀️' : '🌙'}
          <span className="theme-toggle-text">Toggle Theme</span>
        </button>
        
        {user && (
          <>
            <span className="chip user-chip">
              👤 <span className="user-name">{getUserDisplay()}</span>
            </span>
            <button className="btn secondary logout-btn" onClick={onLogout}>
              <span className="logout-text">Logout</span>
              <span className="logout-icon">⏻</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
}
