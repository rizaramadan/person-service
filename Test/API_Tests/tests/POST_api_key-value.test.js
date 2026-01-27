/**
 * Tests for POST /api/key-value - Create or Update Key-Value Pair
 * Based on: Test/API_Tests/POST_api_key-value.feature
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import axios from 'axios';
import pg from 'pg';
const { Client } = pg;
import { config } from 'dotenv';

config();

describe('POST /api/key-value - Create/Update Key-Value', () => {
  let apiClient;
  let dbClient;
  const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
  const testKeys = [];
  
  beforeAll(async () => {
    apiClient = axios.create({
      baseURL: BASE_URL,
      timeout: 10000
    });
    
    // Setup DB client for cleanup
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
    // Cleanup test data
    for (const key of testKeys) {
      try {
        await dbClient.query('DELETE FROM key_value WHERE key = $1', [key]);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    await dbClient.end();
  });
  
  test('Create a new key-value pair', async () => {
    const testKey = `test-key-${Date.now()}`;
    testKeys.push(testKey);
    
    const response = await apiClient.post('/api/key-value', {
      key: testKey,
      value: 'test-value'
    });
    
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('key', testKey);
    expect(response.data).toHaveProperty('value', 'test-value');
    expect(response.data).toHaveProperty('created_at');
    expect(response.data).toHaveProperty('updated_at');
  });
  
  test('Update an existing key-value pair', async () => {
    const testKey = `update-key-${Date.now()}`;
    testKeys.push(testKey);
    
    // Create first
    await apiClient.post('/api/key-value', {
      key: testKey,
      value: 'old-value'
    });
    
    // Update
    const response = await apiClient.post('/api/key-value', {
      key: testKey,
      value: 'new-value'
    });
    
    expect(response.status).toBe(200);
    expect(response.data.value).toBe('new-value');
  });
  
  test('Create key-value with special characters', async () => {
    const testKey = `special-key-${Date.now()}`;
    testKeys.push(testKey);
    
    const specialValue = 'value with spaces & special chars: @#$%';
    const response = await apiClient.post('/api/key-value', {
      key: testKey,
      value: specialValue
    });
    
    expect(response.status).toBe(200);
    expect(response.data.value).toBe(specialValue);
  });
  
  test('Missing required field - key', async () => {
    try {
      await apiClient.post('/api/key-value', {
        value: 'test-value'
      });
      fail('Should have thrown error');
    } catch (error) {
      expect(error.response.status).toBe(400);
      expect(error.response.data).toHaveProperty('error');
    }
  });
  
  test('Missing required field - value', async () => {
    try {
      await apiClient.post('/api/key-value', {
        key: 'test-key'
      });
      fail('Should have thrown error');
    } catch (error) {
      expect(error.response.status).toBe(400);
      expect(error.response.data).toHaveProperty('error');
    }
  });
  
  test('Empty key', async () => {
    try {
      await apiClient.post('/api/key-value', {
        key: '',
        value: 'test-value'
      });
      fail('Should have thrown error');
    } catch (error) {
      expect(error.response.status).toBe(400);
      expect(error.response.data).toHaveProperty('error');
    }
  });
  
  test('Empty value', async () => {
    try {
      await apiClient.post('/api/key-value', {
        key: 'test-key',
        value: ''
      });
      fail('Should have thrown error');
    } catch (error) {
      expect(error.response.status).toBe(400);
      expect(error.response.data).toHaveProperty('error');
    }
  });
  
  test('Create multiple key-value pairs', async () => {
    const key1 = `multi-key-1-${Date.now()}`;
    const key2 = `multi-key-2-${Date.now()}`;
    const key3 = `multi-key-3-${Date.now()}`;
    testKeys.push(key1, key2, key3);
    
    const responses = await Promise.all([
      apiClient.post('/api/key-value', { key: key1, value: 'value1' }),
      apiClient.post('/api/key-value', { key: key2, value: 'value2' }),
      apiClient.post('/api/key-value', { key: key3, value: 'value3' })
    ]);
    
    responses.forEach(response => {
      expect(response.status).toBe(200);
    });
  });
});
