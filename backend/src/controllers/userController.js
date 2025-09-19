import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { connectDb } from '../config/db.js';

// Get all users (admin only)
export const getAllUsers = async (req, res) => {
  try {
    await connectDb();
    
    const { page = 1, limit = 10, search, department, accessLevel, active } = req.query;
    
    // Build filter query
    const filter = {};
    
    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (department) filter.department = department;
    if (accessLevel) filter.accessLevel = accessLevel;
    if (active !== undefined) filter.active = active === 'true';
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const users = await User.find(filter)
      .select('-passwordHash') // Exclude password hash
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('createdBy', 'username firstName lastName')
      .lean();
    
    const total = await User.countDocuments(filter);
    
    // Add virtual fields manually since we're using lean()
    const usersWithVirtuals = users.map(user => ({
      ...user,
      fullName: `${user.firstName} ${user.lastName}`,
      isLocked: user.lockUntil && user.lockUntil > new Date()
    }));
    
    res.json({
      users: usersWithVirtuals,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalUsers: total,
        hasNext: skip + users.length < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Get users error:', error.message);
    res.status(500).json({ error: 'internal_server_error' });
  }
};

// Get user by ID (admin only)
export const getUserById = async (req, res) => {
  try {
    await connectDb();
    
    const user = await User.findById(req.params.id)
      .select('-passwordHash')
      .populate('createdBy', 'username firstName lastName')
      .lean();
    
    if (!user) {
      return res.status(404).json({ error: 'user_not_found' });
    }
    
    // Add virtual fields
    user.fullName = `${user.firstName} ${user.lastName}`;
    user.isLocked = user.lockUntil && user.lockUntil > new Date();
    
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error.message);
    res.status(500).json({ error: 'internal_server_error' });
  }
};

// Check if a username is available
export const checkUsernameAvailability = async (req, res) => {
  const { username } = req.query;

  if (!username) {
    return res.status(400).json({ message: 'Username is required.' });
  }

  try {
    await connectDb();
    // Using a case-insensitive collation for the query
    const existingUser = await User.findOne({ username }).collation({ locale: 'en', strength: 2 });
    
    if (existingUser) {
      return res.status(200).json({ available: false, message: 'Username is already taken.' });
    }

    return res.status(200).json({ available: true });
  } catch (error) {
    console.error('Error checking username:', error);
    res.status(500).json({ message: 'Server error while checking username.' });
  }
};

// Create new user (admin only)
export const createUser = async (req, res) => {
  try {
    await connectDb();
    
    const {
      username,
      password,
      email,
      firstName,
      lastName,
      roles = ['user'],
      position = '',
      department = '',
      accessLevel = 'basic'
    } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { username: username.toLowerCase() },
        { email: email.toLowerCase() }
      ]
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        error: 'user_exists',
        message: 'Username or email already exists'
      });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Get default permissions based on access level
    const defaultPermissions = User.getDefaultPermissions(accessLevel);
    
    // Create user
    const user = await User.create({
      username: username.toLowerCase(),
      passwordHash,
      email: email.toLowerCase(),
      firstName,
      lastName,
      roles,
      position,
      department,
      accessLevel,
      permissions: defaultPermissions,
      createdBy: req.user.sub
    });
    
    // Return user without password hash
    const userResponse = await User.findById(user._id)
      .select('-passwordHash')
      .populate('createdBy', 'username firstName lastName')
      .lean();
    
    userResponse.fullName = `${userResponse.firstName} ${userResponse.lastName}`;
    
    res.status(201).json({
      message: 'User created successfully',
      user: userResponse
    });
  } catch (error) {
    console.error('Create user error:', error.message);
    res.status(500).json({ error: 'internal_server_error' });
  }
};

// Update user (admin only)
export const updateUser = async (req, res) => {
  try {
    await connectDb();
    
    const userId = req.params.id;
    const updates = req.body;
    
    // Remove sensitive fields that shouldn't be updated directly
    delete updates.passwordHash;
    delete updates._id;
    delete updates.createdAt;
    delete updates.updatedAt;
    delete updates.createdBy;
    
    // If accessLevel is being changed, update permissions accordingly
    if (updates.accessLevel) {
      updates.permissions = User.getDefaultPermissions(updates.accessLevel);
    }
    
    // Hash new password if provided
    if (updates.password) {
      updates.passwordHash = await bcrypt.hash(updates.password, 10);
      delete updates.password;
    }
    
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .select('-passwordHash')
      .populate('createdBy', 'username firstName lastName')
      .lean();
    
    if (!user) {
      return res.status(404).json({ error: 'user_not_found' });
    }
    
    user.fullName = `${user.firstName} ${user.lastName}`;
    user.isLocked = user.lockUntil && user.lockUntil > new Date();
    
    res.json({
      message: 'User updated successfully',
      user
    });
  } catch (error) {
    console.error('Update user error:', error.message);
    res.status(500).json({ error: 'internal_server_error' });
  }
};

// Delete user (admin only)
export const deleteUser = async (req, res) => {
  try {
    await connectDb();
    
    const userId = req.params.id;
    
    // Prevent admin from deleting themselves
    if (userId === req.user.sub) {
      return res.status(400).json({ 
        error: 'cannot_delete_self',
        message: 'You cannot delete your own account'
      });
    }
    
    const user = await User.findByIdAndDelete(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'user_not_found' });
    }
    
    res.json({
      message: 'User deleted successfully',
      deletedUser: {
        id: user._id,
        username: user.username,
        fullName: `${user.firstName} ${user.lastName}`
      }
    });
  } catch (error) {
    console.error('Delete user error:', error.message);
    res.status(500).json({ error: 'internal_server_error' });
  }
};

// Toggle user active status (admin only)
export const toggleUserStatus = async (req, res) => {
  try {
    await connectDb();
    
    const userId = req.params.id;
    
    // Prevent admin from deactivating themselves
    if (userId === req.user.sub) {
      return res.status(400).json({ 
        error: 'cannot_deactivate_self',
        message: 'You cannot deactivate your own account'
      });
    }
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'user_not_found' });
    }
    
    user.active = !user.active;
    await user.save();
    
    const userResponse = await User.findById(userId)
      .select('-passwordHash')
      .populate('createdBy', 'username firstName lastName')
      .lean();
    
    userResponse.fullName = `${userResponse.firstName} ${userResponse.lastName}`;
    
    res.json({
      message: `User ${user.active ? 'activated' : 'deactivated'} successfully`,
      user: userResponse
    });
  } catch (error) {
    console.error('Toggle user status error:', error.message);
    res.status(500).json({ error: 'internal_server_error' });
  }
};

// Reset user password (admin only)
export const resetUserPassword = async (req, res) => {
  try {
    await connectDb();
    
    const { id } = req.params;
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ 
        error: 'invalid_password',
        message: 'Password must be at least 6 characters long'
      });
    }
    
    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    const user = await User.findByIdAndUpdate(
      id,
      { 
        passwordHash,
        loginAttempts: 0,
        lockUntil: undefined
      },
      { new: true }
    ).select('-passwordHash');
    
    if (!user) {
      return res.status(404).json({ error: 'user_not_found' });
    }
    
    res.json({
      message: 'Password reset successfully',
      user: {
        id: user._id,
        username: user.username,
        fullName: `${user.firstName} ${user.lastName}`
      }
    });
  } catch (error) {
    console.error('Reset password error:', error.message);
    res.status(500).json({ error: 'internal_server_error' });
  }
};

// Get user statistics (admin only)
export const getUserStatistics = async (req, res) => {
  try {
    await connectDb();
    
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ active: true });
    const inactiveUsers = totalUsers - activeUsers;
    
    const usersByAccessLevel = await User.aggregate([
      { $group: { _id: '$accessLevel', count: { $sum: 1 } } }
    ]);
    
    const usersByDepartment = await User.aggregate([
      { $match: { department: { $ne: '' } } },
      { $group: { _id: '$department', count: { $sum: 1 } } }
    ]);
    
    const recentUsers = await User.find()
      .select('username firstName lastName createdAt')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();
    
    res.json({
      totalUsers,
      activeUsers,
      inactiveUsers,
      usersByAccessLevel,
      usersByDepartment,
      recentUsers: recentUsers.map(user => ({
        ...user,
        fullName: `${user.firstName} ${user.lastName}`
      }))
    });
  } catch (error) {
    console.error('Get user statistics error:', error.message);
    res.status(500).json({ error: 'internal_server_error' });
  }
};
