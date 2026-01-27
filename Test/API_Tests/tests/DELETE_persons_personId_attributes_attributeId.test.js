/**
 * Tests for DELETE /persons/:personId/attributes/:attributeId - Delete Attribute
 * Based on: Test/API_Tests/DELETE_persons_personId_attributes_attributeId.feature
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import axios from 'axios';
import pg from 'pg';
const { Client } = pg;
import { config } from 'dotenv';

config();

describe('DELETE /persons/:personId/attributes/:attributeId - Delete Attribute', () => {
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
    `, [`test-client-delete-${Date.now()}`]);
    testPersonId = personResult.rows[0].id;
  });
  
  afterAll(async () => {
    if (testPersonId) {
      await dbClient.query('DELETE FROM person_attributes WHERE person_id = $1', [testPersonId]);
      await dbClient.query('DELETE FROM person WHERE id = $1', [testPersonId]);
    }
    await dbClient.end();
  });
  
  test('Delete an existing attribute', async () => {
    // Create attribute
    const createResponse = await apiClient.post(`/persons/${testPersonId}/attributes`, {
      key: 'email',
      value: 'delete-me@example.com',
      meta: {
        caller: 'test-suite',
        reason: 'setup',
        traceId: `setup-${Date.now()}`
      }
    });
    const attributeId = createResponse.data.id;
    
    // Delete attribute
    const response = await apiClient.delete(`/persons/${testPersonId}/attributes/${attributeId}`);
    
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('message');
  });
  
  test('Verify attribute is deleted from database', async () => {
    // Create attribute
    const createResponse = await apiClient.post(`/persons/${testPersonId}/attributes`, {
      key: 'email',
      value: 'verify-delete@example.com',
      meta: {
        caller: 'test-suite',
        reason: 'setup',
        traceId: `setup-${Date.now()}`
      }
    });
    const attributeId = createResponse.data.id;
    
    // Delete
    await apiClient.delete(`/persons/${testPersonId}/attributes/${attributeId}`);
    
    // Try to get deleted attribute
    try {
      await apiClient.get(`/persons/${testPersonId}/attributes/${attributeId}`);
      fail('Should have thrown error');
    } catch (error) {
      expect(error.response.status).toBe(404);
    }
  });
  
  test('Delete non-existent attribute', async () => {
    try {
      await apiClient.delete(`/persons/${testPersonId}/attributes/99999`);
      fail('Should have thrown error');
    } catch (error) {
      expect(error.response.status).toBe(404);
    }
  });
  
  test('Delete without API key', async () => {
    const clientWithoutKey = axios.create({
      baseURL: BASE_URL,
      timeout: 10000
    });
    
    // Create attribute first
    const createResponse = await apiClient.post(`/persons/${testPersonId}/attributes`, {
      key: 'email',
      value: 'test@example.com',
      meta: {
        caller: 'test-suite',
        reason: 'setup',
        traceId: `setup-${Date.now()}`
      }
    });
    const attributeId = createResponse.data.id;
    
    try {
      await clientWithoutKey.delete(`/persons/${testPersonId}/attributes/${attributeId}`);
      fail('Should have thrown error');
    } catch (error) {
      expect(error.response.status).toBe(401);
    }
  });
  
  test('Full CRUD lifecycle', async () => {
    // CREATE
    const createRes = await apiClient.post(`/persons/${testPersonId}/attributes`, {
      key: 'lifecycle-email',
      value: 'lifecycle@example.com',
      meta: {
        caller: 'test-suite',
        reason: 'lifecycle-test',
        traceId: `test-${Date.now()}`
      }
    });
    expect(createRes.status).toBe(201);
    const attributeId = createRes.data.id;
    
    // READ
    const readRes = await apiClient.get(`/persons/${testPersonId}/attributes/${attributeId}`);
    expect(readRes.status).toBe(200);
    expect(readRes.data.value).toBe('lifecycle@example.com');
    
    // UPDATE
    const updateRes = await apiClient.put(`/persons/${testPersonId}/attributes/${attributeId}`, {
      key: 'lifecycle-email',
      value: 'updated@example.com',
      meta: {
        caller: 'test-suite',
        reason: 'lifecycle-test',
        traceId: `test-${Date.now()}`
      }
    });
    expect(updateRes.status).toBe(200);
    expect(updateRes.data.value).toBe('updated@example.com');
    
    // DELETE
    const deleteRes = await apiClient.delete(`/persons/${testPersonId}/attributes/${attributeId}`);
    expect(deleteRes.status).toBe(200);
    
    // Verify deleted
    try {
      await apiClient.get(`/persons/${testPersonId}/attributes/${attributeId}`);
      fail('Should have thrown error');
    } catch (error) {
      expect(error.response.status).toBe(404);
    }
  });
});
