/**
 * Tests for GET /persons/:personId/attributes/:attributeId - Get Single Attribute
 * Based on: Test/API_Tests/GET_persons_personId_attributes_attributeId.feature
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import axios from 'axios';
import pg from 'pg';
const { Client } = pg;
import { config } from 'dotenv';

config();

describe('GET /persons/:personId/attributes/:attributeId - Get Single Attribute', () => {
  let apiClient;
  let dbClient;
  let testPersonId;
  let testAttributeId;
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
    const personResult = await dbClient.query(`
      INSERT INTO person (id, client_id, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, NOW(), NOW())
      RETURNING id
    `, [`test-client-get-one-${Date.now()}`]);
    testPersonId = personResult.rows[0].id;
    
    // Create test attribute
    const attrResponse = await apiClient.post(`/persons/${testPersonId}/attributes`, {
      key: 'email',
      value: 'test@example.com',
      meta: {
        caller: 'test-suite',
        reason: 'setup',
        traceId: `setup-${Date.now()}`
      }
    });
    testAttributeId = attrResponse.data.id;
  });
  
  afterAll(async () => {
    if (testPersonId) {
      await dbClient.query('DELETE FROM person_attributes WHERE person_id = $1', [testPersonId]);
      await dbClient.query('DELETE FROM person WHERE id = $1', [testPersonId]);
    }
    await dbClient.end();
  });
  
  test('Get existing attribute by ID', async () => {
    const response = await apiClient.get(`/persons/${testPersonId}/attributes/${testAttributeId}`);
    
    expect(response.status).toBe(200);
    expect(response.data.id).toBe(testAttributeId);
    expect(response.data.key).toBe('email');
    expect(response.data.value).toBe('test@example.com');
  });
  
  test('Get non-existent attribute', async () => {
    try {
      await apiClient.get(`/persons/${testPersonId}/attributes/99999`);
      fail('Should have thrown error');
    } catch (error) {
      expect(error.response.status).toBe(404);
    }
  });
  
  test('Get attribute without API key', async () => {
    const clientWithoutKey = axios.create({
      baseURL: BASE_URL,
      timeout: 10000
    });
    
    try {
      await clientWithoutKey.get(`/persons/${testPersonId}/attributes/${testAttributeId}`);
      fail('Should have thrown error');
    } catch (error) {
      expect(error.response.status).toBe(401);
    }
  });
  
  test('Verify attribute value is decrypted', async () => {
    const response = await apiClient.get(`/persons/${testPersonId}/attributes/${testAttributeId}`);
    
    expect(response.status).toBe(200);
    expect(response.data.value).toBe('test@example.com');
    expect(response.data.value).not.toContain('\\x'); // Should be decrypted
  });
  
  test('Verify response includes all fields', async () => {
    const response = await apiClient.get(`/persons/${testPersonId}/attributes/${testAttributeId}`);
    
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('id');
    expect(response.data).toHaveProperty('key');
    expect(response.data).toHaveProperty('value');
    expect(response.data).toHaveProperty('createdAt');
    expect(response.data).toHaveProperty('updatedAt');
  });
});
