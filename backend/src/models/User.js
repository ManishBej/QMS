import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    roles: { type: [String], default: ['user'] },
    position: { type: String, default: '' },
    department: { type: String, default: '' },
    accessLevel: { 
      type: String, 
      enum: ['basic', 'intermediate', 'advanced', 'admin'], 
      default: 'basic' 
    },
    permissions: {
      canViewRFQs: { type: Boolean, default: true },
      canCreateRFQs: { type: Boolean, default: false },
      canEditRFQs: { type: Boolean, default: false },
      canDeleteRFQs: { type: Boolean, default: false },
      canViewQuotes: { type: Boolean, default: true },
      canCreateQuotes: { type: Boolean, default: false },
      canApproveQuotes: { type: Boolean, default: false },
      canViewReports: { type: Boolean, default: false },
      canExportData: { type: Boolean, default: false },
      canManageUsers: { type: Boolean, default: false }
    },
    defaultApprover: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User',
      default: null 
    },
    lastLogin: { type: Date },
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
    active: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Check if account is locked
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Instance method to check permissions
userSchema.methods.hasPermission = function(permission) {
  if (this.roles.includes('admin')) return true;
  return this.permissions[permission] === true;
};

// Static method to get default permissions based on access level
userSchema.statics.getDefaultPermissions = function(accessLevel) {
  const permissions = {
    basic: {
      canViewRFQs: true,
      canCreateRFQs: false,
      canEditRFQs: false,
      canDeleteRFQs: false,
      canViewQuotes: true,
      canCreateQuotes: false,
      canApproveQuotes: false,
      canViewReports: false,
      canExportData: false,
      canManageUsers: false
    },
    intermediate: {
      canViewRFQs: true,
      canCreateRFQs: true,
      canEditRFQs: true,
      canDeleteRFQs: false,
      canViewQuotes: true,
      canCreateQuotes: true,
      canApproveQuotes: false,
      canViewReports: true,
      canExportData: false,
      canManageUsers: false
    },
    advanced: {
      canViewRFQs: true,
      canCreateRFQs: true,
      canEditRFQs: true,
      canDeleteRFQs: true,
      canViewQuotes: true,
      canCreateQuotes: true,
      canApproveQuotes: true,
      canViewReports: true,
      canExportData: true,
      canManageUsers: false
    },
    admin: {
      canViewRFQs: true,
      canCreateRFQs: true,
      canEditRFQs: true,
      canDeleteRFQs: true,
      canViewQuotes: true,
      canCreateQuotes: true,
      canApproveQuotes: true,
      canViewReports: true,
      canExportData: true,
      canManageUsers: true
    }
  };
  
  return permissions[accessLevel] || permissions.basic;
};

export const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;
