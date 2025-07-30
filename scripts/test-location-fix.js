import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3002';

async function testLocationFix() {
  console.log('=== Testing Location Cache Fix ===\n');

  try {
    // Step 1: Clear the location cache
    console.log('1. Clearing location cache...');
    const clearResponse = await fetch(`${BASE_URL}/api/employees/clear-cache`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (clearResponse.ok) {
      const clearResult = await clearResponse.json();
      console.log('✓ Cache cleared:', clearResult.message);
    } else {
      console.log('✗ Failed to clear cache:', clearResponse.status);
    }

    // Step 2: Fetch employees with cache clearing
    console.log('\n2. Fetching employees with fresh location data...');
    const employeesResponse = await fetch(`${BASE_URL}/api/employees?clearCache=true`);
    
    if (employeesResponse.ok) {
      const employeesData = await employeesResponse.json();
      console.log(`✓ Found ${employeesData.total} employees`);
      
      // Show location data for first few employees
      console.log('\n3. Location data sample:');
      employeesData.employees.slice(0, 5).forEach((emp, index) => {
        console.log(`Employee ${index + 1}: ${emp.name}`);
        console.log(`  Location: ${emp.location.address}`);
        console.log(`  Coordinates: ${emp.location.lat}, ${emp.location.lng}`);
        console.log(`  Last Update: ${emp.lastUpdate}`);
        console.log('');
      });
      
      // Check for hardcoded locations
      const hardcodedLocations = employeesData.employees.filter(emp => 
        emp.location.address.includes('Delhi') || 
        emp.location.address.includes('Mumbai') || 
        emp.location.address.includes('Bangalore') ||
        emp.location.address.includes('Maharashtra')
      );
      
      if (hardcodedLocations.length > 0) {
        console.log(`⚠️  WARNING: ${hardcodedLocations.length} employees still have hardcoded locations:`);
        hardcodedLocations.forEach(emp => {
          console.log(`  - ${emp.name}: ${emp.location.address}`);
        });
      } else {
        console.log('✓ No hardcoded locations detected!');
      }
      
      // Check for real coordinates (non-zero)
      const realLocations = employeesData.employees.filter(emp => 
        emp.location.lat !== 0 && emp.location.lng !== 0 &&
        emp.location.address !== "Location not available"
      );
      
      console.log(`\n📍 ${realLocations.length}/${employeesData.total} employees have real GPS coordinates`);
      
    } else {
      console.log('✗ Failed to fetch employees:', employeesResponse.status);
    }

  } catch (error) {
    console.error('Error during test:', error);
  }
}

testLocationFix();
