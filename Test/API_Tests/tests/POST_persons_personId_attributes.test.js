/**
 * Tests for POST /persons/:personId/attributes - Create Person Attribute
 * Based on: Test/API_Tests/POST_persons_personId_attributes.feature
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import axios from 'axios';
import pg from 'pg';
const { Client } = pg;
import { config } from 'dotenv';

config();

describe('POST /persons/:personId/attributes - Create Attribute', () => {
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
    `, [`test-client-post-${Date.now()}`]);
    testPersonId = result.rows[0].id;
  });
  
  afterAll(async () => {
    if (testPersonId) {
      await dbClient.query('DELETE FROM person_attributes WHERE person_id = $1', [testPersonId]);
      await dbClient.query('DELETE FROM person WHERE id = $1', [testPersonId]);
    }
    await dbClient.end();
  });
  
  test('Create a single attribute', async () => {
    const response = await apiClient.post(`/persons/${testPersonId}/attributes`, {
      key: 'email',
      value: 'test@example.com',
      meta: {
        caller: 'test-suite',
        reason: 'testing',
        traceId: `test-${Date.now()}`
      }
    });
    
    expect(response.status).toBe(201);
    expect(response.data).toHaveProperty('id');
    expect(response.data.key).toBe('email');
    expect(response.data.value).toBe('test@example.com');
  });
  
  test('Create attribute without API key', async () => {
    const clientWithoutKey = axios.create({
      baseURL: BASE_URL,
      timeout: 10000
    });
    
    try {
      await clientWithoutKey.post(`/persons/${testPersonId}/attributes`, {
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
      expect(error.response.data.message).toContain('x-api-key');
    }
  });
  
  test('Create attribute with invalid API key format', async () => {
    const clientWithInvalidKey = axios.create({
      baseURL: BASE_URL,
      timeout: 10000,
      headers: {
        'x-api-key': 'invalid-key'
      }
    });
    
    try {
      await clientWithInvalidKey.post(`/persons/${testPersonId}/attributes`, {
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
  
  test('Create attribute without meta information', async () => {
    try {
      await apiClient.post(`/persons/${testPersonId}/attributes`, {
        key: 'email',
        value: 'test@example.com'
      });
      fail('Should have thrown error');
    } catch (error) {
      expect(error.response.status).toBe(400);
    }
  });
  
  test('Create attribute without key', async () => {
    try {
      await apiClient.post(`/persons/${testPersonId}/attributes`, {
        value: 'test@example.com',
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
