// Performance test script for the optimized API endpoints
const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function performanceTest() {
  console.log('🚀 Starting Performance Test for Optimized APIs\n');

  const tests = [
    {
      name: 'All Employees Details (dateRange=all)',
      url: `${BASE_URL}/analytics/all-employees-details?dateRange=all`,
      expectedTime: 5000 // 5 seconds max
    },
    {
      name: 'Employee Details (dateRange=all)',
      url: `${BASE_URL}/analytics/employee-details/67daa55d9c4abb36045d5bfe?dateRange=all`,
      expectedTime: 3000 // 3 seconds max
    },
    {
      name: 'Employee Analytics (dateRange=today)',
      url: `${BASE_URL}/analytics/employees?dateRange=today`,
      expectedTime: 1000 // 1 second max
    }
  ];

  for (const test of tests) {
    console.log(`📊 Testing: ${test.name}`);
    
    try {
      // First request (cache miss)
      console.log('   🔄 First request (cache miss)...');
      const start1 = Date.now();
      const response1 = await axios.get(test.url);
      const time1 = Date.now() - start1;
      
      console.log(`   ⏱️  Response time: ${time1}ms`);
      console.log(`   📈 Data size: ${JSON.stringify(response1.data).length} bytes`);
      
      // Second request (cache hit)
      console.log('   ✅ Second request (cache hit)...');
      const start2 = Date.now();
      const response2 = await axios.get(test.url);
      const time2 = Date.now() - start2;
      
      console.log(`   ⏱️  Response time: ${time2}ms`);
      
      // Performance analysis
      const improvement = ((time1 - time2) / time1 * 100).toFixed(1);
      console.log(`   🚀 Performance improvement: ${improvement}%`);
      
      if (time2 < 100) {
        console.log('   ✅ EXCELLENT: Cache hit under 100ms');
      } else if (time2 < 500) {
        console.log('   ✅ GOOD: Cache hit under 500ms');
      } else {
        console.log('   ⚠️  WARNING: Cache hit over 500ms');
      }
      
      if (time1 < test.expectedTime) {
        console.log(`   ✅ PASS: First request under ${test.expectedTime}ms`);
      } else {
        console.log(`   ❌ FAIL: First request over ${test.expectedTime}ms`);
      }
      
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
      if (error.code === 'ECONNREFUSED') {
        console.log('   💡 Make sure the server is running on port 3000');
      }
    }
    
    console.log(''); // Empty line for readability
  }

  // Test cache statistics
  try {
    console.log('📊 Cache Statistics:');
    const cacheStats = await axios.get(`${BASE_URL}/cache/stats`);
    console.log('   📦 Cache Stats:', cacheStats.data.stats);
  } catch (error) {
    console.log('   ❌ Could not get cache stats');
  }

  console.log('\n🏁 Performance test completed!');
  console.log('\n💡 Tips for best performance:');
  console.log('   - First requests will be slower (cache miss)');
  console.log('   - Subsequent requests should be under 100ms (cache hit)');
  console.log('   - "dateRange=all" queries are optimized to skip expensive operations');
  console.log('   - Database indexes should be created for optimal performance');
}

// Run the test
performanceTest().catch(console.error);