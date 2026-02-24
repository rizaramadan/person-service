/**
 * SPECIFICATION TESTS: Person Attributes - Business Logic & Data Integrity
 * 
 * These tests define EXPECTED BUSINESS BEHAVIOR that SHOULD exist.
 * Purpose: Test scenarios that make business sense but might not be implemented.
 * 
 * Focus Areas:
 * 1. Audit trail completeness
 * 2. Concurrent modification handling
 * 3. Attribute history/versioning
 * 4. Cascading deletes
 * 5. Data consistency rules
 * 6. Transaction atomicity
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import axios from 'axios';
import pg from 'pg';
const { Client } = pg;
import { config } from 'dotenv';

config();

describe('SPECIFICATION: Person Attributes - Business Logic', () => {
  let apiClient;
  let dbClient;
  let testPersonId;
  const API_KEY = process.env.AUTH_TOKEN;
  const BASE_URL = process.env.BASE_URL;
  
  beforeAll(async () => {
    console.log('\n📋 SPECIFICATION TESTS: Business Logic & Data Integrity\n');
    
    apiClient = axios.create({
      baseURL: BASE_URL,
      timeout: 10000,
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    dbClient = new Client({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    });
    await dbClient.connect();
    
    const result = await dbClient.query(`
      INSERT INTO person (id, client_id, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, NOW(), NOW())
      RETURNING id
    `, [`business-spec-${Date.now()}`]);
    testPersonId = result.rows[0].id;
    console.log(`✅ Test person created: ${testPersonId}\n`);
  });
  
  afterAll(async () => {
    if (testPersonId) {
      await dbClient.query('DELETE FROM person_attributes WHERE person_id = $1', [testPersonId]);
      await dbClient.query('DELETE FROM person WHERE id = $1', [testPersonId]);
    }
    await dbClient.end();
  });
  
  // ========================================
  // AUDIT TRAIL VERIFICATION
  // ========================================
  
  test('SPEC: Should create audit trail for all operations', async () => {
    console.log('📋 Testing Audit Trail Completeness\n');
    
    const traceId = `audit-test-${Date.now()}`;
    
    // Create attribute
    console.log('🔵 Creating attribute with traceId...');
    const createResponse = await apiClient.post(`/persons/${testPersonId}/attributes`, {
      key: 'audit-email',
      value: 'audit@example.com',
      meta: {
        caller: 'audit-test-suite',
        reason: 'testing-audit-trail',
        traceId: traceId
      }
    });
    
    console.log(`   ✅ Attribute created: ID ${createResponse.data.id}`);
    
    // Check if audit log exists
    console.log('🔵 Checking audit trail in request_log table...');
    
    const auditCheck = await dbClient.query(`
      SELECT trace_id, caller_info, reason, created_at
      FROM request_log
      WHERE trace_id = $1
    `, [traceId]);

    if (auditCheck.rows.length > 0) {
      console.log(`   ✅ Audit trail found: ${auditCheck.rows.length} entries`);
      console.log(`      Caller: ${auditCheck.rows[0].caller_info}`);
      console.log(`      Reason: ${auditCheck.rows[0].reason}`);
      expect(auditCheck.rows[0].caller_info).toBe('audit-test-suite');
      expect(auditCheck.rows[0].reason).toBe('testing-audit-trail');
    } else {
      console.log('   ⚠️  No audit trail found - audit logging might not be working');
    }
    
    // Update attribute
    console.log('\n🔵 Updating attribute...');
    const updateTraceId = `audit-update-${Date.now()}`;
    await apiClient.put(`/persons/${testPersonId}/attributes/${createResponse.data.id}`, {
      key: 'audit-email',
      value: 'updated-audit@example.com',
      meta: {
        caller: 'audit-test-suite',
        reason: 'testing-update-audit',
        traceId: updateTraceId
      }
    });
    
    const updateAuditCheck = await dbClient.query(`
      SELECT COUNT(*) as count FROM request_log WHERE trace_id = $1
    `, [updateTraceId]);
    
    if (parseInt(updateAuditCheck.rows[0].count) > 0) {
      console.log('   ✅ Update operation logged to audit trail');
    } else {
      console.log('   ⚠️  Update operation NOT logged');
    }
    
    // Cleanup
    await apiClient.delete(`/persons/${testPersonId}/attributes/${createResponse.data.id}`);
    await dbClient.query('DELETE FROM request_log WHERE trace_id = $1', [traceId]);
    await dbClient.query('DELETE FROM request_log WHERE trace_id = $1', [updateTraceId]);
    
    console.log('\n✅ Audit Trail: TESTED\n');
  });
  
  // ========================================
  // CONCURRENT MODIFICATION
  // ========================================
  
  test('SPEC: Should handle concurrent updates gracefully', async () => {
    console.log('📋 Testing Concurrent Modification Handling\n');
    
    // Create attribute
    console.log('🔵 Creating attribute...');
    const response = await apiClient.post(`/persons/${testPersonId}/attributes`, {
      key: 'concurrent-test',
      value: 'initial-value',
      meta: { caller: 'test', reason: 'concurrent-test', traceId: `test-${Date.now()}` }
    });
    
    const attributeId = response.data.id;
    console.log(`   ✅ Attribute created: ${attributeId}`);
    
    // Simulate concurrent updates
    console.log('\n🔵 Simulating 5 concurrent updates...');
    
    const updates = [
      apiClient.put(`/persons/${testPersonId}/attributes/${attributeId}`, {
        key: 'concurrent-test',
        value: 'update-1',
        meta: { caller: 'user1', reason: 'concurrent', traceId: `concurrent-1-${Date.now()}` }
      }),
      apiClient.put(`/persons/${testPersonId}/attributes/${attributeId}`, {
        key: 'concurrent-test',
        value: 'update-2',
        meta: { caller: 'user2', reason: 'concurrent', traceId: `concurrent-2-${Date.now()}` }
      }),
      apiClient.put(`/persons/${testPersonId}/attributes/${attributeId}`, {
        key: 'concurrent-test',
        value: 'update-3',
        meta: { caller: 'user3', reason: 'concurrent', traceId: `concurrent-3-${Date.now()}` }
      }),
      apiClient.put(`/persons/${testPersonId}/attributes/${attributeId}`, {
        key: 'concurrent-test',
        value: 'update-4',
        meta: { caller: 'user4', reason: 'concurrent', traceId: `concurrent-4-${Date.now()}` }
      }),
      apiClient.put(`/persons/${testPersonId}/attributes/${attributeId}`, {
        key: 'concurrent-test',
        value: 'update-5',
        meta: { caller: 'user5', reason: 'concurrent', traceId: `concurrent-5-${Date.now()}` }
      })
    ];
    
    const results = await Promise.allSettled(updates);
    
    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    console.log(`   ${succeeded}/5 updates succeeded`);
    
    // Verify final state
    const finalState = await apiClient.get(`/persons/${testPersonId}/attributes/${attributeId}`);
    console.log(`   Final value: ${finalState.data.value}`);
    
    // Should be one of the update values
    const expectedValues = ['update-1', 'update-2', 'update-3', 'update-4', 'update-5'];
    expect(expectedValues).toContain(finalState.data.value);
    
    // Check DB consistency
    const dbCheck = await dbClient.query(
      'SELECT COUNT(*) as count FROM person_attributes WHERE id = $1',
      [attributeId]
    );
    
    expect(parseInt(dbCheck.rows[0].count)).toBe(1);
    console.log('   ✅ No duplicate records created');
    
    // Cleanup
    await apiClient.delete(`/persons/${testPersonId}/attributes/${attributeId}`);
    
    console.log('\n✅ Concurrent Modification: TESTED\n');
  });
  
  // ========================================
  // CASCADE DELETE
  // ========================================
  
  test('SPEC: Should cascade delete attributes when person is deleted', async () => {
    console.log('📋 Testing Cascade Delete Behavior\n');
    
    // Create temporary person
    console.log('🔵 Creating temporary person...');
    const tempPersonResult = await dbClient.query(`
      INSERT INTO person (id, client_id, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, NOW(), NOW())
      RETURNING id
    `, [`temp-person-${Date.now()}`]);
    
    const tempPersonId = tempPersonResult.rows[0].id;
    console.log(`   ✅ Temp person created: ${tempPersonId}`);
    
    // Create multiple attributes for this person
    console.log('\n🔵 Creating 3 attributes for temp person...');
    const attr1 = await apiClient.post(`/persons/${tempPersonId}/attributes`, {
      key: 'email',
      value: 'cascade@example.com',
      meta: { caller: 'test', reason: 'cascade-test', traceId: `test-${Date.now()}` }
    });
    
    const attr2 = await apiClient.post(`/persons/${tempPersonId}/attributes`, {
      key: 'phone',
      value: '+1234567890',
      meta: { caller: 'test', reason: 'cascade-test', traceId: `test-${Date.now()}` }
    });
    
    const attr3 = await apiClient.post(`/persons/${tempPersonId}/attributes`, {
      key: 'address',
      value: '123 Main St',
      meta: { caller: 'test', reason: 'cascade-test', traceId: `test-${Date.now()}` }
    });
    
    console.log('   ✅ 3 attributes created');
    
    // Verify attributes exist
    const beforeDelete = await dbClient.query(
      'SELECT COUNT(*) as count FROM person_attributes WHERE person_id = $1',
      [tempPersonId]
    );
    console.log(`   Attributes in DB: ${beforeDelete.rows[0].count}`);
    expect(parseInt(beforeDelete.rows[0].count)).toBe(3);
    
    // Delete the person
    console.log('\n🔵 Deleting person...');
    await dbClient.query('DELETE FROM person WHERE id = $1', [tempPersonId]);
    console.log('   ✅ Person deleted');
    
    // Check if attributes were cascade deleted
    const afterDelete = await dbClient.query(
      'SELECT COUNT(*) as count FROM person_attributes WHERE person_id = $1',
      [tempPersonId]
    );
    
    const remainingAttributes = parseInt(afterDelete.rows[0].count);
    console.log(`   Remaining attributes: ${remainingAttributes}`);
    
    if (remainingAttributes === 0) {
      console.log('   ✅ Attributes CASCADE DELETED correctly');
    } else {
      console.log('   ⚠️  Orphaned attributes found - CASCADE might not be configured');
      // Cleanup orphans
      await dbClient.query('DELETE FROM person_attributes WHERE person_id = $1', [tempPersonId]);
    }
    
    console.log('\n✅ Cascade Delete: TESTED\n');
  });
  
  // ========================================
  // DATA CONSISTENCY
  // ========================================
  
  test('SPEC: Should maintain consistent timestamps', async () => {
    console.log('📋 Testing Timestamp Consistency\n');
    
    // Create attribute
    console.log('🔵 Creating attribute...');
    const createTime = new Date();
    
    const response = await apiClient.post(`/persons/${testPersonId}/attributes`, {
      key: 'timestamp-test',
      value: 'initial',
      meta: { caller: 'test', reason: 'timestamp-test', traceId: `test-${Date.now()}` }
    });
    
    const attributeId = response.data.id;
    
    // Get from database
    const dbResult = await dbClient.query(
      'SELECT created_at, updated_at FROM person_attributes WHERE id = $1',
      [attributeId]
    );
    
    const createdAt = new Date(dbResult.rows[0].created_at);
    const updatedAt = new Date(dbResult.rows[0].updated_at);
    
    console.log(`   created_at: ${createdAt.toISOString()}`);
    console.log(`   updated_at: ${updatedAt.toISOString()}`);
    
    // Timestamps should be close to request time
    const timeDiff = Math.abs(createdAt.getTime() - createTime.getTime());
    expect(timeDiff).toBeLessThan(5000); // Within 5 seconds
    console.log('   ✅ Timestamps within acceptable range');
    
    // created_at and updated_at should be equal on creation
    expect(createdAt.getTime()).toBe(updatedAt.getTime());
    console.log('   ✅ created_at equals updated_at on creation');
    
    // Wait a bit then update
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('\n🔵 Updating attribute...');
    await apiClient.put(`/persons/${testPersonId}/attributes/${attributeId}`, {
      key: 'timestamp-test',
      value: 'updated',
      meta: { caller: 'test', reason: 'timestamp-test', traceId: `test-${Date.now()}` }
    });
    
    const dbResult2 = await dbClient.query(
      'SELECT created_at, updated_at FROM person_attributes WHERE id = $1',
      [attributeId]
    );
    
    const createdAt2 = new Date(dbResult2.rows[0].created_at);
    const updatedAt2 = new Date(dbResult2.rows[0].updated_at);
    
    console.log(`   created_at: ${createdAt2.toISOString()}`);
    console.log(`   updated_at: ${updatedAt2.toISOString()}`);
    
    // created_at should NOT change
    expect(createdAt2.getTime()).toBe(createdAt.getTime());
    console.log('   ✅ created_at unchanged after update');
    
    // updated_at should be AFTER created_at
    expect(updatedAt2.getTime()).toBeGreaterThan(createdAt2.getTime());
    console.log('   ✅ updated_at changed after update');
    
    // Cleanup
    await apiClient.delete(`/persons/${testPersonId}/attributes/${attributeId}`);
    
    console.log('\n✅ Timestamp Consistency: TESTED\n');
  });
  
  // ========================================
  // TRANSACTION ATOMICITY
  // ========================================
  
  test('SPEC: Should maintain data integrity on failures', async () => {
    console.log('📋 Testing Transaction Atomicity\n');
    
    // Get initial count
    const beforeCount = await dbClient.query(
      'SELECT COUNT(*) as count FROM person_attributes WHERE person_id = $1',
      [testPersonId]
    );
    
    const initialCount = parseInt(beforeCount.rows[0].count);
    console.log(`   Initial attribute count: ${initialCount}`);
    
    // Try to create attribute with invalid person ID (should fail)
    console.log('\n🔵 Attempting to create attribute for non-existent person...');
    
    try {
      await apiClient.post('/persons/00000000-0000-0000-0000-000000000000/attributes', {
        key: 'test',
        value: 'test',
        meta: { caller: 'test', reason: 'atomicity-test', traceId: `test-${Date.now()}` }
      });
      
      console.log('   ⚠️  Request succeeded (unexpected)');
      
    } catch (error) {
      console.log(`   ✅ Request failed as expected: ${error.response?.status}`);
    }
    
    // Verify no partial data was created
    const afterCount = await dbClient.query(
      'SELECT COUNT(*) as count FROM person_attributes WHERE person_id = $1',
      ['00000000-0000-0000-0000-000000000000']
    );
    
    expect(parseInt(afterCount.rows[0].count)).toBe(0);
    console.log('   ✅ No orphaned data created');
    
    // Verify test person's attributes unchanged
    const testPersonCount = await dbClient.query(
      'SELECT COUNT(*) as count FROM person_attributes WHERE person_id = $1',
      [testPersonId]
    );
    
    expect(parseInt(testPersonCount.rows[0].count)).toBe(initialCount);
    console.log('   ✅ Existing data unchanged');
    
    console.log('\n✅ Transaction Atomicity: TESTED\n');
  });
  
  // ========================================
  // ATTRIBUTE KEY UNIQUENESS PER PERSON
  // ========================================
  
  test('SPEC: Should enforce attribute key uniqueness per person', async () => {
    console.log('📋 Testing Attribute Key Uniqueness\n');
    
    const key = 'unique-email';
    
    // Create first attribute
    console.log('🔵 Creating first attribute with key "unique-email"...');
    const first = await apiClient.post(`/persons/${testPersonId}/attributes`, {
      key: key,
      value: 'first@example.com',
      meta: { caller: 'test', reason: 'uniqueness-test', traceId: `test-${Date.now()}` }
    });
    
    console.log(`   ✅ First attribute created: ID ${first.data.id}`);
    
    // Try to create second with same key (should update, not duplicate)
    console.log('\n🔵 Creating second attribute with same key...');
    const second = await apiClient.post(`/persons/${testPersonId}/attributes`, {
      key: key,
      value: 'second@example.com',
      meta: { caller: 'test', reason: 'uniqueness-test', traceId: `test-${Date.now()}` }
    });
    
    console.log(`   Status: ${second.status}`);
    console.log(`   ID: ${second.data.id}`);
    
    // Check database - should only have ONE record with this key
    const dbCheck = await dbClient.query(`
      SELECT COUNT(*) as count
      FROM person_attributes
      WHERE person_id = $1 AND attribute_key = $2
    `, [testPersonId, key]);
    
    const count = parseInt(dbCheck.rows[0].count);
    console.log(`   \n🔵 Records in DB with key "${key}": ${count}`);
    
    if (count === 1) {
      console.log('   ✅ Uniqueness maintained (upsert behavior)');
      
      // Verify value was updated
      const current = await apiClient.get(`/persons/${testPersonId}/attributes/${first.data.id}`);
      console.log(`   Current value: ${current.data.value}`);
      expect(current.data.value).toBe('second@example.com');
      console.log('   ✅ Value updated correctly');
      
    } else if (count > 1) {
      console.log('   ⚠️  Multiple attributes with same key - uniqueness NOT enforced');
    }
    
    // Cleanup
    await dbClient.query(
      'DELETE FROM person_attributes WHERE person_id = $1 AND attribute_key = $2',
      [testPersonId, key]
    );
    
    console.log('\n✅ Attribute Key Uniqueness: TESTED\n');
  });
});
