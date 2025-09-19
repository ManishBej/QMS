import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext.jsx';
import api, { setAuthToken } from '../services/api.js';

export default function Login({ onLogin }) {
  const { theme, toggleTheme } = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function testConnection() {
    console.log('🧪 Testing backend connection...');
    try {
      const response = await api.get('/health');
      console.log('✅ Backend connection test successful:', response.data);
      alert('Backend connection successful: ' + JSON.stringify(response.data));
    } catch (err) {
      console.error('❌ Backend connection test failed:', err);
      alert('Backend connection failed: ' + err.message);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    console.log('🔄 Attempting login for username:', username);
    
    try {
      // Clear any previous authentication state
      delete api.defaults.headers.common['X-CSRF-Token'];
      
      const res = await api.post('/login', { username, password });
      const { success, user, message } = res.data;
      
      console.log('📡 Login response received:', { success, user: !!user, message });
      
      if (success && user) {
        console.log('✅ Login successful - HttpOnly cookie set by server');
        setAuthToken('authenticated'); // Simple flag, real auth is in HttpOnly cookie
        onLogin(user);
      } else {
        console.error('❌ Login failed: invalid response format');
        setError('Login failed - please check your username and password');
      }
    } catch (err) {
      console.error('❌ Login error:', err.response?.data || err.message);
      
      // More descriptive error messages based on error type
      if (err.message === 'Network Error') {
        setError('Cannot connect to server. Please check your internet connection or server status.');
      } else if (err.response?.status === 400) {
        if (err.response?.data?.error === 'validation_failed') {
          // Show the first validation error message
          const details = err.response.data.details;
          if (details && Array.isArray(details) && details.length > 0) {
            setError(details[0].message || 'Invalid input');
          } else {
            setError('Invalid input. Please check your username and password.');
          }
        } else {
          setError('Please check your input and try again');
        }
      } else if (err.response?.status === 429) {
        setError('Too many login attempts. Please wait and try again later.');
      } else if (err.response?.status === 401) {
        setError('Invalid username or password');
      } else if (err.response?.status === 403 && err.response?.data?.error?.includes('csrf')) {
        setError('Session error. Please reload the page and try again.');
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-container">
      {/* Theme Toggle Button */}
      <button 
        onClick={toggleTheme}
        className="theme-toggle-login"
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>

      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <span className="logo-text">QMS</span>
          </div>
          <h1>Welcome Back</h1>
          <p className="muted">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="field">
            <label>Username</label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="admin"
            />
          </div>
          
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="SecureProductionPassword123!"
            />
          </div>
          
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="btn primary login-btn"
          >
            {loading ? (
              <>
                <div className="spinner"></div>
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        
      </div>
    </div>
  );
}
