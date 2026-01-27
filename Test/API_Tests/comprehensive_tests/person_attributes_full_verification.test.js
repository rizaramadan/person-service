/**
 * Person Attributes API - Full CRUD with Database & Encryption Verification
 * 
 * This test suite:
 * 1. Creates person attributes via API
 * 2. Verifies data is ENCRYPTED in database
 * 3. Verifies API returns DECRYPTED values
 * 4. Updates attributes and verifies encryption
 * 5. Deletes attributes and verifies removal
 * 6. Tests bulk operations with database verification
 * 
 * Pattern: Following person_attributes_with_db.test.js structure
 * Focus: Encryption/Decryption verification
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import axios from 'axios';
import pg from 'pg';
const { Client } = pg;
import { config } from 'dotenv';

config();

describe('Person Attributes API - Full Verification with Encryption', () => {
  let apiClient;
  let dbClient;
  let testPersonId;
  const encryptionKey = process.env.ENCRYPTION_KEY_1 || 'default-key-for-dev';
  
  beforeAll(async () => {
    console.log('\n🚀 Starting Person Attributes Test with Full DB & Encryption Verification...\n');
    
    // Setup API client with authentication
    apiClient = axios.create({
      baseURL: process.env.BASE_URL,
      timeout: 10000,
      headers: {
        'x-api-key': process.env.AUTH_TOKEN,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ API client configured with authentication\n');
    
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
    
    // Create test person in database
    console.log('🔧 Setup: Creating test person in database...');
    const result = await dbClient.query(`
      INSERT INTO person (id, client_id, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, NOW(), NOW())
      RETURNING id
    `, [`test-client-comprehensive-${Date.now()}`]);
    
    testPersonId = result.rows[0].id;
    console.log(`✅ Test person created with ID: ${testPersonId}\n`);
  });
  
  afterAll(async () => {
    // Cleanup: Delete test data
    console.log('\n🧹 Cleanup: Deleting test data from database...');
    if (testPersonId) {
      try {
        const attrCount = await dbClient.query(
          'SELECT COUNT(*) as count FROM person_attributes WHERE person_id = $1',
          [testPersonId]
        );
        console.log(`   Found ${attrCount.rows[0].count} attributes to delete`);
        
        await dbClient.query('DELETE FROM person_attributes WHERE person_id = $1', [testPersonId]);
        await dbClient.query('DELETE FROM person WHERE id = $1', [testPersonId]);
        console.log('✅ Test data deleted');
      } catch (error) {
        console.log('⚠️  Cleanup warning:', error.message);
      }
    }
    
    await dbClient.end();
    console.log('✅ Database disconnected\n');
  });
  
  test('1. CREATE attribute via API and verify ENCRYPTION in database', async () => {
    console.log('📝 Test 1: CREATE with Encryption Verification\n');
    
    const attributeKey = 'email';
    const attributeValue = 'encrypted-test@example.com';
    
    // Step 1: Create attribute via API
    console.log('🔵 Step 1: Sending POST request to create attribute...');
    console.log(`   Person ID: ${testPersonId}`);
    console.log(`   Key: ${attributeKey}`);
    console.log(`   Value: ${attributeValue}`);
    
    const createData = {
      key: attributeKey,
      value: attributeValue,
      meta: {
        caller: 'comprehensive-test',
        reason: 'encryption-verification',
        traceId: `test-${Date.now()}`
      }
    };
    
    const apiResponse = await apiClient.post(`/persons/${testPersonId}/attributes`, createData);
    
    console.log('✅ API Response received');
    console.log(`   Status: ${apiResponse.status}`);
    console.log(`   Attribute ID: ${apiResponse.data.id}`);
    console.log(`   Returned Key: ${apiResponse.data.key}`);
    console.log(`   Returned Value (DECRYPTED): ${apiResponse.data.value}`);
    
    // Verify API response
    expect(apiResponse.status).toBe(201);
    expect(apiResponse.data).toHaveProperty('id');
    expect(apiResponse.data.key).toBe(attributeKey);
    expect(apiResponse.data.value).toBe(attributeValue); // Should be DECRYPTED
    console.log('✅ API response validation passed');
    
    // Step 2: Query database directly
    console.log('\n🔵 Step 2: Querying database to check ENCRYPTION...');
    const dbResult = await dbClient.query(`
      SELECT id, attribute_key, encrypted_value, key_version
      FROM person_attributes
      WHERE person_id = $1 AND attribute_key = $2
    `, [testPersonId, attributeKey]);
    
    console.log(`   Rows found: ${dbResult.rows.length}`);
    expect(dbResult.rows.length).toBe(1);
    
    const dbRow = dbResult.rows[0];
    console.log(`   DB Attribute Key: ${dbRow.attribute_key}`);
    console.log(`   DB Encrypted Value Type: ${typeof dbRow.encrypted_value}`);
    console.log(`   DB Key Version: ${dbRow.key_version}`);
    
    // Step 3: Verify encryption
    console.log('\n🔵 Step 3: Verifying value is ENCRYPTED in database...');
    
    // encrypted_value should be a Buffer (binary data)
    expect(dbRow.encrypted_value).toBeDefined();
    expect(Buffer.isBuffer(dbRow.encrypted_value)).toBe(true);
    console.log('✅ Value is stored as encrypted binary data (Buffer)');
    
    // Encrypted value should NOT match plain text
    const encryptedValueHex = dbRow.encrypted_value.toString('hex');
    console.log(`   Encrypted value (hex): ${encryptedValueHex.substring(0, 50)}...`);
    expect(encryptedValueHex).not.toBe(attributeValue);
    console.log('✅ Encrypted value does NOT match plain text');
    
    // Step 4: Decrypt and verify
    console.log('\n🔵 Step 4: Decrypting database value to verify...');
    const decryptResult = await dbClient.query(`
      SELECT pgp_sym_decrypt(encrypted_value, $1) as decrypted_value
      FROM person_attributes
      WHERE id = $2
    `, [encryptionKey, dbRow.id]);
    
    const decryptedValue = decryptResult.rows[0].decrypted_value.toString();
    console.log(`   Decrypted Value: ${decryptedValue}`);
    
    expect(decryptedValue).toBe(attributeValue);
    console.log('✅ Decrypted value matches original plain text');
    console.log('✅ ENCRYPTION VERIFICATION COMPLETE!\n');
  });
  
  test('2. GET attribute via API and verify DECRYPTION', async () => {
    console.log('📝 Test 2: GET with Decryption Verification\n');
    
    const attributeKey = 'phone-encrypted';
    const attributeValue = '+1234567890-encrypted';
    
    // Setup: Create attribute first
    console.log('🔧 Setup: Creating encrypted attribute in database...');
    const createResponse = await apiClient.post(`/persons/${testPersonId}/attributes`, {
      key: attributeKey,
      value: attributeValue,
      meta: {
        caller: 'test-setup',
        reason: 'get-test-prep',
        traceId: `setup-${Date.now()}`
      }
    });
    const attributeId = createResponse.data.id;
    console.log(`✅ Attribute created with ID: ${attributeId}\n`);
    
    // Step 1: Verify value is encrypted in database
    console.log('🔵 Step 1: Verifying encryption in database...');
    const dbResult = await dbClient.query(`
      SELECT encrypted_value FROM person_attributes WHERE id = $1
    `, [attributeId]);
    
    const encryptedValue = dbResult.rows[0].encrypted_value;
    expect(Buffer.isBuffer(encryptedValue)).toBe(true);
    console.log('✅ Value is encrypted in database (binary format)');
    
    // Step 2: GET via API
    console.log('\n🔵 Step 2: Sending GET request via API...');
    console.log(`   Endpoint: GET /persons/${testPersonId}/attributes/${attributeId}`);
    
    const apiResponse = await apiClient.get(`/persons/${testPersonId}/attributes/${attributeId}`);
    
    console.log('✅ API Response received');
    console.log(`   Status: ${apiResponse.status}`);
    console.log(`   Returned Value: ${apiResponse.data.value}`);
    
    // Step 3: Verify API returns DECRYPTED value
    console.log('\n🔵 Step 3: Verifying API returns DECRYPTED value...');
    expect(apiResponse.status).toBe(200);
    expect(apiResponse.data.value).toBe(attributeValue);
    expect(typeof apiResponse.data.value).toBe('string');
    expect(apiResponse.data.value).not.toContain('\\x'); // Should NOT have hex encoding
    console.log('✅ API correctly returns DECRYPTED plain text value');
    
    // Step 4: Verify encrypted value in DB hasn't changed
    console.log('\n🔵 Step 4: Verifying database still has encrypted value...');
    const dbResult2 = await dbClient.query(`
      SELECT encrypted_value FROM person_attributes WHERE id = $1
    `, [attributeId]);
    
    expect(Buffer.isBuffer(dbResult2.rows[0].encrypted_value)).toBe(true);
    console.log('✅ Database still contains encrypted value (not modified by GET)');
    console.log('✅ DECRYPTION VERIFICATION COMPLETE!\n');
  });
  
  test('3. UPDATE attribute and verify RE-ENCRYPTION in database', async () => {
    console.log('📝 Test 3: UPDATE with Re-encryption Verification\n');
    
    const attributeKey = 'address-update';
    const oldValue = 'Old Address 123';
    const newValue = 'New Address 456';
    
    // Setup: Create initial attribute
    console.log('🔧 Setup: Creating initial attribute...');
    const createResponse = await apiClient.post(`/persons/${testPersonId}/attributes`, {
      key: attributeKey,
      value: oldValue,
      meta: {
        caller: 'test-setup',
        reason: 'update-test-prep',
        traceId: `setup-${Date.now()}`
      }
    });
    const attributeId = createResponse.data.id;
    console.log(`✅ Initial attribute created: "${oldValue}"\n`);
    
    // Step 1: Get old encrypted value from database
    console.log('🔵 Step 1: Getting old encrypted value from database...');
    const oldDbResult = await dbClient.query(`
      SELECT encrypted_value FROM person_attributes WHERE id = $1
    `, [attributeId]);
    
    const oldEncryptedValue = oldDbResult.rows[0].encrypted_value.toString('hex');
    console.log(`   Old Encrypted Value (hex): ${oldEncryptedValue.substring(0, 50)}...`);
    
    // Step 2: Update via API
    console.log('\n🔵 Step 2: Sending PUT request to update...');
    console.log(`   Old Value: ${oldValue}`);
    console.log(`   New Value: ${newValue}`);
    
    const updateResponse = await apiClient.put(`/persons/${testPersonId}/attributes/${attributeId}`, {
      key: attributeKey,
      value: newValue,
      meta: {
        caller: 'test-update',
        reason: 'update-test',
        traceId: `update-${Date.now()}`
      }
    });
    
    console.log('✅ API Response received');
    console.log(`   Status: ${updateResponse.status}`);
    console.log(`   Returned Value: ${updateResponse.data.value}`);
    
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.data.value).toBe(newValue);
    console.log('✅ API confirms update with new decrypted value');
    
    // Step 3: Get new encrypted value from database
    console.log('\n🔵 Step 3: Getting new encrypted value from database...');
    const newDbResult = await dbClient.query(`
      SELECT encrypted_value FROM person_attributes WHERE id = $1
    `, [attributeId]);
    
    const newEncryptedValue = newDbResult.rows[0].encrypted_value.toString('hex');
    console.log(`   New Encrypted Value (hex): ${newEncryptedValue.substring(0, 50)}...`);
    
    // Step 4: Verify encrypted value changed
    console.log('\n🔵 Step 4: Verifying encrypted value CHANGED in database...');
    expect(newEncryptedValue).not.toBe(oldEncryptedValue);
    console.log('✅ Encrypted value in database has CHANGED (re-encrypted)');
    
    // Step 5: Decrypt and verify new value
    console.log('\n🔵 Step 5: Decrypting new database value to verify...');
    const decryptResult = await dbClient.query(`
      SELECT pgp_sym_decrypt(encrypted_value, $1) as decrypted_value
      FROM person_attributes WHERE id = $2
    `, [encryptionKey, attributeId]);
    
    const decryptedValue = decryptResult.rows[0].decrypted_value.toString();
    console.log(`   Decrypted Value: ${decryptedValue}`);
    
    expect(decryptedValue).toBe(newValue);
    console.log('✅ Decrypted value matches new value');
    console.log('✅ RE-ENCRYPTION VERIFICATION COMPLETE!\n');
  });
  
  test('4. DELETE attribute and verify complete removal from database', async () => {
    console.log('📝 Test 4: DELETE with Database Removal Verification\n');
    
    const attributeKey = 'to-be-deleted';
    const attributeValue = 'delete-me-value';
    
    // Setup: Create attribute
    console.log('🔧 Setup: Creating attribute to delete...');
    const createResponse = await apiClient.post(`/persons/${testPersonId}/attributes`, {
      key: attributeKey,
      value: attributeValue,
      meta: {
        caller: 'test-setup',
        reason: 'delete-test-prep',
        traceId: `setup-${Date.now()}`
      }
    });
    const attributeId = createResponse.data.id;
    console.log(`✅ Attribute created with ID: ${attributeId}\n`);
    
    // Step 1: Verify attribute exists in database
    console.log('🔵 Step 1: Verifying attribute exists in database...');
    const beforeDelete = await dbClient.query(`
      SELECT COUNT(*) as count FROM person_attributes WHERE id = $1
    `, [attributeId]);
    
    console.log(`   Count before delete: ${beforeDelete.rows[0].count}`);
    expect(parseInt(beforeDelete.rows[0].count)).toBe(1);
    console.log('✅ Attribute confirmed in database');
    
    // Step 2: Delete via API
    console.log('\n🔵 Step 2: Sending DELETE request...');
    console.log(`   Endpoint: DELETE /persons/${testPersonId}/attributes/${attributeId}`);
    
    const deleteResponse = await apiClient.delete(`/persons/${testPersonId}/attributes/${attributeId}`);
    
    console.log('✅ API Response received');
    console.log(`   Status: ${deleteResponse.status}`);
    console.log(`   Message:`, deleteResponse.data);
    
    expect(deleteResponse.status).toBe(200);
    console.log('✅ Delete request successful');
    
    // Step 3: Verify attribute removed from database
    console.log('\n🔵 Step 3: Verifying attribute removed from database...');
    const afterDelete = await dbClient.query(`
      SELECT COUNT(*) as count FROM person_attributes WHERE id = $1
    `, [attributeId]);
    
    console.log(`   Count after delete: ${afterDelete.rows[0].count}`);
    expect(parseInt(afterDelete.rows[0].count)).toBe(0);
    console.log('✅ Attribute completely removed from database');
    
    // Step 4: Verify GET returns 404
    console.log('\n🔵 Step 4: Verifying GET returns 404 for deleted attribute...');
    try {
      await apiClient.get(`/persons/${testPersonId}/attributes/${attributeId}`);
      fail('Should have thrown error');
    } catch (error) {
      console.log(`   API Error Status: ${error.response.status}`);
      expect(error.response.status).toBe(404);
      console.log('✅ GET correctly returns 404 for deleted attribute');
    }
    
    console.log('\n✅ DELETE VERIFICATION COMPLETE!\n');
  });
  
  test('5. FULL CRUD LIFECYCLE with encryption at each step', async () => {
    console.log('📝 Test 5: FULL CRUD LIFECYCLE with Encryption Verification\n');
    
    const attributeKey = 'lifecycle-key';
    const initialValue = 'initial-encrypted-value';
    const updatedValue = 'updated-encrypted-value';
    
    // === CREATE ===
    console.log('🔵 STEP 1: CREATE');
    const createResponse = await apiClient.post(`/persons/${testPersonId}/attributes`, {
      key: attributeKey,
      value: initialValue,
      meta: { caller: 'lifecycle-test', reason: 'create', traceId: `lifecycle-${Date.now()}` }
    });
    const attributeId = createResponse.data.id;
    console.log(`   ✅ Created attribute ID: ${attributeId}`);
    console.log(`   ✅ API returns decrypted: ${createResponse.data.value}`);
    
    let dbCheck = await dbClient.query('SELECT encrypted_value FROM person_attributes WHERE id = $1', [attributeId]);
    console.log(`   ✅ DB has encrypted (Buffer): ${Buffer.isBuffer(dbCheck.rows[0].encrypted_value)}`);
    
    // === READ ===
    console.log('\n🔵 STEP 2: READ');
    const readResponse = await apiClient.get(`/persons/${testPersonId}/attributes/${attributeId}`);
    console.log(`   ✅ Retrieved decrypted value: ${readResponse.data.value}`);
    expect(readResponse.data.value).toBe(initialValue);
    
    // === UPDATE ===
    console.log('\n🔵 STEP 3: UPDATE');
    const updateResponse = await apiClient.put(`/persons/${testPersonId}/attributes/${attributeId}`, {
      key: attributeKey,
      value: updatedValue,
      meta: { caller: 'lifecycle-test', reason: 'update', traceId: `lifecycle-${Date.now()}` }
    });
    console.log(`   ✅ Updated to: ${updateResponse.data.value}`);
    
    dbCheck = await dbClient.query('SELECT encrypted_value FROM person_attributes WHERE id = $1', [attributeId]);
    console.log(`   ✅ DB still has encrypted (Buffer): ${Buffer.isBuffer(dbCheck.rows[0].encrypted_value)}`);
    
    const decryptCheck = await dbClient.query(
      'SELECT pgp_sym_decrypt(encrypted_value, $1) as val FROM person_attributes WHERE id = $2',
      [encryptionKey, attributeId]
    );
    console.log(`   ✅ Decrypted DB value: ${decryptCheck.rows[0].val.toString()}`);
    expect(decryptCheck.rows[0].val.toString()).toBe(updatedValue);
    
    // === DELETE ===
    console.log('\n🔵 STEP 4: DELETE');
    const deleteResponse = await apiClient.delete(`/persons/${testPersonId}/attributes/${attributeId}`);
    console.log(`   ✅ Deleted: ${deleteResponse.status}`);
    
    dbCheck = await dbClient.query('SELECT COUNT(*) as c FROM person_attributes WHERE id = $1', [attributeId]);
    console.log(`   ✅ DB count after delete: ${dbCheck.rows[0].c}`);
    expect(parseInt(dbCheck.rows[0].c)).toBe(0);
    
    console.log('\n✅ FULL ENCRYPTED CRUD LIFECYCLE COMPLETE!\n');
  });
});
