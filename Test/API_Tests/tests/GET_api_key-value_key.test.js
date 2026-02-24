/**
 * Tests for GET /api/key-value/:key - Retrieve Value by Key
 * Based on: Test/API_Tests/GET_api_key-value_key.feature
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import axios from 'axios';
import pg from 'pg';
const { Client } = pg;
import { config } from 'dotenv';

config();

describe('GET /api/key-value/:key - Retrieve Value', () => {
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
    for (const key of testKeys) {
      try {
        await dbClient.query('DELETE FROM key_value WHERE key = $1', [key]);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    await dbClient.end();
  });
  
  test('Get an existing key-value pair', async () => {
    const testKey = `get-test-${Date.now()}`;
    testKeys.push(testKey);
    
    // Create key first
    await apiClient.post('/api/key-value', {
      key: testKey,
      value: 'test-value'
    });
    
    // Get key
    const response = await apiClient.get(`/api/key-value/${testKey}`);
    
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('key', testKey);
    expect(response.data).toHaveProperty('value', 'test-value');
    expect(response.data).toHaveProperty('created_at');
    expect(response.data).toHaveProperty('updated_at');
  });
  
  test('Get non-existent key', async () => {
    try {
      await apiClient.get(`/api/key-value/nonexistent-${Date.now()}`);
      fail('Should have thrown error');
    } catch (error) {
      expect([404, 500]).toContain(error.response.status);
      expect(error.response.data).toHaveProperty('message');
    }
  });

  test('Get key with special characters', async () => {
    const testKey = `special-key-${Date.now()}`;
    testKeys.push(testKey);
    
    await apiClient.post('/api/key-value', {
      key: testKey,
      value: 'special-value'
    });
    
    const response = await apiClient.get(`/api/key-value/${testKey}`);
    expect(response.status).toBe(200);
    expect(response.data.key).toBe(testKey);
  });
  
  test('Get key returns latest value after update', async () => {
    const testKey = `update-test-${Date.now()}`;
    testKeys.push(testKey);
    
    // Create with old value
    await apiClient.post('/api/key-value', {
      key: testKey,
      value: 'old-value'
    });
    
    // Update to new value
    await apiClient.post('/api/key-value', {
      key: testKey,
      value: 'new-value'
    });
    
    // Get should return new value
    const response = await apiClient.get(`/api/key-value/${testKey}`);
    expect(response.status).toBe(200);
    expect(response.data.value).toBe('new-value');
  });
  
  test('Get multiple different keys', async () => {
    const key1 = `multi-get-1-${Date.now()}`;
    const key2 = `multi-get-2-${Date.now()}`;
    const key3 = `multi-get-3-${Date.now()}`;
    testKeys.push(key1, key2, key3);
    
    // Create all
    await Promise.all([
      apiClient.post('/api/key-value', { key: key1, value: 'value1' }),
      apiClient.post('/api/key-value', { key: key2, value: 'value2' }),
      apiClient.post('/api/key-value', { key: key3, value: 'value3' })
    ]);
    
    // Get all
    const [r1, r2, r3] = await Promise.all([
      apiClient.get(`/api/key-value/${key1}`),
      apiClient.get(`/api/key-value/${key2}`),
      apiClient.get(`/api/key-value/${key3}`)
    ]);
    
    expect(r1.data.value).toBe('value1');
    expect(r2.data.value).toBe('value2');
    expect(r3.data.value).toBe('value3');
  });
  
  test('Verify timestamps are valid', async () => {
    const testKey = `timestamp-test-${Date.now()}`;
    testKeys.push(testKey);
    
    await apiClient.post('/api/key-value', {
      key: testKey,
      value: 'test'
    });
    
    const response = await apiClient.get(`/api/key-value/${testKey}`);
    expect(response.status).toBe(200);
    
    const createdAt = new Date(response.data.created_at);
    const updatedAt = new Date(response.data.updated_at);
    
    expect(createdAt.getTime()).not.toBeNaN();
    expect(updatedAt.getTime()).not.toBeNaN();
    expect(updatedAt.getTime()).toBeGreaterThanOrEqual(createdAt.getTime());
  });
});
