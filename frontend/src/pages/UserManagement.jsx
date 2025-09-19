import React, { useState, useEffect, useRef } from 'react';
import PageLayout from '../components/PageLayout';
import { ResponsiveTable, ResponsiveModal, ResponsiveForm, ResponsiveButtonGroup } from '../components/ResponsiveComponents.jsx';
import api, { getCSRFToken } from '../services/api.js';
import '../styles/UserManagement.css';

const UserModal = ({ show, onClose, user, onChange, onSubmit, title, isCreate = false, departments, accessLevels }) => {
  if (!show) return null;

  // Prevent form submission on Enter key press, which can be annoying in modals.
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.target.type !== 'textarea') {
      e.preventDefault();
      // Optionally, you could trigger form submission here if desired,
      // but for now, we just prevent the default browser behavior.
    }
  };

  return (
    <div className="modal-overlay" onMouseDown={(e) => {
      // Only close if the initial mousedown is on the overlay itself
      if (e.target === e.currentTarget) {
        onClose();
      }
    }}>
      <div className="modal-content" onMouseDown={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={onSubmit} className="modal-body" onKeyDown={handleKeyDown}>
          <div className="form-grid">
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                value={user?.username || ''}
                onChange={(e) => onChange({ username: e.target.value })}
                required
                autoFocus // Autofocus on the first field when the modal opens
              />
            </div>
            
            {isCreate && (
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={user?.password || ''}
                  onChange={(e) => onChange({ password: e.target.value })}
                  required
                />
              </div>
            )}
            
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={user?.email || ''}
                onChange={(e) => onChange({ email: e.target.value })}
                required
              />
            </div>
            
            <div className="form-group">
              <label>First Name</label>
              <input
                type="text"
                value={user?.firstName || ''}
                onChange={(e) => onChange({ firstName: e.target.value })}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Last Name</label>
              <input
                type="text"
                value={user?.lastName || ''}
                onChange={(e) => onChange({ lastName: e.target.value })}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Position</label>
              <input
                type="text"
                value={user?.position || ''}
                onChange={(e) => onChange({ position: e.target.value })}
              />
            </div>
            
            <div className="form-group">
              <label>Department</label>
              <select
                value={user?.department || ''}
                onChange={(e) => onChange({ department: e.target.value })}
              >
                <option value="">Select Department</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label>Access Level</label>
              <select
                value={user?.accessLevel || 'basic'}
                onChange={(e) => onChange({ accessLevel: e.target.value })}
                required
              >
                {accessLevels.map(level => (
                  <option key={level.value} value={level.value}>{level.label}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {isCreate ? 'Create User' : 'Update User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterAccessLevel, setFilterAccessLevel] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    email: '',
    firstName: '',
    lastName: '',
    position: '',
    department: '',
    accessLevel: 'basic',
    roles: ['user']
  });

  // Safer field patchers to avoid stale object copies
  const patchNewUser = (patch) => setNewUser(prev => ({ ...prev, ...patch }));
  const patchSelectedUser = (patch) => setSelectedUser(prev => ({ ...prev, ...patch }));

  // Helper function to safely handle user data
  const safeUserData = (user) => {
    if (!user) return null;
    return {
      ...user,
      _id: user._id || user.id,
      id: user._id || user.id
    };
  };

  const accessLevels = [
    { value: 'basic', label: 'Basic', color: '#6c757d' },
    { value: 'intermediate', label: 'Intermediate', color: '#0d6efd' },
    { value: 'advanced', label: 'Advanced', color: '#fd7e14' },
    { value: 'admin', label: 'Admin', color: '#dc3545' }
  ];

  const departments = [
    'Engineering', 'Operations', 'Finance', 'HR', 'Sales', 'Marketing', 
    'IT', 'Procurement', 'Quality', 'Legal'
  ];

  // Fetch users with pagination and filters
  const fetchUsers = async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        page: page.toString(),
        limit: '10'
      };
      
      if (searchTerm) params.search = searchTerm;
      if (filterDepartment) params.department = filterDepartment;
      if (filterAccessLevel) params.accessLevel = filterAccessLevel;
      if (filterStatus) params.active = filterStatus;

      const response = await api.get('/users', { params });
      setUsers(response.data.users);
      setPagination(response.data.pagination);
    } catch (err) {
      setError('Error loading users: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch user statistics
  const fetchStatistics = async () => {
    try {
      const response = await api.get('/users/statistics');
      setStatistics(response.data);
    } catch (err) {
      console.error('Error loading statistics:', err);
    }
  };

  // Create new user
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError(''); // Clear previous errors
    if (submitting) return; // prevent double submit
    setSubmitting(true);
    
    try {
      // Validate required fields
      const requiredFields = ['username', 'password', 'email', 'firstName', 'lastName'];
      const missingFields = requiredFields.filter(field => !newUser[field]?.trim());
      
      if (missingFields.length > 0) {
        setError(`Missing required fields: ${missingFields.join(', ')}`);
        return;
      }

      // Client-side validation aligned with backend rules
      const usernameOk = /^[a-zA-Z0-9_.-]{3,30}$/.test(newUser.username);
      if (!usernameOk) {
        setError('Username must be 3-30 chars and only letters, numbers, dots, hyphens, underscores.');
        return;
      }

      // Strong password (matches login rules)
      const passwordOk = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,128}$/.test(newUser.password);
      if (!passwordOk) {
        setError('Password must be 8-128 chars and include upper, lower, number, and special character.');
        return;
      }

      // Basic email guard
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUser.email);
      if (!emailOk) {
        setError('Please provide a valid email address.');
        return;
      }

      // Check if username already exists
      try {
        const checkResponse = await api.get(`/users/check-username?username=${newUser.username}`);
        if (!checkResponse.data.available) {
          setError('Username already exists. Please choose a different username.');
          return;
        }
      } catch (checkErr) {
        // If the check fails, log it but proceed with creation, letting the backend handle the final validation
        console.error('Username check failed, proceeding with creation attempt:', checkErr);
      }

      // Ensure a CSRF token is ready before submit
      await getCSRFToken();

      // Ensure roles array matches access level
      const userToCreate = {
        ...newUser,
        roles: newUser.accessLevel === 'admin' ? ['admin', 'user'] : ['user']
      };

      const response = await api.post('/users', userToCreate);
      setShowCreateModal(false);
      setNewUser({
        username: '',
        password: '',
        email: '',
        firstName: '',
        lastName: '',
        position: '',
        department: '',
        accessLevel: 'basic',
        roles: ['user']
      });
      fetchUsers(currentPage);
      fetchStatistics();
      
      // Show success message
      console.log('User created successfully:', response.data);
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to create user';
      setError('Error creating user: ' + errorMessage);
      console.error('Create user error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Update user
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      const userId = selectedUser._id || selectedUser.id;
      const response = await api.put(`/users/${userId}`, selectedUser);
      setShowEditModal(false);
      setSelectedUser(null);
      fetchUsers(currentPage);
      fetchStatistics();
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update user';
      setError('Error updating user: ' + errorMessage);
    }
  };

  // Toggle user status
  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      const response = await api.patch(`/users/${userId}/toggle-status`);
      fetchUsers(currentPage);
      fetchStatistics();
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to toggle user status';
      setError('Error toggling user status: ' + errorMessage);
    }
  };

  // Delete user
  const handleDeleteUser = async (userId, username) => {
    if (!confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await api.delete(`/users/${userId}`);
      fetchUsers(currentPage);
      fetchStatistics();
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to delete user';
      setError('Error deleting user: ' + errorMessage);
    }
  };

  // Open create modal and clear form
  const handleOpenCreateModal = () => {
    // Prefetch CSRF to avoid first-submit 403
    getCSRFToken().catch(() => {});
    setNewUser({
      username: '',
      password: '',
      email: '',
      firstName: '',
      lastName: '',
      position: '',
      department: '',
      accessLevel: 'basic',
      roles: ['user']
    });
    setError('');
    setShowCreateModal(true);
  };

  // Reset user password
  const handleResetPassword = async (userId, username) => {
    const newPassword = prompt(`Enter new password for ${username}:`);
    if (!newPassword) return;

    try {
      const response = await api.patch(`/users/${userId}/reset-password`, { newPassword });
      alert('Password reset successfully');
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to reset password';
      setError('Error resetting password: ' + errorMessage);
    }
  };

  // Handle search and filter changes
  const handleSearch = () => {
    setCurrentPage(1);
    fetchUsers(1);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterDepartment('');
    setFilterAccessLevel('');
    setFilterStatus('');
    setCurrentPage(1);
    fetchUsers(1);
  };

  useEffect(() => {
    fetchUsers(currentPage);
    fetchStatistics();
  }, [currentPage]);

  // Clean up any potential localStorage issues from browser extensions
  useEffect(() => {
    // Defensive cleanup for browser extensions that might cause localStorage issues
    const cleanupStorage = () => {
      try {
        // Remove any potentially corrupted localStorage entries that might cause JSON parsing errors
        const keysToCheck = ['userManagement', 'qms_user_data', 'user_cache'];
        keysToCheck.forEach(key => {
          const item = localStorage.getItem(key);
          if (item && item === '[object Object]') {
            localStorage.removeItem(key);
          }
        });
      } catch (error) {
        // Silently handle any localStorage access issues
        console.debug('localStorage cleanup handled:', error.message);
      }
    };

    cleanupStorage();
  }, []);

  const StatisticsCard = ({ title, value, color, subtitle }) => (
    <div className="stats-card">
      <div className="stats-header">
        <h3 style={{ color }}>{value}</h3>
        <span>{title}</span>
      </div>
      {subtitle && <div className="stats-subtitle">{subtitle}</div>}
    </div>
  );

  return (
    <PageLayout title="User Management">
      <div className="user-management">
        {error && (
          <div className="alert alert-error">
            <span>{error}</span>
            <button onClick={() => setError('')}>&times;</button>
          </div>
        )}

        {/* Statistics Section */}
        {statistics && (
          <div className="statistics-section">
            <div className="stats-grid">
              <StatisticsCard
                title="Total Users"
                value={statistics.totalUsers}
                color="var(--primary-color)"
              />
              <StatisticsCard
                title="Active Users"
                value={statistics.activeUsers}
                color="var(--success-color)"
              />
              <StatisticsCard
                title="Inactive Users"
                value={statistics.inactiveUsers}
                color="var(--warning-color)"
              />
              <StatisticsCard
                title="Recent Users"
                value={statistics.recentUsers?.length || 0}
                color="var(--info-color)"
                subtitle="Last 5 registered"
              />
            </div>
          </div>
        )}

        {/* Controls Section */}
        <div className="controls-section">
          <div className="search-filters">
            <div className="search-group">
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button onClick={handleSearch} className="btn btn-primary">
                Search
              </button>
            </div>
            
            <div className="filters-group">
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
              >
                <option value="">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
              
              <select
                value={filterAccessLevel}
                onChange={(e) => setFilterAccessLevel(e.target.value)}
              >
                <option value="">All Access Levels</option>
                {accessLevels.map(level => (
                  <option key={level.value} value={level.value}>{level.label}</option>
                ))}
              </select>
              
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">All Status</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
              
              <button onClick={clearFilters} className="btn btn-secondary">
                Clear Filters
              </button>
            </div>
          </div>
          
          <button
            onClick={handleOpenCreateModal}
            className="btn btn-success"
          >
            Add New User
          </button>
        </div>

        {/* Users Table */}
        <div className="table-section">
          {loading ? (
            <div className="loading">Loading users...</div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Email</th>
                      <th>Position</th>
                      <th>Department</th>
                      <th>Access Level</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => {
                      const accessLevel = accessLevels.find(level => level.value === user.accessLevel);
                      return (
                        <tr key={user._id}>
                          <td>
                            <div className="user-info">
                              <div className="user-avatar">
                                {user.firstName?.[0]}{user.lastName?.[0]}
                              </div>
                              <div>
                                <div className="user-name">{user.fullName}</div>
                                <div className="user-username">@{user.username}</div>
                              </div>
                            </div>
                          </td>
                          <td>{user.email}</td>
                          <td>{user.position || '-'}</td>
                          <td>{user.department || '-'}</td>
                          <td>
                            <span
                              className="access-level-badge"
                              style={{ backgroundColor: accessLevel?.color }}
                            >
                              {accessLevel?.label}
                            </span>
                          </td>
                          <td>
                            <span className={`status-badge ${user.active ? 'active' : 'inactive'}`}>
                              {user.active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                          <td>
                            <div className="actions-dropdown">
                              <button className="actions-trigger">⋮</button>
                              <div className="actions-menu">
                                <button
                                  onClick={() => {
                                    setSelectedUser(safeUserData(user));
                                    setShowEditModal(true);
                                  }}
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleToggleStatus(user._id, user.active)}
                                >
                                  {user.active ? 'Deactivate' : 'Activate'}
                                </button>
                                <button
                                  onClick={() => handleResetPassword(user._id, user.username)}
                                >
                                  Reset Password
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(user._id, user.username)}
                                  className="danger"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination && (
                <div className="pagination">
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={!pagination.hasPrev}
                    className="btn btn-secondary"
                  >
                    Previous
                  </button>
                  
                  <span className="pagination-info">
                    Page {pagination.currentPage} of {pagination.totalPages} 
                    ({pagination.totalUsers} total users)
                  </span>
                  
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={!pagination.hasNext}
                    className="btn btn-secondary"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Create User Modal */}
        <UserModal
          show={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          user={newUser}
          onChange={patchNewUser}
          onSubmit={handleCreateUser}
          title="Create New User"
          isCreate={true}
          departments={departments}
          accessLevels={accessLevels}
        />

        {/* Edit User Modal */}
        <UserModal
          show={showEditModal}
          onClose={() => setShowEditModal(false)}
          user={selectedUser}
          onChange={patchSelectedUser}
          onSubmit={handleUpdateUser}
          title="Edit User"
          isCreate={false}
          departments={departments}
          accessLevels={accessLevels}
        />
      </div>
    </PageLayout>
  );
};

export default UserManagement;
