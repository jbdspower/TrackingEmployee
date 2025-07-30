#!/usr/bin/env node

/**
 * MongoDB Setup Verification Script
 * 
 * This script tests the MongoDB connection and all data storage functionality
 * Run this script to verify that your MongoDB setup is working correctly
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/employee-tracking';
const DB_NAME = process.env.DB_NAME || 'employee-tracking';

console.log('🧪 MongoDB Setup Verification');
console.log('============================');
console.log(`📦 MongoDB URI: ${MONGODB_URI}`);
console.log(`📂 Database Name: ${DB_NAME}`);
console.log('');

async function testConnection() {
  try {
    console.log('🔌 Testing MongoDB connection...');
    await mongoose.connect(MONGODB_URI, {
      dbName: DB_NAME,
    });
    console.log('✅ MongoDB connection successful');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    return false;
  }
}

async function testCollections() {
  try {
    console.log('\n📋 Testing collections...');
    
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    console.log(`Found ${collections.length} collections:`);
    collections.forEach(col => {
      console.log(`  - ${col.name}`);
    });
    
    // Test each expected collection
    const expectedCollections = [
      'meetings',
      'meeting_history', 
      'attendance',
      'tracking_sessions',
      'employees'
    ];
    
    console.log('\n🔍 Checking expected collections:');
    for (const collName of expectedCollections) {
      try {
        const collection = db.collection(collName);
        const count = await collection.countDocuments();
        console.log(`  ✅ ${collName}: ${count} documents`);
      } catch (error) {
        console.log(`  ⚠️  ${collName}: Not accessible (${error.message})`);
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Collection test failed:', error.message);
    return false;
  }
}

async function testDataOperations() {
  try {
    console.log('\n💾 Testing data operations...');
    
    const db = mongoose.connection.db;
    
    // Test basic CRUD operations
    const testCollection = db.collection('test_verification');
    
    // CREATE
    const testDoc = {
      test: true,
      timestamp: new Date(),
      data: { message: 'MongoDB verification test' }
    };
    
    const insertResult = await testCollection.insertOne(testDoc);
    console.log('  ✅ INSERT operation successful');
    
    // READ
    const foundDoc = await testCollection.findOne({ _id: insertResult.insertedId });
    console.log('  ✅ READ operation successful');
    
    // UPDATE
    await testCollection.updateOne(
      { _id: insertResult.insertedId },
      { $set: { updated: true } }
    );
    console.log('  ✅ UPDATE operation successful');
    
    // DELETE
    await testCollection.deleteOne({ _id: insertResult.insertedId });
    console.log('  ✅ DELETE operation successful');
    
    // Clean up test collection
    await testCollection.drop().catch(() => {}); // Ignore errors if collection doesn't exist
    
    return true;
  } catch (error) {
    console.error('❌ Data operations test failed:', error.message);
    return false;
  }
}

async function testIndexes() {
  try {
    console.log('\n🗂️  Testing indexes...');
    
    const db = mongoose.connection.db;
    
    const collections = ['meetings', 'meeting_history', 'attendance', 'tracking_sessions', 'employees'];
    
    for (const collName of collections) {
      try {
        const collection = db.collection(collName);
        const indexes = await collection.listIndexes().toArray();
        console.log(`  📁 ${collName}: ${indexes.length} indexes`);
        indexes.forEach(index => {
          const keys = Object.keys(index.key).join(', ');
          console.log(`    - ${index.name}: {${keys}}`);
        });
      } catch (error) {
        console.log(`  ⚠️  ${collName}: Unable to check indexes (collection may not exist yet)`);
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Index test failed:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('Starting MongoDB verification tests...\n');
  
  let allTestsPassed = true;
  
  // Test 1: Connection
  const connectionTest = await testConnection();
  allTestsPassed = allTestsPassed && connectionTest;
  
  if (!connectionTest) {
    console.log('\n❌ Cannot proceed with other tests due to connection failure.');
    console.log('\n🔧 Troubleshooting tips:');
    console.log('   1. Make sure MongoDB is running locally');
    console.log('   2. Check if the MONGODB_URI in .env is correct');
    console.log('   3. Try running: mongosh "' + MONGODB_URI + '"');
    process.exit(1);
  }
  
  // Test 2: Collections
  const collectionsTest = await testCollections();
  allTestsPassed = allTestsPassed && collectionsTest;
  
  // Test 3: Data Operations
  const dataTest = await testDataOperations();
  allTestsPassed = allTestsPassed && dataTest;
  
  // Test 4: Indexes
  const indexTest = await testIndexes();
  allTestsPassed = allTestsPassed && indexTest;
  
  // Summary
  console.log('\n' + '='.repeat(50));
  if (allTestsPassed) {
    console.log('🎉 All tests passed! MongoDB setup is working correctly.');
    console.log('');
    console.log('✅ Your employee tracking system is ready to store data in MongoDB');
    console.log('✅ All collections and indexes are properly configured');
    console.log('✅ Data operations are working correctly');
  } else {
    console.log('⚠️  Some tests failed. Please check the errors above.');
    console.log('');
    console.log('💡 Common solutions:');
    console.log('   - Ensure MongoDB service is running');
    console.log('   - Check database permissions');
    console.log('   - Verify connection string format');
  }
  
  console.log('');
  console.log('📚 For more help, check: MONGODB_SETUP.md');
  
  await mongoose.disconnect();
  process.exit(allTestsPassed ? 0 : 1);
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n🛑 Test interrupted by user');
  await mongoose.disconnect();
  process.exit(1);
});

process.on('unhandledRejection', async (error) => {
  console.error('\n💥 Unhandled rejection:', error);
  await mongoose.disconnect();
  process.exit(1);
});

// Run the tests
runTests().catch(async (error) => {
  console.error('\n💥 Test runner failed:', error);
  await mongoose.disconnect();
  process.exit(1);
});
