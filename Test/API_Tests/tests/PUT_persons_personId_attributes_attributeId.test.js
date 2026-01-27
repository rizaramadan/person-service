/**
 * Tests for PUT /persons/:personId/attributes/:attributeId - Update Attribute
 * Based on: Test/API_Tests/PUT_persons_personId_attributes_attributeId.feature
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import axios from 'axios';
import pg from 'pg';
const { Client } = pg;
import { config } from 'dotenv';

config();

describe('PUT /persons/:personId/attributes/:attributeId - Update Attribute', () => {
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
    `, [`test-client-update-${Date.now()}`]);
    testPersonId = personResult.rows[0].id;
  });
  
  afterAll(async () => {
    if (testPersonId) {
      await dbClient.query('DELETE FROM person_attributes WHERE person_id = $1', [testPersonId]);
      await dbClient.query('DELETE FROM person WHERE id = $1', [testPersonId]);
    }
    await dbClient.end();
  });
  
  test('Update attribute value only', async () => {
    // Create attribute
    const createResponse = await apiClient.post(`/persons/${testPersonId}/attributes`, {
      key: 'email',
      value: 'old@example.com',
      meta: {
        caller: 'test-suite',
        reason: 'setup',
        traceId: `setup-${Date.now()}`
      }
    });
    testAttributeId = createResponse.data.id;
    
    // Update attribute
    const response = await apiClient.put(`/persons/${testPersonId}/attributes/${testAttributeId}`, {
      key: 'email',
      value: 'new@example.com',
      meta: {
        caller: 'test-suite',
        reason: 'testing-update',
        traceId: `test-${Date.now()}`
      }
    });
    
    expect(response.status).toBe(200);
    expect(response.data.value).toBe('new@example.com');
  });
  
  test('Update non-existent attribute', async () => {
    try {
      await apiClient.put(`/persons/${testPersonId}/attributes/99999`, {
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
      expect(error.response.status).toBe(404);
    }
  });
  
  test('Update without API key', async () => {
    const clientWithoutKey = axios.create({
      baseURL: BASE_URL,
      timeout: 10000
    });
    
    try {
      await clientWithoutKey.put(`/persons/${testPersonId}/attributes/${testAttributeId}`, {
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
  
  test('Update without meta information (meta is optional for UPDATE)', async () => {
    // For UPDATE endpoint, meta is optional (unlike CREATE which requires it)
    const response = await apiClient.put(`/persons/${testPersonId}/attributes/${testAttributeId}`, {
      key: 'email',
      value: 'updated-without-meta@example.com'
    });
    
    expect(response.status).toBe(200);
    expect(response.data.value).toBe('updated-without-meta@example.com');
  });
});
