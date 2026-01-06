// Simple test to verify caching is working
const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function testCaching() {
  console.log('🧪 Testing API caching performance...\n');

  try {
    // Test 1: First request (should be slow - cache miss)
    console.log('📊 Test 1: First request (cache miss)');
    const start1 = Date.now();
    const response1 = await axios.get(`${BASE_URL}/analytics/employees?dateRange=today`);
    const time1 = Date.now() - start1;
    console.log(`⏱️  Response time: ${time1}ms`);
    console.log(`📈 Data: ${response1.data.analytics?.length || 0} employees\n`);

    // Test 2: Second request (should be fast - cache hit)
    console.log('📊 Test 2: Second request (cache hit)');
    const start2 = Date.now();
    const response2 = await axios.get(`${BASE_URL}/analytics/employees?dateRange=today`);
    const time2 = Date.now() - start2;
    console.log(`⏱️  Response time: ${time2}ms`);
    console.log(`📈 Data: ${response2.data.analytics?.length || 0} employees\n`);

    // Test 3: Cache stats
    console.log('📊 Test 3: Cache statistics');
    const statsResponse = await axios.get(`${BASE_URL}/cache/stats`);
    console.log('📊 Cache Stats:', statsResponse.data.stats);

    // Performance improvement
    const improvement = ((time1 - time2) / time1 * 100).toFixed(1);
    console.log(`\n🚀 Performance improvement: ${improvement}% faster (${time1}ms → ${time2}ms)`);

    if (time2 < 100) {
      console.log('✅ SUCCESS: API response time is now under 100ms!');
    } else if (time2 < 1000) {
      console.log('✅ GOOD: API response time is under 1 second');
    } else {
      console.log('⚠️  WARNING: API response time is still over 1 second');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Make sure the server is running on port 3000');
    }
  }
}

// Run the test
testCaching();