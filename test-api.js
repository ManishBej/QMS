// Simple test to check if RFQ API is working
const fetch = require('node-fetch');

async function testRfqApi() {
  try {
    console.log('Testing RFQ API...');
    const response = await fetch('http://localhost:3001/api/rfqs', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 401) {
      console.log('✅ API is working - got expected 401 (authentication required)');
      return;
    }
    
    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', data);
  } catch (error) {
    console.error('❌ Error testing API:', error.message);
  }
}

testRfqApi();
