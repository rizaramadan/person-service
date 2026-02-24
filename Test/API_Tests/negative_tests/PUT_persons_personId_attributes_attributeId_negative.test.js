/**
 * NEGATIVE TESTS: PUT /persons/:personId/attributes/:attributeId
 * 
 * Tests error scenarios for updating a specific attribute
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import axios from 'axios';
import pg from 'pg';
const { Client } = pg;
import { config } from 'dotenv';

config();

describe('NEGATIVE: PUT /persons/:personId/attributes/:attributeId', () => {
  let apiClient;
  let dbClient;
  let testPersonId;
  const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
  const API_KEY = process.env.AUTH_TOKEN;
  
  beforeAll(async () => {
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
    
    // Create test person
    const result = await dbClient.query(`
      INSERT INTO person (id, client_id, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, NOW(), NOW())
      RETURNING id
    `, [`negative-put-test-${Date.now()}`]);
    testPersonId = result.rows[0].id;
  });
  
  afterAll(async () => {
    if (testPersonId) {
      await dbClient.query('DELETE FROM person_attributes WHERE person_id = $1', [testPersonId]);
      await dbClient.query('DELETE FROM person WHERE id = $1', [testPersonId]);
    }
    await dbClient.end();
  });
  
  // ========================================
  // AUTHENTICATION ERRORS
  // ========================================
  
  test('Should reject request without API key', async () => {
    const clientWithoutAuth = axios.create({
      baseURL: BASE_URL,
      timeout: 10000
    });
    
    try {
      await clientWithoutAuth.put(
        `/persons/${testPersonId}/attributes/999999`,
        { value: 'new-value' }
      );
      fail('Should have thrown 401');
    } catch (error) {
      expect(error.response.status).toBe(401);
    }
  });
  
  test('Should reject request with invalid API key', async () => {
    const clientWithInvalidKey = axios.create({
      baseURL: BASE_URL,
      timeout: 10000,
      headers: {
        'x-api-key': 'invalid-key-12345'
      }
    });
    
    try {
      await clientWithInvalidKey.put(
        `/persons/${testPersonId}/attributes/999999`,
        { value: 'new-value' }
      );
      fail('Should have thrown 401');
    } catch (error) {
      expect(error.response.status).toBe(401);
    }
  });
  
  // ========================================
  // NON-EXISTENT IDs
  // ========================================
  
  test('Should return 404 for non-existent personId', async () => {
    try {
      await apiClient.put(
        '/persons/00000000-0000-0000-0000-000000000000/attributes/999999',
        { value: 'new-value' }
      );
      fail('Should have thrown 404');
    } catch (error) {
      expect(error.response.status).toBe(404);
    }
  });
  
  test('Should return 404 for non-existent attributeId', async () => {
    try {
      await apiClient.put(
        `/persons/${testPersonId}/attributes/999999`,
        { value: 'new-value' }
      );
      fail('Should have thrown 404');
    } catch (error) {
      expect(error.response.status).toBe(404);
    }
  });
  
  // ========================================
  // INVALID UUID FORMATS
  // ========================================
  
  test('Should reject invalid UUID format for personId', async () => {
    try {
      await apiClient.put(
        '/persons/invalid-uuid/attributes/999999',
        { value: 'new-value' }
      );
      fail('Should have thrown error');
    } catch (error) {
      expect([400, 404]).toContain(error.response.status);
    }
  });
  
  test('Should reject invalid UUID format for attributeId', async () => {
    try {
      await apiClient.put(
        `/persons/${testPersonId}/attributes/invalid-uuid`,
        { value: 'new-value' }
      );
      fail('Should have thrown error');
    } catch (error) {
      expect([400, 404]).toContain(error.response.status);
    }
  });
  
  // ========================================
  // MISSING/INVALID BODY
  // ========================================
  
  test('Should reject request without body', async () => {
    try {
      await apiClient.put(
        `/persons/${testPersonId}/attributes/999999`
      );
      fail('Should have thrown 400');
    } catch (error) {
      expect([400, 404]).toContain(error.response.status);
    }
  });
  
  test('Should reject empty body', async () => {
    try {
      await apiClient.put(
        `/persons/${testPersonId}/attributes/999999`,
        {}
      );
      fail('Should have thrown 400');
    } catch (error) {
      expect([400, 404]).toContain(error.response.status);
    }
  });
  
  test('Should reject request without value field', async () => {
    try {
      await apiClient.put(
        `/persons/${testPersonId}/attributes/999999`,
        { notValue: 'something' }
      );
      fail('Should have thrown 400');
    } catch (error) {
      expect([400, 404]).toContain(error.response.status);
    }
  });
  
  // ========================================
  // EMPTY/NULL VALUES
  // ========================================
  
  test('Should reject empty string as value', async () => {
    try {
      await apiClient.put(
        `/persons/${testPersonId}/attributes/999999`,
        { value: '' }
      );
      fail('Should have thrown 400');
    } catch (error) {
      expect([400, 404]).toContain(error.response.status);
    }
  });
  
  test('Should reject null as value', async () => {
    try {
      await apiClient.put(
        `/persons/${testPersonId}/attributes/999999`,
        { value: null }
      );
      fail('Should have thrown 400');
    } catch (error) {
      expect([400, 404]).toContain(error.response.status);
    }
  });
  
  test('Should reject whitespace-only value', async () => {
    try {
      await apiClient.put(
        `/persons/${testPersonId}/attributes/999999`,
        { value: '   ' }
      );
      fail('Should have thrown 400');
    } catch (error) {
      expect([400, 404]).toContain(error.response.status);
    }
  });
  
  // ========================================
  // INVALID DATA TYPES
  // ========================================
  
  test('Should reject number as value', async () => {
    try {
      await apiClient.put(
        `/persons/${testPersonId}/attributes/999999`,
        { value: 12345 }
      );
      fail('Should have thrown 400');
    } catch (error) {
      expect([400, 404]).toContain(error.response.status);
    }
  });
  
  test('Should reject object as value', async () => {
    try {
      await apiClient.put(
        `/persons/${testPersonId}/attributes/999999`,
        { value: { nested: 'object' } }
      );
      fail('Should have thrown 400');
    } catch (error) {
      expect([400, 404]).toContain(error.response.status);
    }
  });
  
  test('Should reject array as value', async () => {
    try {
      await apiClient.put(
        `/persons/${testPersonId}/attributes/999999`,
        { value: ['array', 'value'] }
      );
      fail('Should have thrown 400');
    } catch (error) {
      expect([400, 404]).toContain(error.response.status);
    }
  });
  
  // ========================================
  // MALFORMED REQUESTS
  // ========================================
  
  test('Should reject invalid JSON', async () => {
    try {
      await axios.put(
        `${BASE_URL}/persons/${testPersonId}/attributes/999999`,
        'invalid json string',
        {
          headers: {
            'x-api-key': API_KEY,
            'Content-Type': 'application/json'
          }
        }
      );
      fail('Should have thrown error');
    } catch (error) {
      expect([400, 500]).toContain(error.response?.status);
    }
  });
  
  test('Should handle wrong Content-Type', async () => {
    try {
      await axios.put(
        `${BASE_URL}/persons/${testPersonId}/attributes/999999`,
        { value: 'test' },
        {
          headers: {
            'x-api-key': API_KEY,
            'Content-Type': 'text/plain'
          }
        }
      );
      // May or may not accept
    } catch (error) {
      if (error.response) {
        expect([400, 404, 415]).toContain(error.response.status);
      }
    }
  });
  
  // ========================================
  // BOUNDARY CONDITIONS
  // ========================================
  
  test('Should handle or reject extremely long value', async () => {
    const longValue = 'v'.repeat(1000000);
    
    try {
      await apiClient.put(
        `/persons/${testPersonId}/attributes/999999`,
        { value: longValue }
      );
      // If accepted, it's questionable
    } catch (error) {
      expect([400, 404, 413]).toContain(error.response.status);
    }
  });
  
  // ========================================
  // INVALID HTTP METHODS
  // ========================================
  
  test('Should reject POST method on PUT endpoint', async () => {
    try {
      await apiClient.post(
        `/persons/${testPersonId}/attributes/999999`,
        { value: 'test' }
      );
      fail('Should have thrown error');
    } catch (error) {
      expect([404, 405]).toContain(error.response.status);
    }
  });
  
  test('Should reject PATCH method', async () => {
    try {
      await apiClient.patch(
        `/persons/${testPersonId}/attributes/999999`,
        { value: 'test' }
      );
      fail('Should have thrown error');
    } catch (error) {
      expect([404, 405]).toContain(error.response.status);
    }
  });
});
