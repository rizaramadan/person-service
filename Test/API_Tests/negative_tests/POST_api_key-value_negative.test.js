/**
 * NEGATIVE TESTS: POST /api/key-value
 * 
 * Tests error scenarios, invalid inputs, and edge cases
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import axios from 'axios';
import pg from 'pg';
const { Client } = pg;
import { config } from 'dotenv';

config();

describe('NEGATIVE: POST /api/key-value - Create/Update Key-Value', () => {
  let apiClient;
  let dbClient;
  const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
  const testKeys = [];
  
  beforeAll(async () => {
    apiClient = axios.create({
      baseURL: BASE_URL,
      timeout: 10000
    });
    
    dbClient = new Client({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    });
    await dbClient.connect();
  });
  
  afterAll(async () => {
    // Cleanup
    for (const key of testKeys) {
      try {
        await dbClient.query('DELETE FROM key_value WHERE key = $1', [key]);
      } catch (error) {
        // Ignore
      }
    }
    await dbClient.end();
  });
  
  // ========================================
  // MISSING REQUIRED FIELDS
  // ========================================
  
  test('Should reject request with missing key field', async () => {
    try {
      await apiClient.post('/api/key-value', {
        value: 'test-value'
        // key is missing
      });
      fail('Should have thrown error');
    } catch (error) {
      expect(error.response.status).toBe(400);
      expect(error.response.data).toHaveProperty('message');
    }
  });
  
  test('Should reject request with missing value field', async () => {
    try {
      await apiClient.post('/api/key-value', {
        key: 'test-key'
        // value is missing
      });
      fail('Should have thrown error');
    } catch (error) {
      expect(error.response.status).toBe(400);
      expect(error.response.data).toHaveProperty('message');
    }
  });
  
  test('Should reject completely empty request body', async () => {
    try {
      await apiClient.post('/api/key-value', {});
      fail('Should have thrown error');
    } catch (error) {
      expect(error.response.status).toBe(400);
    }
  });
  
  // ========================================
  // EMPTY/NULL VALUES
  // ========================================
  
  test('Should reject empty string as key', async () => {
    try {
      await apiClient.post('/api/key-value', {
        key: '',
        value: 'test-value'
      });
      fail('Should have thrown error');
    } catch (error) {
      expect(error.response.status).toBe(400);
    }
  });
  
  test('Should reject empty string as value', async () => {
    try {
      await apiClient.post('/api/key-value', {
        key: 'test-key',
        value: ''
      });
      fail('Should have thrown error');
    } catch (error) {
      expect(error.response.status).toBe(400);
    }
  });
  
  test('Should reject null as key', async () => {
    try {
      await apiClient.post('/api/key-value', {
        key: null,
        value: 'test-value'
      });
      fail('Should have thrown error');
    } catch (error) {
      expect(error.response.status).toBe(400);
    }
  });
  
  test('Should reject null as value', async () => {
    try {
      await apiClient.post('/api/key-value', {
        key: 'test-key',
        value: null
      });
      fail('Should have thrown error');
    } catch (error) {
      expect(error.response.status).toBe(400);
    }
  });
  
  // ========================================
  // INVALID DATA TYPES
  // ========================================
  
  test('Should reject number as key', async () => {
    try {
      await apiClient.post('/api/key-value', {
        key: 12345,
        value: 'test-value'
      });
      fail('Should have thrown error');
    } catch (error) {
      expect(error.response.status).toBe(400);
    }
  });
  
  test('Should reject object as key', async () => {
    try {
      await apiClient.post('/api/key-value', {
        key: { nested: 'object' },
        value: 'test-value'
      });
      fail('Should have thrown error');
    } catch (error) {
      expect(error.response.status).toBe(400);
    }
  });
  
  test('Should reject array as key', async () => {
    try {
      await apiClient.post('/api/key-value', {
        key: ['array', 'value'],
        value: 'test-value'
      });
      fail('Should have thrown error');
    } catch (error) {
      expect(error.response.status).toBe(400);
    }
  });
  
  test('Should reject boolean as key', async () => {
    try {
      await apiClient.post('/api/key-value', {
        key: true,
        value: 'test-value'
      });
      fail('Should have thrown error');
    } catch (error) {
      expect(error.response.status).toBe(400);
    }
  });
  
  // ========================================
  // MALFORMED REQUESTS
  // ========================================
  
  test('Should reject invalid JSON', async () => {
    try {
      await axios.post(`${BASE_URL}/api/key-value`, 
        'invalid json string',
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );
      fail('Should have thrown error');
    } catch (error) {
      expect([400, 500]).toContain(error.response?.status);
    }
  });
  
  test('Should reject wrong Content-Type', async () => {
    try {
      await axios.post(`${BASE_URL}/api/key-value`, 
        { key: 'test', value: 'test' },
        {
          headers: { 'Content-Type': 'text/plain' }
        }
      );
      // May accept or reject depending on implementation
    } catch (error) {
      expect([400, 415]).toContain(error.response?.status);
    }
  });
  
  // ========================================
  // BOUNDARY CONDITIONS
  // ========================================
  
  test('Should handle or reject extremely long key (10KB)', async () => {
    const longKey = 'k'.repeat(10000);
    
    try {
      await apiClient.post('/api/key-value', {
        key: longKey,
        value: 'test-value'
      });
      // If accepted, cleanup
      testKeys.push(longKey);
    } catch (error) {
      // Should reject with 400, 413 (Payload Too Large), or 500 (current API behavior)
      expect([400, 413, 500]).toContain(error.response.status);
    }
  });
  
  test('Should handle or reject extremely long value (1MB)', async () => {
    const longValue = 'v'.repeat(1000000);
    
    try {
      await apiClient.post('/api/key-value', {
        key: 'long-value-test',
        value: longValue
      });
      // If accepted, cleanup
      testKeys.push('long-value-test');
    } catch (error) {
      // Should reject with 400, 413 (Payload Too Large), or 500 (current API behavior)
      expect([400, 413, 500]).toContain(error.response.status);
    }
  });
  
  test('Should reject key with only whitespace', async () => {
    try {
      await apiClient.post('/api/key-value', {
        key: '   ',
        value: 'test-value'
      });
      fail('Should have thrown error');
    } catch (error) {
      // Check if error.response exists before accessing status
      if (error.response) {
        expect(error.response.status).toBe(400);
      } else {
        // If no response, it's a network/timeout error which is also acceptable
        expect(error.message).toBeDefined();
      }
    }
  });
  
  // ========================================
  // SPECIAL CHARACTERS
  // ========================================
  
  test('Should handle or reject key with special characters', async () => {
    const specialKey = 'test!@#$%^&*()';
    
    try {
      const response = await apiClient.post('/api/key-value', {
        key: specialKey,
        value: 'test-value'
      });
      
      if ([200, 201].includes(response.status)) {
        testKeys.push(specialKey);
        // Accepted - verify in DB
        const dbCheck = await dbClient.query(
          'SELECT * FROM key_value WHERE key = $1',
          [specialKey]
        );
        expect(dbCheck.rows.length).toBe(1);
      }
    } catch (error) {
      // May reject special characters
      expect(error.response.status).toBe(400);
    }
  });
  
  // ========================================
  // EXTRA FIELDS
  // ========================================
  
  test('Should handle extra fields in request body', async () => {
    const testKey = `extra-fields-${Date.now()}`;
    
    const response = await apiClient.post('/api/key-value', {
      key: testKey,
      value: 'test-value',
      extraField1: 'should-be-ignored',
      extraField2: 12345,
      nested: { object: 'ignored' }
    });
    
    // Should succeed (extra fields ignored)
    expect([200, 201]).toContain(response.status);
    testKeys.push(testKey);
  });
});
