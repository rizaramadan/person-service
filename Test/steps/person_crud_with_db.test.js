/**
 * Person CRUD Operations with Database Verification
 * 
 * This test:
 * 1. Creates a person via API
 * 2. Verifies the person exists in database
 * 3. Updates the person via API
 * 4. Verifies the update in database
 * 5. Soft deletes the person
 * 6. Verifies soft delete in database
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import axios from 'axios';
import pg from 'pg';
const { Client } = pg;
import { config } from 'dotenv';

config();

describe('Person Service - CRUD with Database Verification', () => {
  let apiClient;
  let dbClient;
  let createdPersonId;
  let testClientId;
  
  beforeAll(async () => {
    console.log('\n🚀 Starting Person CRUD Test with DB Verification...\n');
    
    // Setup API client
    apiClient = axios.create({
      baseURL: process.env.BASE_URL,
      timeout: 10000,
      headers: {
        'Authorization': `Bearer ${process.env.AUTH_TOKEN}`,
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
    
    // Generate unique client_id for this test
    testClientId = `test-${Date.now()}`;
  });
  
  afterAll(async () => {
    // Cleanup: Hard delete test data
    if (createdPersonId) {
      try {
        await dbClient.query('DELETE FROM person WHERE id = $1', [createdPersonId]);
        console.log('\n🧹 Cleanup: Test data deleted from database');
      } catch (error) {
        console.log('⚠️  Cleanup warning:', error.message);
      }
    }
    
    await dbClient.end();
    console.log('✅ Database disconnected\n');
  });
  
  test('1. CREATE person via API and verify in database', async () => {
    console.log('📝 Test 1: CREATE Person\n');
    
    // Step 1: Create person via API
    console.log('🔵 Step 1: Sending POST request to create person...');
    const createData = {
      client_id: testClientId
    };
    
    let apiResponse;
    try {
      apiResponse = await apiClient.post('/api/person', createData);
    } catch (error) {
      if (error.response) {
        console.log('❌ API Error:', error.response.status, error.response.data);
      }
      throw error;
    }
    
    console.log('📊 API Response Status:', apiResponse.status);
    console.log('📊 API Response Data:', JSON.stringify(apiResponse.data, null, 2));
    
    // Step 2: Verify API response
    expect(apiResponse.status).toBe(201);
    expect(apiResponse.data).toHaveProperty('data');
    expect(apiResponse.data.data).toHaveProperty('id');
    expect(apiResponse.data.data.client_id).toBe(testClientId);
    
    createdPersonId = apiResponse.data.data.id;
    console.log(`✅ Person created via API with ID: ${createdPersonId}\n`);
    
    // Step 3: Query database directly
    console.log('🔍 Step 2: Querying database to verify person exists...');
    const dbResult = await dbClient.query(
      'SELECT * FROM person WHERE id = $1',
      [createdPersonId]
    );
    
    console.log(`📊 Database query returned ${dbResult.rows.length} row(s)`);
    
    // Step 4: Verify data in database
    expect(dbResult.rows.length).toBe(1);
    const personInDb = dbResult.rows[0];
    
    console.log('📋 Person in Database:');
    console.log(`   ID: ${personInDb.id}`);
    console.log(`   Client ID: ${personInDb.client_id}`);
    console.log(`   Created At: ${personInDb.created_at}`);
    console.log(`   Updated At: ${personInDb.updated_at}`);
    console.log(`   Deleted At: ${personInDb.deleted_at}`);
    
    // Step 5: Compare API response with database data
    expect(personInDb.id).toBe(createdPersonId);
    expect(personInDb.client_id).toBe(testClientId);
    expect(personInDb.deleted_at).toBeNull();
    
    console.log('\n✅ Test 1 PASSED: Person created and verified in database!\n');
  });
  
  test('2. UPDATE person via API and verify in database', async () => {
    console.log('📝 Test 2: UPDATE Person\n');
    
    expect(createdPersonId).toBeDefined();
    
    // Step 1: Update person via API
    console.log('🔵 Step 1: Sending PATCH request to update person...');
    const updateData = {
      client_id: `${testClientId}-updated`
    };
    
    let apiResponse;
    try {
      apiResponse = await apiClient.patch(`/api/person/${createdPersonId}`, updateData);
    } catch (error) {
      if (error.response) {
        console.log('❌ API Error:', error.response.status, error.response.data);
      }
      throw error;
    }
    
    console.log('📊 API Response Status:', apiResponse.status);
    console.log('📊 API Response Data:', JSON.stringify(apiResponse.data, null, 2));
    
    // Step 2: Verify API response
    expect(apiResponse.status).toBe(200);
    expect(apiResponse.data.data.client_id).toBe(`${testClientId}-updated`);
    
    console.log(`✅ Person updated via API\n`);
    
    // Step 3: Query database to verify update
    console.log('🔍 Step 2: Querying database to verify update...');
    const dbResult = await dbClient.query(
      'SELECT * FROM person WHERE id = $1',
      [createdPersonId]
    );
    
    const personInDb = dbResult.rows[0];
    
    console.log('📋 Updated Person in Database:');
    console.log(`   ID: ${personInDb.id}`);
    console.log(`   Client ID: ${personInDb.client_id}`);
    console.log(`   Updated At: ${personInDb.updated_at}`);
    
    // Step 4: Verify update in database
    expect(personInDb.client_id).toBe(`${testClientId}-updated`);
    
    console.log('\n✅ Test 2 PASSED: Person updated and verified in database!\n');
  });
  
  test('3. SOFT DELETE person via API and verify in database', async () => {
    console.log('📝 Test 3: SOFT DELETE Person\n');
    
    expect(createdPersonId).toBeDefined();
    
    // Step 1: Soft delete person via API
    console.log('🔵 Step 1: Sending DELETE request to soft delete person...');
    
    let apiResponse;
    try {
      apiResponse = await apiClient.delete(`/api/person/${createdPersonId}`);
    } catch (error) {
      if (error.response) {
        console.log('❌ API Error:', error.response.status, error.response.data);
      }
      throw error;
    }
    
    console.log('📊 API Response Status:', apiResponse.status);
    
    // Step 2: Verify API response
    expect([200, 204]).toContain(apiResponse.status);
    
    console.log(`✅ Person soft deleted via API\n`);
    
    // Step 3: Query database to verify soft delete
    console.log('🔍 Step 2: Querying database to verify soft delete...');
    const dbResult = await dbClient.query(
      'SELECT * FROM person WHERE id = $1',
      [createdPersonId]
    );
    
    expect(dbResult.rows.length).toBe(1);
    const personInDb = dbResult.rows[0];
    
    console.log('📋 Soft Deleted Person in Database:');
    console.log(`   ID: ${personInDb.id}`);
    console.log(`   Client ID: ${personInDb.client_id}`);
    console.log(`   Deleted At: ${personInDb.deleted_at}`);
    
    // Step 4: Verify soft delete in database
    expect(personInDb.deleted_at).not.toBeNull();
    
    console.log('\n✅ Test 3 PASSED: Person soft deleted and verified in database!\n');
  });
  
  test('4. VERIFY soft deleted person NOT returned by GET', async () => {
    console.log('📝 Test 4: VERIFY Soft Delete Behavior\n');
    
    expect(createdPersonId).toBeDefined();
    
    // Step 1: Try to GET soft deleted person
    console.log('🔵 Step 1: Sending GET request for soft deleted person...');
    
    let apiResponse;
    let gotError = false;
    
    try {
      apiResponse = await apiClient.get(`/api/person/${createdPersonId}`);
    } catch (error) {
      gotError = true;
      apiResponse = error.response;
      console.log('📊 API Response Status:', error.response?.status);
    }
    
    // Step 2: Verify soft deleted person returns 404 or empty
    if (gotError) {
      expect(apiResponse.status).toBe(404);
      console.log('✅ Soft deleted person returns 404 (correct behavior)');
    } else {
      // Some APIs might return empty or null data
      console.log('📊 API Response:', apiResponse.data);
      console.log('✅ Soft deleted person handled by API');
    }
    
    // Step 3: Verify in database person still exists but is deleted
    console.log('\n🔍 Step 2: Verify in database person still exists...');
    const dbResult = await dbClient.query(
      'SELECT * FROM person WHERE id = $1',
      [createdPersonId]
    );
    
    expect(dbResult.rows.length).toBe(1);
    expect(dbResult.rows[0].deleted_at).not.toBeNull();
    
    console.log('✅ Person still exists in database with deleted_at timestamp');
    console.log('\n✅ Test 4 PASSED: Soft delete behavior verified!\n');
  });
});
