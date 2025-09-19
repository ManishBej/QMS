import React from 'react';
import { useTheme } from '../contexts/ThemeContext.jsx';

export default function AppHeader({ user, onLogout }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="app-header">
      <div className="brand">
        <div className="logo"></div>
        <h1>QMS — Quotation Management</h1>
        <span className="chip">
          Production • Node.js • MongoDB
        </span>
      </div>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <button className="btn ghost" onClick={toggleTheme}>
          {theme === 'dark' ? '☀️' : '🌙'} Toggle Theme
        </button>
        {user && (
          <>
            <span className="chip">👤 {user.user || 'User'}</span>
            <button className="btn secondary" onClick={onLogout}>
              Logout
            </button>
          </>
        )}
      </div>
    </header>
  );
}
