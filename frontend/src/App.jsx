import React, { useState, useEffect } from 'react';
import Login from './pages/Login.jsx';
import RFQCreate from './pages/RFQCreate.jsx';
import QuoteEntry from './pages/QuoteEntry.jsx';
import QuoteManagement from './pages/QuoteManagement.jsx';
import CompareView from './pages/CompareView.jsx';
import NewDashboard from './pages/NewDashboard.jsx';
import Approvals from './pages/Approvals.jsx';
import Settings from './pages/Settings.jsx';
import Reports from './pages/Reports.jsx';
import UserManagement from './pages/UserManagement.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import ResponsiveAppHeader from './components/ResponsiveAppHeader.jsx';
import AppNavigation from './components/AppNavigation.jsx';
import { NotificationProvider } from './components/NotificationSystem.jsx';
import { ThemeProvider } from './contexts/ThemeContext.jsx';
import api, { setAuthToken, isAuthenticated, clearAuth } from './services/api.js';
import { cleanupLocalStorage, protectConsole } from './utils/extensionProtection.js';

// Initialize browser extension protection
cleanupLocalStorage();
protectConsole();

export default function App() {
  // Initialize with actual stored token
  const storedToken = localStorage.getItem('token');
  const [token, setToken] = useState(storedToken);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('dashboard');
  const [editQuoteId, setEditQuoteId] = useState(null); // Track which quote is being edited

  // Initialize authentication on app load
  useEffect(() => {
    if (storedToken) {
      setAuthToken(storedToken); // Restore token to axios headers
    }
  }, []);

  useEffect(() => {
    console.log('🔄 useEffect triggered with token:', token);
    if (token) {
      console.log('🔐 Token exists, starting authentication verification...');
      setLoading(true);
      setAuthToken(token);
      
      // Add small delay to ensure authentication is properly set
      setTimeout(() => {
        console.log('📡 Making request to /me...');
        api.get('/me').then(r => {
          console.log('✅ Authentication verification successful:', r.data);
          setProfile(r.data);
        }).catch(err => {
          console.error('❌ Authentication verification failed:', {
            status: err.response?.status,
            statusText: err.response?.statusText,
            data: err.response?.data,
            message: err.message
          });
          
          // Only clear auth if it's actually an auth error, not a network error
          if (err.response?.status === 401 || err.response?.status === 403) {
            console.log('🚫 Clearing authentication due to 401/403 error');
            setAuthToken(null);
            setToken(null);
            setProfile(null);
          } else {
            // For network errors, keep the token but show an error
            console.warn('⚠️ Network error during auth check, keeping session');
            setProfile({ user: 'admin', roles: ['admin', 'procurement'] }); // Fallback profile
          }
        }).finally(() => {
          console.log('🏁 Authentication verification completed');
          setLoading(false);
        });
      }, 100); // Small delay to ensure state is set
    } else {
      console.log('❌ No token found, staying on login page');
    }
  }, [token]);

  // Listen for navigation events from dashboard
  useEffect(() => {
    const handleNavigate = (event) => {
      setView(event.detail);
      // Clear edit quote ID when navigating to a new page (unless it's quote-entry)
      if (event.detail !== 'quote-entry') {
        setEditQuoteId(null);
      }
    };

    const handleNavigateWithQuote = (event) => {
      if (event.detail) {
        if (event.detail.startsWith('quote-edit:')) {
          const quoteId = event.detail.split(':')[1];
          setEditQuoteId(quoteId);
          setView('quote-entry');
        } else if (event.detail.startsWith('quote-view:')) {
          const quoteId = event.detail.split(':')[1];
          setEditQuoteId(`view:${quoteId}`); // Prefix with 'view:' to indicate view mode
          setView('quote-entry');
        }
      }
    };
    
    window.addEventListener('navigate', handleNavigate);
    window.addEventListener('navigateWithQuote', handleNavigateWithQuote);
    
    return () => {
      window.removeEventListener('navigate', handleNavigate);
      window.removeEventListener('navigateWithQuote', handleNavigateWithQuote);
    };
  }, []);

  const handleLogout = async () => {
    try {
      // Call logout endpoint to clear HttpOnly cookie
      await api.post('/logout');
    } catch (err) {
      console.warn('Logout request failed:', err.message);
    }
    // Clear local state regardless
    clearAuth(); 
    setToken(null); 
    setProfile(null); 
  };

  if (!token) return (
    <ThemeProvider>
      <NotificationProvider>
        <ErrorBoundary>
          <Login onLogin={(userData) => {
            const token = localStorage.getItem('token');
            setToken(token);
            setProfile(userData);
          }} />
        </ErrorBoundary>
      </NotificationProvider>
    </ThemeProvider>
  );

  if (loading) return (
    <ThemeProvider>
      <NotificationProvider>
        <ErrorBoundary>
          <div className="app">
            <ResponsiveAppHeader 
              user={profile} 
              onLogout={handleLogout}
              currentView={view}
              onViewChange={setView}
              userRoles={profile?.roles || []}
            />
            <div className="app-main">
              <div className="card">
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
                  <p className="muted">Authenticating...</p>
                </div>
              </div>
            </div>
          </div>
        </ErrorBoundary>
      </NotificationProvider>
    </ThemeProvider>
  );

  const renderCurrentView = () => {
    switch (view) {
      case 'dashboard':
        return <NewDashboard />;
      case 'rfq-create':
        return (
          <div className="app-main">
            <ErrorBoundary>
              <RFQCreate />
            </ErrorBoundary>
          </div>
        );
      case 'quote-entry':
        return (
          <div className="app-main">
            <ErrorBoundary>
              <QuoteEntry editQuoteId={editQuoteId} />
            </ErrorBoundary>
          </div>
        );
      case 'quote-management':
        return (
          <div className="app-main">
            <ErrorBoundary>
              <QuoteManagement />
            </ErrorBoundary>
          </div>
        );
      case 'compare':
        return (
          <div className="app-main">
            <ErrorBoundary>
              <CompareView />
            </ErrorBoundary>
          </div>
        );
      case 'approvals':
        return (
          <div className="app-main">
            <ErrorBoundary>
              <Approvals />
            </ErrorBoundary>
          </div>
        );
      case 'reports':
        return (
          <div className="app-main">
            <ErrorBoundary>
              <Reports />
            </ErrorBoundary>
          </div>
        );
      case 'settings':
        return (
          <div className="app-main">
            <ErrorBoundary>
              <Settings />
            </ErrorBoundary>
          </div>
        );
      case 'users':
        return (
          <div className="app-main">
            <ErrorBoundary>
              <UserManagement />
            </ErrorBoundary>
          </div>
        );
      default:
        return <NewDashboard />;
    }
  };

  return (
    <ThemeProvider>
      <NotificationProvider>
        <ErrorBoundary>
          <div className="app">
            <ResponsiveAppHeader 
              user={profile} 
              onLogout={handleLogout}
              currentView={view}
              onViewChange={setView}
              userRoles={profile?.roles || []}
            />
            <AppNavigation 
              currentView={view} 
              onViewChange={setView} 
              userRoles={profile?.roles || []} 
            />
            {renderCurrentView()}
          </div>
        </ErrorBoundary>
      </NotificationProvider>
    </ThemeProvider>
  );
}
