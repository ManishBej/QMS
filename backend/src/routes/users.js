import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import requireRole from '../middleware/roles.js';
import { csrfProtection } from '../middleware/csrf.js';
import { validateUserCreation, validateUserUpdate, validatePasswordReset, validateObjectId } from '../middleware/validation.js';
import User from '../models/User.js';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  resetUserPassword,
  getUserStatistics,
  checkUsernameAvailability
} from '../controllers/userController.js';

const router = Router();

// Middleware to ensure only admins can access user management routes
const adminOnly = [authenticate, requireRole(['admin'])];
const adminOnlyWithCSRF = [authenticate, requireRole(['admin']), csrfProtection(['POST', 'PUT', 'PATCH', 'DELETE'])];

// User management routes
router.get('/statistics', adminOnly, getUserStatistics);

// Get users who can approve quotes
router.get('/approvers', authenticate, async (req, res) => {
  try {
    const approvers = await User.find({
      'permissions.canApproveQuotes': true,
      active: true
    })
    .select('firstName lastName username position department')
    .sort({ firstName: 1, lastName: 1 });

    res.json({
      success: true,
      approvers
    });
  } catch (error) {
    console.error('Failed to get approvers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load approvers',
      error: error.message
    });
  }
});

// Update user's default approver (users can set their own, admins can set for others)
router.patch('/:id/default-approver', authenticate, csrfProtection(['PATCH']), validateObjectId('id'), async (req, res) => {
  try {
    const { id: targetUserId } = req.params;
    const { defaultApproverId } = req.body;
    const currentUserId = req.user.userId;
    const userRoles = req.user.roles || [];
    
    // Check permissions: users can update their own, admins can update anyone's
    if (targetUserId !== currentUserId && !userRoles.includes('admin')) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own default approver'
      });
    }
    
    // Validate the approver if provided
    if (defaultApproverId) {
      const approver = await User.findOne({
        _id: defaultApproverId,
        'permissions.canApproveQuotes': true,
        active: true
      });
      
      if (!approver) {
        return res.status(400).json({
          success: false,
          message: 'Invalid approver selected'
        });
      }
    }
    
    // Update the user
    const updatedUser = await User.findByIdAndUpdate(
      targetUserId,
      { defaultApprover: defaultApproverId || null },
      { new: true }
    ).populate('defaultApprover', 'firstName lastName username position');
    
    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Default approver updated successfully',
      user: {
        id: updatedUser._id,
        defaultApprover: updatedUser.defaultApprover
      }
    });
  } catch (error) {
    console.error('Failed to update default approver:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update default approver',
      error: error.message
    });
  }
});

// This route must come before the /:id route to be matched correctly
router.get('/check-username', adminOnly, checkUsernameAvailability);

router.get('/', adminOnly, getAllUsers);
router.get('/:id', [...adminOnly, validateObjectId('id')], getUserById);
router.post('/', [...adminOnlyWithCSRF, ...validateUserCreation], createUser);
router.put('/:id', [...adminOnlyWithCSRF, validateObjectId('id'), ...validateUserUpdate], updateUser);
router.patch('/:id/toggle-status', [...adminOnlyWithCSRF, validateObjectId('id')], toggleUserStatus);
router.patch('/:id/reset-password', [...adminOnlyWithCSRF, validateObjectId('id'), ...validatePasswordReset], resetUserPassword);
router.delete('/:id', [...adminOnlyWithCSRF, validateObjectId('id')], deleteUser);

export default router;
