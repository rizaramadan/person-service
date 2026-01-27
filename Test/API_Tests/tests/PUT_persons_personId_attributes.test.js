/**
 * Tests for PUT /persons/:personId/attributes - Create/Update Single Attribute
 * Based on: Test/API_Tests/PUT_persons_personId_attributes.feature
 * Note: This endpoint uses the same handler as POST, so it creates/updates single attributes
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import axios from 'axios';
import pg from 'pg';
const { Client } = pg;
import { config } from 'dotenv';

config();

describe('PUT /persons/:personId/attributes - Create/Update Single Attribute', () => {
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
    const personResult = await dbClient.query(`
      INSERT INTO person (id, client_id, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, NOW(), NOW())
      RETURNING id
    `, [`test-client-bulk-${Date.now()}`]);
    testPersonId = personResult.rows[0].id;
  });
  
  afterAll(async () => {
    if (testPersonId) {
      await dbClient.query('DELETE FROM person_attributes WHERE person_id = $1', [testPersonId]);
      await dbClient.query('DELETE FROM person WHERE id = $1', [testPersonId]);
    }
    await dbClient.end();
  });
  
  test('Create/update attribute using PUT', async () => {
    const response = await apiClient.put(`/persons/${testPersonId}/attributes`, {
      key: 'email',
      value: 'bulk@example.com',
      meta: {
        caller: 'test-suite',
        reason: 'bulk-test',
        traceId: `test-${Date.now()}`
      }
    });
    
    expect(response.status).toBe(201);
    expect(response.data).toHaveProperty('key', 'email');
    expect(response.data).toHaveProperty('value', 'bulk@example.com');
  });
  
  test('Update existing attribute using PUT', async () => {
    // Create attribute first
    await apiClient.put(`/persons/${testPersonId}/attributes`, {
      key: 'update-email',
      value: 'old@example.com',
      meta: {
        caller: 'test-suite',
        reason: 'setup',
        traceId: `setup-${Date.now()}`
      }
    });
    
    // Update
    const response = await apiClient.put(`/persons/${testPersonId}/attributes`, {
      key: 'update-email',
      value: 'new@example.com',
      meta: {
        caller: 'test-suite',
        reason: 'update-test',
        traceId: `test-${Date.now()}`
      }
    });
    
    expect(response.status).toBe(201); // PUT creates/updates, returns 201
    expect(response.data.value).toBe('new@example.com');
  });
  
  test('PUT creates new attribute if not exists', async () => {
    const response = await apiClient.put(`/persons/${testPersonId}/attributes`, {
      key: 'new-key',
      value: 'new-value',
      meta: {
        caller: 'test-suite',
        reason: 'mixed-test',
        traceId: `test-${Date.now()}`
      }
    });
    
    expect(response.status).toBe(201);
    expect(response.data.key).toBe('new-key');
    expect(response.data.value).toBe('new-value');
  });
  
  test('PUT without API key', async () => {
    const clientWithoutKey = axios.create({
      baseURL: BASE_URL,
      timeout: 10000
    });
    
    try {
      await clientWithoutKey.put(`/persons/${testPersonId}/attributes`, {
        key: 'email',
        value: 'test@example.com',
        meta: {
          caller: 'test-suite',
          reason: 'testing',
          traceId: `test-${Date.now()}`
        }
      });
      fail('Should have thrown error');
    } catch (error) {
      expect(error.response.status).toBe(401);
    }
  });
  
  test('PUT without meta', async () => {
    try {
      await apiClient.put(`/persons/${testPersonId}/attributes`, {
        key: 'email',
        value: 'test@example.com'
      });
      fail('Should have thrown error');
    } catch (error) {
      expect(error.response.status).toBe(400);
    }
  });
  
  test('PUT with empty key', async () => {
    try {
      await apiClient.put(`/persons/${testPersonId}/attributes`, {
        key: '',
        value: 'test-value',
        meta: {
          caller: 'test-suite',
          reason: 'testing',
          traceId: `test-${Date.now()}`
        }
      });
      fail('Should have thrown error');
    } catch (error) {
      expect(error.response.status).toBe(400);
    }
  });
});
