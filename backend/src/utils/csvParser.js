import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Parse CSV file and return as JSON
 * Simple CSV parser for the Engineering Product Master
 */
export function parseProductMasterCSV() {
  try {
    const csvPath = path.join(__dirname, '../../../Engineering Product Master .csv');
    
    if (!fs.existsSync(csvPath)) {
      console.warn('Product Master CSV not found at:', csvPath);
      return [];
    }

    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.split('\n');
    
    if (lines.length < 2) {
      console.warn('Invalid CSV format - missing header or data');
      return [];
    }

    // Parse header
    const header = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    // Parse data rows
    const products = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Skip empty lines
      
      // Simple CSV parsing - handles quoted fields
      const values = parseCSVLine(line);
      if (values.length >= 4) {
        products.push({
          productName: values[0] || '',
          productSubGroup: values[1] || '',
          groupName: values[2] || '',
          uniqueId: values[3] || '',
          // Add normalized search text for faster filtering
          searchText: (values[0] + ' ' + values[3]).toLowerCase()
        });
      }
    }

    console.log(`✅ Loaded ${products.length} products from master CSV`);
    return products;
  } catch (error) {
    console.error('Error parsing product master CSV:', error);
    return [];
  }
}

/**
 * Simple CSV line parser that handles quoted fields
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim().replace(/"/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add the last field
  result.push(current.trim().replace(/"/g, ''));
  return result;
}

// Cache products in memory for better performance
let cachedProducts = null;

export function getCachedProducts() {
  if (!cachedProducts) {
    cachedProducts = parseProductMasterCSV();
  }
  return cachedProducts;
}

export default {
  parseProductMasterCSV,
  getCachedProducts
};
