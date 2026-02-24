/**
 * Key-Value API - Full CRUD with Database Verification
 * 
 * This test suite:
 * 1. Creates key-value pairs via API
 * 2. Verifies data exists in database
 * 3. Retrieves via API and verifies response
 * 4. Updates via API and verifies in database
 * 5. Deletes via API and verifies removal from database
 * 
 * Pattern: Following person_attributes_with_db.test.js structure
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import axios from 'axios';
import pg from 'pg';
const { Client } = pg;
import { config } from 'dotenv';

config();

describe('Key-Value API - Full CRUD with Database Verification', () => {
  let apiClient;
  let dbClient;
  const testKeys = [];
  
  beforeAll(async () => {
    console.log('\n🚀 Starting Key-Value API Test with Full DB Verification...\n');
    
    // Setup API client
    apiClient = axios.create({
      baseURL: process.env.BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Setup DB client
    dbClient = new Client({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    });
    
    await dbClient.connect();
    console.log('✅ Database connected\n');
  });
  
  afterAll(async () => {
    // Cleanup: Delete test data
    console.log('\n🧹 Cleanup: Deleting test data from database...');
    for (const key of testKeys) {
      try {
        await dbClient.query('DELETE FROM key_value WHERE key = $1', [key]);
      } catch (error) {
        console.log(`⚠️  Cleanup warning for key ${key}:`, error.message);
      }
    }
    console.log('✅ Cleanup completed');
    
    await dbClient.end();
    console.log('✅ Database disconnected\n');
  });
  
  test('1. CREATE key-value via API and verify in database', async () => {
    console.log('📝 Test 1: CREATE Key-Value Pair\n');
    
    const testKey = `test-create-${Date.now()}`;
    testKeys.push(testKey);
    const testValue = 'test-value-for-create';
    
    // Step 1: Create key-value via API
    console.log('🔵 Step 1: Sending POST request to create key-value...');
    console.log(`   Key: ${testKey}`);
    console.log(`   Value: ${testValue}`);
    
    const apiResponse = await apiClient.post('/api/key-value', {
      key: testKey,
      value: testValue
    });
    
    console.log('✅ API Response received');
    console.log(`   Status: ${apiResponse.status}`);
    console.log(`   Data:`, apiResponse.data);
    
    // Verify API response
    expect(apiResponse.status).toBe(201);
    expect(apiResponse.data).toHaveProperty('key', testKey);
    expect(apiResponse.data).toHaveProperty('value', testValue);
    expect(apiResponse.data).toHaveProperty('created_at');
    expect(apiResponse.data).toHaveProperty('updated_at');
    console.log('✅ API response validation passed');
    
    // Step 2: Verify key-value exists in database
    console.log('\n🔵 Step 2: Querying database to verify key-value...');
    const dbResult = await dbClient.query(
      'SELECT key, value, created_at, updated_at FROM key_value WHERE key = $1',
      [testKey]
    );
    
    console.log(`   Rows found: ${dbResult.rows.length}`);
    expect(dbResult.rows.length).toBe(1);
    console.log('✅ Key-value found in database');
    
    // Step 3: Verify database values match API response
    console.log('\n🔵 Step 3: Verifying database values...');
    const dbRow = dbResult.rows[0];
    console.log(`   DB Key: ${dbRow.key}`);
    console.log(`   DB Value: ${dbRow.value}`);
    
    expect(dbRow.key).toBe(testKey);
    expect(dbRow.value).toBe(testValue);
    expect(dbRow.created_at).toBeDefined();
    expect(dbRow.updated_at).toBeDefined();
    console.log('✅ Database values match expected data\n');
  });
  
  test('2. GET key-value via API and verify response matches database', async () => {
    console.log('📝 Test 2: GET Key-Value and Verify\n');
    
    const testKey = `test-get-${Date.now()}`;
    testKeys.push(testKey);
    const testValue = 'test-value-for-get';
    
    // Setup: Create key-value first
    console.log('🔧 Setup: Creating key-value in database...');
    await dbClient.query(
      'INSERT INTO key_value (key, value, created_at, updated_at) VALUES ($1, $2, NOW(), NOW())',
      [testKey, testValue]
    );
    console.log('✅ Key-value created in database\n');
    
    // Step 1: Get key-value via API
    console.log('🔵 Step 1: Sending GET request...');
    console.log(`   Endpoint: /api/key-value/${testKey}`);
    
    const apiResponse = await apiClient.get(`/api/key-value/${testKey}`);
    
    console.log('✅ API Response received');
    console.log(`   Status: ${apiResponse.status}`);
    console.log(`   Data:`, apiResponse.data);
    
    // Verify API response
    expect(apiResponse.status).toBe(200);
    expect(apiResponse.data).toHaveProperty('key', testKey);
    expect(apiResponse.data).toHaveProperty('value', testValue);
    console.log('✅ API response validation passed');
    
    // Step 2: Query database and compare
    console.log('\n🔵 Step 2: Querying database to compare...');
    const dbResult = await dbClient.query(
      'SELECT key, value FROM key_value WHERE key = $1',
      [testKey]
    );
    
    const dbRow = dbResult.rows[0];
    console.log(`   DB Key: ${dbRow.key}`);
    console.log(`   DB Value: ${dbRow.value}`);
    
    // Verify API response matches database
    expect(apiResponse.data.key).toBe(dbRow.key);
    expect(apiResponse.data.value).toBe(dbRow.value);
    console.log('✅ API response matches database data\n');
  });
  
  test('3. UPDATE key-value via API and verify in database', async () => {
    console.log('📝 Test 3: UPDATE Key-Value\n');
    
    const testKey = `test-update-${Date.now()}`;
    testKeys.push(testKey);
    const oldValue = 'old-value';
    const newValue = 'new-updated-value';
    
    // Setup: Create key-value first
    console.log('🔧 Setup: Creating initial key-value...');
    await apiClient.post('/api/key-value', {
      key: testKey,
      value: oldValue
    });
    console.log(`✅ Initial value: ${oldValue}\n`);
    
    // Step 1: Verify old value in database
    console.log('🔵 Step 1: Verifying old value in database...');
    let dbResult = await dbClient.query(
      'SELECT value FROM key_value WHERE key = $1',
      [testKey]
    );
    
    expect(dbResult.rows[0].value).toBe(oldValue);
    console.log(`✅ Confirmed old value in DB: ${dbResult.rows[0].value}`);
    
    // Step 2: Update via API
    console.log('\n🔵 Step 2: Sending POST request to update (POST = upsert)...');
    console.log(`   New Value: ${newValue}`);
    
    const apiResponse = await apiClient.post('/api/key-value', {
      key: testKey,
      value: newValue
    });
    
    console.log('✅ API Response received');
    console.log(`   Status: ${apiResponse.status}`);
    console.log(`   Updated Value: ${apiResponse.data.value}`);
    
    expect(apiResponse.status).toBe(200);
    expect(apiResponse.data.value).toBe(newValue);
    console.log('✅ API response shows updated value');
    
    // Step 3: Verify new value in database
    console.log('\n🔵 Step 3: Verifying new value in database...');
    dbResult = await dbClient.query(
      'SELECT value, updated_at FROM key_value WHERE key = $1',
      [testKey]
    );
    
    console.log(`   DB Value: ${dbResult.rows[0].value}`);
    expect(dbResult.rows[0].value).toBe(newValue);
    expect(dbResult.rows[0].updated_at).toBeDefined();
    console.log('✅ Database updated with new value');
    console.log('✅ updated_at timestamp is set\n');
  });
  
  test('4. DELETE key-value via API and verify removal from database', async () => {
    console.log('📝 Test 4: DELETE Key-Value\n');
    
    const testKey = `test-delete-${Date.now()}`;
    testKeys.push(testKey);
    const testValue = 'value-to-be-deleted';
    
    // Setup: Create key-value first
    console.log('🔧 Setup: Creating key-value to delete...');
    await apiClient.post('/api/key-value', {
      key: testKey,
      value: testValue
    });
    console.log('✅ Key-value created\n');
    
    // Step 1: Verify key exists in database
    console.log('🔵 Step 1: Verifying key exists in database before delete...');
    let dbResult = await dbClient.query(
      'SELECT COUNT(*) as count FROM key_value WHERE key = $1',
      [testKey]
    );
    
    expect(parseInt(dbResult.rows[0].count)).toBe(1);
    console.log(`✅ Key exists in database (count: ${dbResult.rows[0].count})`);
    
    // Step 2: Delete via API
    console.log('\n🔵 Step 2: Sending DELETE request...');
    console.log(`   Endpoint: DELETE /api/key-value/${testKey}`);
    
    const apiResponse = await apiClient.delete(`/api/key-value/${testKey}`);
    
    console.log('✅ API Response received');
    console.log(`   Status: ${apiResponse.status}`);
    console.log(`   Message:`, apiResponse.data);
    
    expect(apiResponse.status).toBe(200);
    console.log('✅ Delete request successful');
    
    // Step 3: Verify key is removed from database
    console.log('\n🔵 Step 3: Verifying key is removed from database...');
    dbResult = await dbClient.query(
      'SELECT COUNT(*) as count FROM key_value WHERE key = $1',
      [testKey]
    );
    
    console.log(`   Rows found: ${dbResult.rows[0].count}`);
    expect(parseInt(dbResult.rows[0].count)).toBe(0);
    console.log('✅ Key successfully removed from database');
    
    // Step 4: Verify GET returns 404 or error
    console.log('\n🔵 Step 4: Verifying GET request returns error...');
    try {
      await apiClient.get(`/api/key-value/${testKey}`);
      fail('Should have thrown error for deleted key');
    } catch (error) {
      console.log(`   API Error Status: ${error.response.status}`);
      expect([404, 500]).toContain(error.response.status);
      console.log('✅ GET request correctly returns error for deleted key\n');
    }
  });
  
  test('5. FULL CRUD LIFECYCLE with step-by-step database verification', async () => {
    console.log('📝 Test 5: FULL CRUD LIFECYCLE\n');
    
    const testKey = `test-lifecycle-${Date.now()}`;
    testKeys.push(testKey);
    const initialValue = 'initial-lifecycle-value';
    const updatedValue = 'updated-lifecycle-value';
    
    // === CREATE ===
    console.log('🔵 STEP 1: CREATE');
    console.log('   Sending POST to create key-value...');
    const createResponse = await apiClient.post('/api/key-value', {
      key: testKey,
      value: initialValue
    });
    console.log(`   ✅ Created: ${createResponse.data.value}`);
    
    let dbCheck = await dbClient.query('SELECT * FROM key_value WHERE key = $1', [testKey]);
    console.log(`   ✅ Verified in DB: ${dbCheck.rows[0].value}`);
    expect(dbCheck.rows[0].value).toBe(initialValue);
    
    // === READ ===
    console.log('\n🔵 STEP 2: READ');
    console.log('   Sending GET to retrieve key-value...');
    const readResponse = await apiClient.get(`/api/key-value/${testKey}`);
    console.log(`   ✅ Retrieved: ${readResponse.data.value}`);
    expect(readResponse.data.value).toBe(initialValue);
    
    // === UPDATE ===
    console.log('\n🔵 STEP 3: UPDATE');
    console.log('   Sending POST to update key-value...');
    const updateResponse = await apiClient.post('/api/key-value', {
      key: testKey,
      value: updatedValue
    });
    console.log(`   ✅ Updated: ${updateResponse.data.value}`);
    
    dbCheck = await dbClient.query('SELECT * FROM key_value WHERE key = $1', [testKey]);
    console.log(`   ✅ Verified update in DB: ${dbCheck.rows[0].value}`);
    expect(dbCheck.rows[0].value).toBe(updatedValue);
    
    // === READ AGAIN (verify update) ===
    console.log('\n🔵 STEP 4: READ (verify update)');
    console.log('   Sending GET to verify updated value...');
    const readAgainResponse = await apiClient.get(`/api/key-value/${testKey}`);
    console.log(`   ✅ Retrieved updated value: ${readAgainResponse.data.value}`);
    expect(readAgainResponse.data.value).toBe(updatedValue);
    
    // === DELETE ===
    console.log('\n🔵 STEP 5: DELETE');
    console.log('   Sending DELETE request...');
    const deleteResponse = await apiClient.delete(`/api/key-value/${testKey}`);
    console.log(`   ✅ Deleted: ${deleteResponse.status}`);
    
    dbCheck = await dbClient.query('SELECT COUNT(*) as count FROM key_value WHERE key = $1', [testKey]);
    console.log(`   ✅ Verified deletion in DB: count = ${dbCheck.rows[0].count}`);
    expect(parseInt(dbCheck.rows[0].count)).toBe(0);
    
    // === VERIFY DELETION ===
    console.log('\n🔵 STEP 6: VERIFY DELETION');
    console.log('   Attempting GET on deleted key...');
    try {
      await apiClient.get(`/api/key-value/${testKey}`);
      fail('Should have thrown error');
    } catch (error) {
      console.log(`   ✅ Correctly returned error: ${error.response.status}`);
      expect([404, 500]).toContain(error.response.status);
    }
    
    console.log('\n✅ FULL CRUD LIFECYCLE COMPLETED SUCCESSFULLY!\n');
  });
});
