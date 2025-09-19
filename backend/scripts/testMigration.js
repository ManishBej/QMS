// Simple test to check script imports
import 'dotenv/config';
console.log('✅ dotenv loaded');

import { connectDb } from '../src/config/db.js';
console.log('✅ db config imported');

import ProductMaster from '../src/models/ProductMaster.js';
console.log('✅ ProductMaster model imported');

async function test() {
  try {
    console.log('🔌 Connecting to database...');
    await connectDb();
    console.log('✅ Connected to MongoDB');
    
    const count = await ProductMaster.countDocuments();
    console.log(`📊 Current products in database: ${count}`);
    
    console.log('🎉 Test completed successfully');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
  process.exit(0);
}

test();
