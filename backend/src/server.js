import app from './app.js';
import { start as startWeeklyReport } from './jobs/weeklyReport.js';
import { validateEnvironment } from './config/env.js';
import { applyPerformanceIndexes } from './utils/performanceIndexes.js';
import { connectDb } from './config/db.js';

// Validate environment configuration before starting server
validateEnvironment();

const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, async () => {
  console.log(`🚀 QMS backend listening on port ${PORT}`);
  console.log(`📅 Started at: ${new Date().toISOString()}`);
  console.log(`🔐 Security: Authentication and rate limiting enabled`);
  
  // Apply performance indexes after server start
  try {
    await connectDb();
    await applyPerformanceIndexes();
    console.log('⚡ Performance optimizations applied');
  } catch (error) {
    console.error('❌ Performance optimization failed:', error.message);
  }
  
  // Start background jobs
  try { 
    startWeeklyReport(); 
    console.log('📊 Weekly report scheduler started');
  } catch (e) { 
    console.error('❌ Weekly report start failed:', e.message); 
  }
});

// Graceful shutdown handling
async function gracefulShutdown(signal) {
  console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
  
  // Stop accepting new connections
  server.close(async (err) => {
    if (err) {
      console.error('❌ Error during server shutdown:', err);
      process.exit(1);
    }
    
    console.log('🔌 HTTP server closed');
    
    // Close database connections
    try {
      const mongoose = await import('mongoose');
      if (mongoose.default.connection.readyState !== 0) {
        await mongoose.default.connection.close(false);
        console.log('🗄️  Database connections closed');
      } else {
        console.log('🗄️  Database already disconnected');
      }
    } catch (error) {
      console.error('❌ Error closing database:', error.message);
    }
    
    console.log('✅ Graceful shutdown complete');
    process.exit(0);
  });
  
  // Force shutdown after timeout
  setTimeout(() => {
    console.error('⏰ Shutdown timeout exceeded, forcing exit');
    process.exit(1);
  }, 10000); // 10 second timeout
}

// Handle process signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Promise Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

export default server;
