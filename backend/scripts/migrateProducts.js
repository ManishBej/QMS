#!/usr/bin/env node
/**
 * Migration script to import Product Master CSV data into MongoDB
 * Usage: npm run migrate:products
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDb } from '../src/config/db.js';
import ProductMaster from '../src/models/ProductMaster.js';

console.log('📦 Product Master Migration Script Loaded');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CSV parsing function (reused from existing csvParser)
function parseProductMasterCSV() {
  try {
    // Support both filename variants with/without extra space before extension
    const candidateA = path.join(__dirname, '../../Engineering Product Master .csv');
    const candidateB = path.join(__dirname, '../../Engineering Product Master.csv');
    const csvPath = fs.existsSync(candidateA) ? candidateA : (fs.existsSync(candidateB) ? candidateB : candidateA);
    
    if (!fs.existsSync(csvPath)) {
      throw new Error(`Product Master CSV not found at: ${csvPath}`);
    }

  console.log(`📁 Reading CSV file: ${csvPath}`);
    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.split('\n');
    
    if (lines.length < 2) {
      throw new Error('Invalid CSV format - missing header or data');
    }

    // Parse header
    const header = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    console.log(`📋 CSV Headers: ${header.join(', ')}`);
    
    const products = [];
    
    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Skip empty lines
      
      // Simple CSV parsing with quote handling
      const values = [];
      let current = '';
      let inQuotes = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim()); // Add the last value
      
      if (values.length >= 4) {
        const product = {
          productName: values[0]?.replace(/"/g, '').trim(),
          productSubGroup: values[1]?.replace(/"/g, '').trim(),
          groupName: values[2]?.replace(/"/g, '').trim(),
          uniqueId: values[3]?.replace(/"/g, '').trim()
        };
        
        // Validate required fields
        if (product.productName && product.uniqueId) {
          // Generate search text
          product.searchText = [
            product.productName,
            product.uniqueId,
            product.productSubGroup,
            product.groupName
          ].filter(Boolean).join(' ').toLowerCase();
          
          products.push(product);
        } else {
          console.warn(`⚠️  Skipping invalid product at line ${i + 1}: ${line.substring(0, 50)}...`);
        }
      }
    }
    
    console.log(`✅ Parsed ${products.length} products from CSV`);
    return products;
  } catch (error) {
    console.error('❌ CSV parsing error:', error.message);
    throw error;
  }
}

async function migrateProducts() {
  try {
    console.log('🚀 Starting Product Master migration...');
    
    // Connect to database
    await connectDb();
    console.log('📊 Connected to MongoDB');
    
    // Check if products already exist
    const existingCount = await ProductMaster.countDocuments();
    console.log(`📈 Existing products in database: ${existingCount}`);
    
    if (existingCount > 0) {
      console.log('⚠️  Products already exist in database.');
      console.log('Choose an option:');
      console.log('1. Skip migration (recommended if data is current)');
      console.log('2. Clear existing and reimport (DESTRUCTIVE)');
      console.log('3. Update existing products (merge)');
      
      // For now, we'll skip if data exists to prevent accidental overwrites
      console.log('💡 Skipping migration. To force reimport, delete existing products first.');
      console.log('   Use: db.productmasters.deleteMany({}) in MongoDB shell');
      return;
    }
    
    // Parse CSV
    const products = parseProductMasterCSV();
    
    if (products.length === 0) {
      console.log('❌ No valid products found in CSV');
      return;
    }
    
    console.log(`📦 Importing ${products.length} products to MongoDB...`);
    
    // Batch insert with error handling
    const batchSize = 1000;
    let imported = 0;
    let errors = 0;
    
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      
      try {
        const result = await ProductMaster.insertMany(batch, { 
          ordered: false // Continue on error
        });
        imported += result.length;
        console.log(`✅ Imported batch ${Math.floor(i / batchSize) + 1}: ${result.length} products`);
      } catch (error) {
        if (error.writeErrors) {
          errors += error.writeErrors.length;
          console.warn(`⚠️  Batch ${Math.floor(i / batchSize) + 1} had ${error.writeErrors.length} errors (likely duplicates)`);
          imported += (batch.length - error.writeErrors.length);
        } else {
          console.error(`❌ Batch ${Math.floor(i / batchSize) + 1} failed:`, error.message);
          errors += batch.length;
        }
      }
    }
    
    console.log('\n🎉 Migration completed!');
    console.log(`✅ Successfully imported: ${imported} products`);
    console.log(`⚠️  Errors/Duplicates: ${errors}`);
    
    // Verify import
    const finalCount = await ProductMaster.countDocuments();
    console.log(`📊 Total products in database: ${finalCount}`);
    
    // Create indexes
    console.log('🔍 Ensuring database indexes...');
    try {
      // Use createIndex for individual indexes
      await ProductMaster.collection.createIndex({ productName: 'text', uniqueId: 'text', productSubGroup: 'text' });
      await ProductMaster.collection.createIndex({ groupName: 1, productSubGroup: 1 });
      await ProductMaster.collection.createIndex({ isActive: 1, productName: 1 });
      await ProductMaster.collection.createIndex({ uniqueId: 1 }, { unique: true });
      console.log('✅ Indexes created successfully');
    } catch (indexError) {
      console.warn('⚠️  Some indexes may already exist:', indexError.message);
    }
    
    // Test search functionality
    console.log('\n🧪 Testing search functionality...');
    const testSearch = await ProductMaster.searchProducts('pump', { limit: 3 });
    console.log(`🔍 Test search for "pump" found ${testSearch.length} results:`);
    testSearch.forEach((product, index) => {
      console.log(`  ${index + 1}. ${product.productName} (${product.uniqueId})`);
    });
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  } finally {
    console.log('🔚 Migration script completed');
    process.exit(0);
  }
}

// Check if running directly
if (import.meta.url === `file://${process.argv[1]}` || import.meta.url.endsWith('migrateProducts.js')) {
  console.log('🚀 Starting migration script...');
  migrateProducts();
}

export { migrateProducts, parseProductMasterCSV };
