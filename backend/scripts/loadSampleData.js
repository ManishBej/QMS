const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Load models
require('../src/config/db');
const RFQ = require('../src/models/RFQ');
const Quote = require('../src/models/Quote');
const User = require('../src/models/User');

async function loadSampleData() {
  try {
    // Wait for connection
    await new Promise(resolve => {
      if (mongoose.connection.readyState === 1) {
        resolve();
      } else {
        mongoose.connection.once('open', resolve);
      }
    });

    console.log('📊 Loading sample data for Compare & Score testing...');

    // Read sample data
    const sampleDataPath = path.join(__dirname, '../../uat_sample_data.json');
    const sampleData = JSON.parse(fs.readFileSync(sampleDataPath, 'utf8'));

    // Find or create a test user
    let testUser = await User.findOne({ username: 'admin' });
    if (!testUser) {
      testUser = await User.findOne();
      if (!testUser) {
        console.log('❌ No users found. Please create a user first.');
        process.exit(1);
      }
    }

    console.log(`👤 Using user: ${testUser.username}`);

    // Clear existing test data
    await RFQ.deleteMany({ title: { $regex: /UAT RFQ/ } });
    await Quote.deleteMany({ supplierName: { $regex: /Vendor/ } });

    console.log('🧹 Cleared existing test data');

    // Process each RFQ
    for (const rfqData of sampleData.rfqs) {
      // Create RFQ
      const rfq = new RFQ({
        title: rfqData.title,
        description: rfqData.description,
        items: rfqData.items.map(item => ({
          productText: `${item.sku} - Sample product`,
          sku: item.sku,
          quantity: item.quantity,
          uom: item.unit,
          specifications: `Specifications for ${item.sku}`,
          targetPrice: 0,
          budgetEstimate: 0
        })),
        status: 'Published',
        createdBy: testUser._id,
        publishedAt: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      });

      await rfq.save();
      console.log(`📋 Created RFQ: ${rfq.title} (${rfq._id})`);

      // Create quotes for this RFQ
      for (const quoteData of rfqData.quotes) {
        const quote = new Quote({
          rfqId: rfq._id,
          supplierName: quoteData.supplierName,
          contactEmail: `${quoteData.supplierName.toLowerCase()}@example.com`,
          contactPhone: '+1-555-0123',
          items: quoteData.items.map(item => ({
            productText: `${item.sku} - Sample product`,
            sku: item.sku,
            quantity: item.quantity,
            uom: rfqData.items.find(rfqItem => rfqItem.sku === item.sku)?.unit || 'EA',
            unitPrice: item.unitPrice,
            totalPrice: item.unitPrice * item.quantity,
            currency: item.currency,
            deliveryDays: item.leadTimeDays,
            freight: Math.round(item.unitPrice * item.quantity * 0.05), // 5% of total
            insurance: Math.round(item.unitPrice * item.quantity * 0.02), // 2% of total
            customsDuty: Math.round(item.unitPrice * item.quantity * 0.03), // 3% of total
            installation: 0,
            taxes: Math.round(item.unitPrice * item.quantity * 0.08) // 8% GST
          })),
          totalValue: quoteData.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0),
          currency: quoteData.items[0]?.currency || 'USD',
          validityDays: 30,
          paymentTerms: 'Net 30',
          deliveryTerms: 'FOB Origin',
          notes: `Vendor History: ${Math.floor(Math.random() * 40) + 60}% Compliance: ${Math.floor(Math.random() * 20) + 80}%`,
          status: 'Submitted',
          submittedAt: new Date()
        });

        await quote.save();
        console.log(`💰 Created quote: ${quote.supplierName} for ${rfq.title}`);
      }
    }

    console.log('✅ Sample data loaded successfully!');
    console.log('🔍 You can now test the Compare & Score functionality');

  } catch (error) {
    console.error('❌ Error loading sample data:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the script
loadSampleData();
