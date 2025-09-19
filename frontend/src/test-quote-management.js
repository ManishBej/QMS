import api from '../services/api.js';

// Test script for the new quote management features
const testQuoteManagement = async () => {
  try {
    console.log('🧪 Testing Quote Management API Endpoints...\n');

    // Test 1: Get manageable quotes
    console.log('📋 Test 1: Getting manageable quotes...');
    try {
      const response = await api.get('/quotes/manageable');
      console.log('✅ Manageable quotes endpoint working');
      console.log(`   Found ${response.data.quotes?.length || 0} quotes`);
      console.log(`   User role: ${response.data.userRole?.join(', ') || 'Unknown'}`);
    } catch (error) {
      console.log('❌ Manageable quotes failed:', error.response?.status, error.response?.data?.error);
    }

    // Test 2: Get user's own quotes  
    console.log('\n📋 Test 2: Getting user\'s own quotes...');
    try {
      const response = await api.get('/quotes/my');
      console.log('✅ My quotes endpoint working');
      console.log(`   Found ${response.data.quotes?.length || 0} personal quotes`);
    } catch (error) {
      console.log('❌ My quotes failed:', error.response?.status, error.response?.data?.error);
    }

    // Test 3: Check CSRF token
    console.log('\n🔐 Test 3: Getting CSRF token...');
    try {
      const response = await api.get('/csrf-token');
      console.log('✅ CSRF token endpoint working');
    } catch (error) {
      console.log('❌ CSRF token failed:', error.response?.status, error.response?.data?.error);
    }

    // Test 4: Check user authentication
    console.log('\n👤 Test 4: Checking user authentication...');
    try {
      const response = await api.get('/me');
      console.log('✅ User authentication working');
      console.log(`   User: ${response.data.username}`);
      console.log(`   Roles: ${response.data.roles?.join(', ') || 'None'}`);
    } catch (error) {
      console.log('❌ User authentication failed:', error.response?.status, error.response?.data?.error);
    }

    console.log('\n🎉 Quote Management API Tests Completed!');

  } catch (error) {
    console.error('❌ Test suite failed:', error);
  }
};

// Export for use in browser console
window.testQuoteManagement = testQuoteManagement;

// Log availability
console.log('🧪 Quote Management Tests Available! Run: testQuoteManagement()');

export default testQuoteManagement;
