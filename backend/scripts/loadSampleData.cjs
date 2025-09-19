const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function loadSampleData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/qms');
    console.log('📊 Connected to MongoDB');

    // Load models (use dynamic import for ES modules)
    const { default: RFQ } = await import('../src/models/RFQ.js');
    const { default: Quote } = await import('../src/models/Quote.js');
    const { default: User } = await import('../src/models/User.js');

    console.log('📊 Loading sample data for Compare & Score testing...');

    // Find or create a test user
    let testUser = await User.findOne({ username: 'admin' });
    if (!testUser) {
      testUser = await User.findOne();
      if (!testUser) {
        console.log('❌ No users found. Please create a user first using: npm run seed:admin');
        process.exit(1);
      }
    }

    console.log(`👤 Using user: ${testUser.username}`);

    // Clear existing test data
    await RFQ.deleteMany({ title: { $regex: /UAT RFQ|Sample RFQ/ } });
    await Quote.deleteMany({ supplierName: { $regex: /Vendor|Sample/ } });

    console.log('🧹 Cleared existing test data');

    // Sample data structure
    const sampleRFQs = [
      {
        title: 'Sample RFQ 1 - Office Supplies',
        description: 'Office supplies for Q4 2025',
        department: 'Administration',
        currency: 'INR',
        items: [
          { 
            productText: 'Premium Copy Paper A4 - 500 sheets per pack', 
            sku: 'PAPER-A4-500', 
            quantity: 100, 
            uom: 'Pack',
            targetDeliveryDays: 7 
          },
          { 
            productText: 'Black Ink Cartridge - HP Compatible', 
            sku: 'INK-HP-BLK', 
            quantity: 25, 
            uom: 'Piece',
            targetDeliveryDays: 10 
          }
        ],
        quotes: [
          {
            supplierName: 'VendorAlpha Office Solutions',
            contactEmail: 'vendor.alpha@example.com',
            contactPhone: '+91-9876543210',
            items: [
              { 
                productText: 'Premium Copy Paper A4 - 500 sheets per pack',
                sku: 'PAPER-A4-500',
                quantity: 100,
                uom: 'Pack',
                unitPrice: 250,
                totalPrice: 25000,
                deliveryDays: 7,
                freight: 1250,
                insurance: 500,
                customsDuty: 750,
                taxes: 4500
              },
              {
                productText: 'Black Ink Cartridge - HP Compatible',
                sku: 'INK-HP-BLK', 
                quantity: 25,
                uom: 'Piece',
                unitPrice: 1200,
                totalPrice: 30000,
                deliveryDays: 10,
                freight: 1500,
                insurance: 600,
                customsDuty: 900,
                taxes: 5400
              }
            ],
            notes: 'Vendor History: 85% Compliance: 95%'
          },
          {
            supplierName: 'VendorBravo Stationery',
            contactEmail: 'vendor.bravo@example.com', 
            contactPhone: '+91-9876543211',
            items: [
              {
                productText: 'Premium Copy Paper A4 - 500 sheets per pack',
                sku: 'PAPER-A4-500',
                quantity: 100,
                uom: 'Pack', 
                unitPrice: 230,
                totalPrice: 23000,
                deliveryDays: 9,
                freight: 1150,
                insurance: 460,
                customsDuty: 690,
                taxes: 4140
              },
              {
                productText: 'Black Ink Cartridge - HP Compatible',
                sku: 'INK-HP-BLK',
                quantity: 25,
                uom: 'Piece',
                unitPrice: 1300,
                totalPrice: 32500,
                deliveryDays: 12,
                freight: 1625,
                insurance: 650,
                customsDuty: 975,
                taxes: 5850
              }
            ],
            notes: 'Vendor History: 70% Compliance: 90%'
          },
          {
            supplierName: 'VendorCharlie Supplies',
            contactEmail: 'vendor.charlie@example.com',
            contactPhone: '+91-9876543212',
            items: [
              {
                productText: 'Premium Copy Paper A4 - 500 sheets per pack',
                sku: 'PAPER-A4-500',
                quantity: 100,
                uom: 'Pack',
                unitPrice: 270,
                totalPrice: 27000,
                deliveryDays: 5,
                freight: 1350,
                insurance: 540,
                customsDuty: 810,
                taxes: 4860
              },
              {
                productText: 'Black Ink Cartridge - HP Compatible',
                sku: 'INK-HP-BLK',
                quantity: 25,
                uom: 'Piece',
                unitPrice: 1100,
                totalPrice: 27500,
                deliveryDays: 8,
                freight: 1375,
                insurance: 550,
                customsDuty: 825,
                taxes: 4950
              }
            ],
            notes: 'Vendor History: 90% Compliance: 85%'
          }
        ]
      }
    ];

    // Process each RFQ
    for (const rfqData of sampleRFQs) {
      // Create RFQ
      const rfq = new RFQ({
        title: rfqData.title,
        description: rfqData.description,
        department: rfqData.department,
        currency: rfqData.currency,
        items: rfqData.items.map(item => ({
          productText: item.productText,
          productId: item.sku,
          quantity: item.quantity,
          uom: item.uom,
          targetDeliveryDays: item.targetDeliveryDays
        })),
        status: 'OPEN',
        createdBy: testUser._id
      });

      await rfq.save();
      console.log(`📋 Created RFQ: ${rfq.title} (${rfq._id})`);

      // Create quotes for this RFQ
      for (const quoteData of rfqData.quotes) {
        const quote = new Quote({
          rfq: rfq._id,
          supplierName: quoteData.supplierName,
          supplierContact: quoteData.contactEmail,
          currency: rfqData.currency,
          items: quoteData.items,
          notes: quoteData.notes,
          status: 'SUBMITTED'
        });

        // Calculate totals
        quote.subtotal = quote.items.reduce((sum, item) => sum + item.totalPrice, 0);
        quote.totalFreight = quote.items.reduce((sum, item) => sum + (item.freight || 0), 0);
        quote.totalInsurance = quote.items.reduce((sum, item) => sum + (item.insurance || 0), 0);
        quote.totalCustomsDuty = quote.items.reduce((sum, item) => sum + (item.customsDuty || 0), 0);
        quote.totalTaxes = quote.items.reduce((sum, item) => sum + (item.taxes || 0), 0);
        quote.grandTotal = quote.subtotal + quote.totalFreight + quote.totalInsurance + quote.totalCustomsDuty + quote.totalTaxes;

        await quote.save();
        console.log(`💰 Created quote: ${quote.supplierName} for ${rfq.title}`);
      }
    }

    console.log('✅ Sample data loaded successfully!');
    console.log('🔍 You can now test the Compare & Score functionality');

  } catch (error) {
    console.error('❌ Error loading sample data:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the script
loadSampleData();
