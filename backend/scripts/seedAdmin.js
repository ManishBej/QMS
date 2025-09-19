#!/usr/bin/env node
// Admin user seeding script (run via: npm run seed:admin)
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectDb } from '../src/config/db.js';
import User from '../src/models/User.js';

async function run () {
  await connectDb();
  const username = (process.env.ADMIN_USERNAME || 'admin').toLowerCase();
  
  // Require strong password from environment
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    console.error('❌ FATAL: ADMIN_PASSWORD environment variable is required');
    console.error('Set a strong password in your .env file:');
    console.error('ADMIN_PASSWORD=YourSecurePassword123!');
    process.exit(1);
  }
  
  // Validate password strength
  if (password.length < 12) {
    console.error('❌ FATAL: ADMIN_PASSWORD must be at least 12 characters');
    process.exit(1);
  }
  
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(password)) {
    console.error('❌ FATAL: ADMIN_PASSWORD must contain lowercase, uppercase, number, and special character');
    process.exit(1);
  }
  
  const roles = ['admin', 'procurement'];
  const existing = await User.findOne({ username });
  if (existing) {
    console.log('Admin user already exists');
    
    // Update existing admin user with new fields if they don't exist
    if (!existing.email || !existing.firstName || !existing.lastName) {
      console.log('Updating admin user with new required fields...');
      existing.email = existing.email || `${username}@company.com`;
      existing.firstName = existing.firstName || 'Admin';
      existing.lastName = existing.lastName || 'User';
      existing.accessLevel = existing.accessLevel || 'admin';
      existing.permissions = existing.permissions || User.getDefaultPermissions('admin');
      await existing.save();
      console.log('✅ Admin user updated with new fields');
    }
    return;
  }
  
  const passwordHash = await bcrypt.hash(password, 12);
  const defaultPermissions = User.getDefaultPermissions('admin');
  
  await User.create({ 
    username, 
    passwordHash, 
    roles,
    email: `${username}@company.com`,
    firstName: 'Admin',
    lastName: 'User',
    accessLevel: 'admin',
    permissions: defaultPermissions,
    position: 'System Administrator',
    department: 'IT'
  });
  console.log(`✅ Seeded admin user '${username}' with secure password`);
  console.log(`🔐 Password meets security requirements`);
}

run().catch(e => { console.error(e); process.exit(1); });
