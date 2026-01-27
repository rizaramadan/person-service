/**
 * Tests for GET /persons/:personId/attributes - Get All Attributes
 * Based on: Test/API_Tests/GET_persons_personId_attributes.feature
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import axios from 'axios';
import pg from 'pg';
const { Client } = pg;
import { config } from 'dotenv';

config();

describe('GET /persons/:personId/attributes - Get All Attributes', () => {
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
    `, [`test-client-get-all-${Date.now()}`]);
    testPersonId = result.rows[0].id;
  });
  
  afterAll(async () => {
    if (testPersonId) {
      await dbClient.query('DELETE FROM person_attributes WHERE person_id = $1', [testPersonId]);
      await dbClient.query('DELETE FROM person WHERE id = $1', [testPersonId]);
    }
    await dbClient.end();
  });
  
  test('Get all attributes for person with multiple attributes', async () => {
    const metaData = {
      caller: 'test-suite',
      reason: 'testing-get-all',
      traceId: `test-${Date.now()}`
    };
    
    // Create multiple attributes
    await Promise.all([
      apiClient.post(`/persons/${testPersonId}/attributes`, {
        key: 'email',
        value: 'test@example.com',
        meta: metaData
      }),
      apiClient.post(`/persons/${testPersonId}/attributes`, {
        key: 'phone',
        value: '+1234567890',
        meta: metaData
      }),
      apiClient.post(`/persons/${testPersonId}/attributes`, {
        key: 'address',
        value: '123 Main St',
        meta: metaData
      })
    ]);
    
    // Get all attributes
    const response = await apiClient.get(`/persons/${testPersonId}/attributes`);
    
    expect(response.status).toBe(200);
    expect(Array.isArray(response.data)).toBe(true);
    expect(response.data.length).toBeGreaterThanOrEqual(3);
  });
  
  test('Get attributes without API key', async () => {
    const clientWithoutKey = axios.create({
      baseURL: BASE_URL,
      timeout: 10000
    });
    
    try {
      await clientWithoutKey.get(`/persons/${testPersonId}/attributes`);
      fail('Should have thrown error');
    } catch (error) {
      expect(error.response.status).toBe(401);
    }
  });
  
  test('Verify all attributes are decrypted', async () => {
    const response = await apiClient.get(`/persons/${testPersonId}/attributes`);
    
    expect(response.status).toBe(200);
    
    // Check no encrypted values (no \\x prefix)
    response.data.forEach(attr => {
      expect(typeof attr.value).toBe('string');
      expect(attr.value).not.toContain('\\x');
    });
  });
});
