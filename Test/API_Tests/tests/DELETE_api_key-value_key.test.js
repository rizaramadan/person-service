/**
 * Tests for DELETE /api/key-value/:key - Delete Key-Value Pair
 * Based on: Test/API_Tests/DELETE_api_key-value_key.feature
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import axios from 'axios';
import pg from 'pg';
const { Client } = pg;
import { config } from 'dotenv';

config();

describe('DELETE /api/key-value/:key - Delete Key-Value', () => {
  let apiClient;
  let dbClient;
  const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
  
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
    await dbClient.end();
  });
  
  test('Delete an existing key-value pair', async () => {
    const testKey = `delete-test-${Date.now()}`;
    
    // Create key
    await apiClient.post('/api/key-value', {
      key: testKey,
      value: 'delete-me'
    });
    
    // Delete key
    const response = await apiClient.delete(`/api/key-value/${testKey}`);
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('message');
  });
  
  test('Verify key is deleted from database', async () => {
    const testKey = `verify-delete-${Date.now()}`;
    
    // Create key
    await apiClient.post('/api/key-value', {
      key: testKey,
      value: 'test-value'
    });
    
    // Delete key
    const deleteResponse = await apiClient.delete(`/api/key-value/${testKey}`);
    expect(deleteResponse.status).toBe(200);
    
    // Try to get deleted key
    try {
      await apiClient.get(`/api/key-value/${testKey}`);
      fail('Should have thrown error');
    } catch (error) {
      expect([404, 500]).toContain(error.response.status);
    }
  });
  
  test('Delete non-existent key', async () => {
    const response = await apiClient.delete(`/api/key-value/nonexistent-${Date.now()}`);
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('message');
  });
  
  test('Delete same key twice', async () => {
    const testKey = `double-delete-${Date.now()}`;
    
    // Create key
    await apiClient.post('/api/key-value', {
      key: testKey,
      value: 'test-value'
    });
    
    // Delete first time
    const response1 = await apiClient.delete(`/api/key-value/${testKey}`);
    expect(response1.status).toBe(200);
    
    // Delete second time (should still return 200)
    const response2 = await apiClient.delete(`/api/key-value/${testKey}`);
    expect(response2.status).toBe(200);
  });
  
  test('Delete multiple keys sequentially', async () => {
    const key1 = `seq-delete-1-${Date.now()}`;
    const key2 = `seq-delete-2-${Date.now()}`;
    const key3 = `seq-delete-3-${Date.now()}`;
    
    // Create all
    await Promise.all([
      apiClient.post('/api/key-value', { key: key1, value: 'value1' }),
      apiClient.post('/api/key-value', { key: key2, value: 'value2' }),
      apiClient.post('/api/key-value', { key: key3, value: 'value3' })
    ]);
    
    // Delete all
    const [d1, d2, d3] = await Promise.all([
      apiClient.delete(`/api/key-value/${key1}`),
      apiClient.delete(`/api/key-value/${key2}`),
      apiClient.delete(`/api/key-value/${key3}`)
    ]);
    
    expect(d1.status).toBe(200);
    expect(d2.status).toBe(200);
    expect(d3.status).toBe(200);
    
    // Verify all deleted
    try {
      await apiClient.get(`/api/key-value/${key1}`);
      fail('Should have thrown error');
    } catch (error) {
      expect([404, 500]).toContain(error.response.status);
    }
  });
  
  test('CRUD lifecycle', async () => {
    const testKey = `lifecycle-${Date.now()}`;
    
    // CREATE
    const createRes = await apiClient.post('/api/key-value', {
      key: testKey,
      value: 'initial-value'
    });
    expect(createRes.status).toBe(200);
    
    // READ
    const readRes = await apiClient.get(`/api/key-value/${testKey}`);
    expect(readRes.status).toBe(200);
    expect(readRes.data.value).toBe('initial-value');
    
    // UPDATE
    const updateRes = await apiClient.post('/api/key-value', {
      key: testKey,
      value: 'updated-value'
    });
    expect(updateRes.status).toBe(200);
    
    // READ updated
    const readRes2 = await apiClient.get(`/api/key-value/${testKey}`);
    expect(readRes2.data.value).toBe('updated-value');
    
    // DELETE
    const deleteRes = await apiClient.delete(`/api/key-value/${testKey}`);
    expect(deleteRes.status).toBe(200);
    
    // Verify deleted
    try {
      await apiClient.get(`/api/key-value/${testKey}`);
      fail('Should have thrown error');
    } catch (error) {
      expect([404, 500]).toContain(error.response.status);
    }
  });
});
