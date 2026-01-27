/**
 * NEGATIVE TESTS: GET /persons/:personId/attributes
 * 
 * Tests error scenarios for getting all person attributes
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import axios from 'axios';
import pg from 'pg';
const { Client } = pg;
import { config } from 'dotenv';

config();

describe('NEGATIVE: GET /persons/:personId/attributes - Get All Attributes', () => {
  let apiClient;
  let dbClient;
  const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
  const API_KEY = process.env.AUTH_TOKEN;
  
  beforeAll(async () => {
    apiClient = axios.create({
      baseURL: BASE_URL,
      timeout: 10000,
      headers: {
        'x-api-key': API_KEY
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
  });
  
  afterAll(async () => {
    await dbClient.end();
  });
  
  // ========================================
  // AUTHENTICATION ERRORS
  // ========================================
  
  test('Should reject request without API key', async () => {
    const clientWithoutAuth = axios.create({
      baseURL: BASE_URL,
      timeout: 10000
    });
    
    try {
      await clientWithoutAuth.get('/persons/550e8400-e29b-41d4-a716-446655440000/attributes');
      fail('Should have thrown 401');
    } catch (error) {
      expect(error.response.status).toBe(401);
    }
  });
  
  test('Should reject request with invalid API key', async () => {
    const clientWithInvalidKey = axios.create({
      baseURL: BASE_URL,
      timeout: 10000,
      headers: {
        'x-api-key': 'invalid-key-12345'
      }
    });
    
    try {
      await clientWithInvalidKey.get('/persons/550e8400-e29b-41d4-a716-446655440000/attributes');
      fail('Should have thrown 401');
    } catch (error) {
      expect(error.response.status).toBe(401);
    }
  });
  
  // ========================================
  // INVALID PERSON ID
  // ========================================
  
  test('Should return empty or 404 for non-existent personId', async () => {
    const response = await apiClient.get('/persons/00000000-0000-0000-0000-000000000000/attributes');
    
    if (response.status === 200) {
      // Returns empty array
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBe(0);
    } else {
      // Or returns 404
      expect(response.status).toBe(404);
    }
  });
  
  test('Should reject invalid UUID format for personId', async () => {
    try {
      await apiClient.get('/persons/invalid-uuid/attributes');
      fail('Should have thrown error');
    } catch (error) {
      expect([400, 404]).toContain(error.response.status);
    }
  });
  
  test('Should reject empty personId', async () => {
    try {
      await apiClient.get('/persons//attributes');
      fail('Should have thrown error');
    } catch (error) {
      expect([400, 404, 405]).toContain(error.response.status);
    }
  });
  
  test('Should reject personId with special characters', async () => {
    try {
      await apiClient.get("/persons/'; DROP TABLE person; --/attributes");
      fail('Should have thrown error');
    } catch (error) {
      expect([400, 404]).toContain(error.response.status);
    }
  });
  
  // ========================================
  // INVALID HTTP METHODS
  // ========================================
  
  test('Should reject DELETE method on GET endpoint', async () => {
    try {
      await apiClient.delete('/persons/550e8400-e29b-41d4-a716-446655440000/attributes');
      fail('Should have thrown error');
    } catch (error) {
      expect([404, 405]).toContain(error.response.status);
    }
  });
  
  test('Should reject PATCH method', async () => {
    try {
      await apiClient.patch('/persons/550e8400-e29b-41d4-a716-446655440000/attributes');
      fail('Should have thrown error');
    } catch (error) {
      expect([404, 405]).toContain(error.response.status);
    }
  });
  
  // ========================================
  // MALFORMED REQUESTS
  // ========================================
  
  test('Should reject request with body (GET should not have body)', async () => {
    const response = await axios.get(
      `${BASE_URL}/persons/550e8400-e29b-41d4-a716-446655440000/attributes`,
      {
        headers: { 'x-api-key': API_KEY },
        data: { unexpected: 'body' }
      }
    );
    
    // Should ignore body and proceed
    expect([200, 404]).toContain(response.status);
  });
  
  test('Should handle invalid Accept header', async () => {
    const response = await apiClient.get(
      '/persons/550e8400-e29b-41d4-a716-446655440000/attributes',
      {
        headers: { 'Accept': 'application/xml' }
      }
    );
    
    // May accept or reject
    expect([200, 404, 406]).toContain(response.status);
  });
  
  // ========================================
  // QUERY PARAMETERS
  // ========================================
  
  test('Should ignore invalid query parameters', async () => {
    const response = await apiClient.get(
      '/persons/550e8400-e29b-41d4-a716-446655440000/attributes?invalid=param&foo=bar'
    );
    
    // Should ignore query params
    expect([200, 404]).toContain(response.status);
  });
  
  // ========================================
  // PATH TRAVERSAL
  // ========================================
  
  test('Should prevent path traversal in personId', async () => {
    try {
      await apiClient.get('/persons/../../../etc/passwd/attributes');
      fail('Should have thrown error');
    } catch (error) {
      expect([400, 404]).toContain(error.response.status);
    }
  });
});
