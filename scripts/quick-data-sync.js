#!/usr/bin/env node

/**
 * Quick Data Sync and Test Utility
 * 
 * This script quickly syncs data and tests the date filtering functionality
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/employee-tracking';

console.log('🔄 Quick Data Sync and Test');
console.log('===========================');

async function quickSync() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Test API endpoints by making direct HTTP requests
    const baseUrl = 'http://localhost:3002';
    
    // Test data sync endpoint
    console.log('\n🔄 Running data sync...');
    const syncResponse = await fetch(`${baseUrl}/api/data-sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    
    if (syncResponse.ok) {
      const syncResult = await syncResponse.json();
      console.log('✅ Data sync completed:', syncResult.stats);
    } else {
      console.log('⚠️ Data sync failed or server not running');
    }
    
    // Test data status
    console.log('\n📊 Checking data status...');
    const statusResponse = await fetch(`${baseUrl}/api/data-status`);
    
    if (statusResponse.ok) {
      const status = await statusResponse.json();
      console.log('📈 Data Status:');
      console.log(`   MongoDB Meetings: ${status.mongoDB.meetings}`);
      console.log(`   MongoDB History: ${status.mongoDB.history}`);
      console.log(`   In-Memory Meetings: ${status.inMemory.meetings}`);
    } else {
      console.log('⚠️ Status check failed or server not running');
    }
    
    // Test analytics with different date ranges
    console.log('\n🗓️ Testing date filters...');
    
    const dateRanges = ['today', 'yesterday', 'week', 'month'];
    
    for (const range of dateRanges) {
      const analyticsResponse = await fetch(`${baseUrl}/api/analytics/employees?dateRange=${range}`);
      
      if (analyticsResponse.ok) {
        const analytics = await analyticsResponse.json();
        const totalMeetings = analytics.analytics?.reduce((sum, emp) => sum + emp.totalMeetings, 0) || 0;
        console.log(`   ${range}: ${analytics.analytics?.length || 0} employees, ${totalMeetings} total meetings`);
      } else {
        console.log(`   ${range}: ❌ Failed to fetch`);
      }
    }
    
    console.log('\n✅ Quick sync and test completed!');
    console.log('\n💡 Tips:');
    console.log('   1. Check the dashboard at http://localhost:3002/dashboard');
    console.log('   2. Try different date filters to see if data appears');
    console.log('   3. Check data management at http://localhost:3002/data-management');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Server might not be running. Try:');
      console.log('   npm run dev');
    }
    
    if (error.message.includes('connection')) {
      console.log('\n💡 MongoDB might not be running. Try:');
      console.log('   MongoDB service start commands from MONGODB_SETUP.md');
    }
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

quickSync();
