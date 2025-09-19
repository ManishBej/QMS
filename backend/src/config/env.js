// Environment validation for security requirements

const requiredEnvVars = ['JWT_SECRET', 'MONGODB_URI'];
const optionalEnvVars = ['FRONTEND_ORIGIN', 'PORT', 'NODE_ENV'];

export function validateEnvironment() {
  console.log('🔍 Validating environment configuration...');
  
  // Check required variables
  const missing = requiredEnvVars.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ FATAL: Missing required environment variables:');
    missing.forEach(key => console.error(`  - ${key}`));
    console.error('\nSet these environment variables before starting the application.');
    process.exit(1);
  }
  
  // Validate JWT_SECRET strength
  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret.length < 32) {
    console.error('❌ FATAL: JWT_SECRET must be at least 32 characters for security');
    console.error(`Current length: ${jwtSecret.length} characters`);
    process.exit(1);
  }
  
  // Validate MongoDB URI format
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
    console.error('❌ FATAL: MONGODB_URI must be a valid MongoDB connection string');
    process.exit(1);
  }
  
  // Warn about production settings
  if (process.env.NODE_ENV === 'production') {
    console.log('🚀 Production mode detected - checking additional security requirements...');
    
    if (!process.env.FRONTEND_ORIGIN) {
      console.warn('⚠️  WARNING: FRONTEND_ORIGIN not set in production - CORS may be too permissive');
    }
    
    if (mongoUri.includes('localhost') || mongoUri.includes('127.0.0.1')) {
      console.warn('⚠️  WARNING: Using localhost MongoDB in production - consider using a production database');
    }
    
    if (jwtSecret.length < 64) {
      console.warn('⚠️  WARNING: JWT_SECRET should be at least 64 characters in production');
    }
  }
  
  // Log configuration (without secrets)
  console.log('✅ Environment validation passed');
  console.log('📊 Configuration summary:');
  console.log(`  - NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  - PORT: ${process.env.PORT || '3001'}`);
  console.log(`  - MONGODB_URI: ${mongoUri.replace(/\/\/[^@]+@/, '//***:***@')}`); // Hide credentials
  console.log(`  - JWT_SECRET: ${jwtSecret.length} characters (secure)`);
  console.log(`  - FRONTEND_ORIGIN: ${process.env.FRONTEND_ORIGIN || 'not set'}`);
}

export function generateSecureSecret(length = 64) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default {
  validateEnvironment,
  generateSecureSecret
};
