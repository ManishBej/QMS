#!/usr/bin/env node

// Security validation script to verify environment configuration
import 'dotenv/config';
import { validateEnvironment, generateSecureSecret } from '../src/config/env.js';

console.log('🔐 QMS Security Configuration Validator\n');

try {
  // Test environment validation
  console.log('Testing environment validation...');
  validateEnvironment();
  console.log('✅ Environment validation passed!\n');
} catch (error) {
  console.error('❌ Environment validation failed:', error.message);
  console.log('\n🔧 To fix this issue:');
  console.log('1. Copy .env.example to .env:');
  console.log('   cp .env.example .env');
  console.log('\n2. Generate a secure JWT secret:');
  console.log('   node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  console.log('\n3. Update your .env file with the generated secret');
  console.log('\n4. Restart the application');
  process.exit(1);
}

console.log('🛡️  Security recommendations:');
console.log('• Use environment variables for all secrets');
console.log('• Set NODE_ENV=production for production deployments');
console.log('• Use HTTPS in production with proper TLS certificates');
console.log('• Regularly rotate JWT secrets and database passwords');
console.log('• Monitor for failed login attempts and unusual access patterns');
console.log('• Keep dependencies updated and run security audits');

console.log('\n🔑 Need a new secure secret? Here\'s a 64-character one:');
console.log(generateSecureSecret(64));

console.log('\n✅ Security validation complete!');
