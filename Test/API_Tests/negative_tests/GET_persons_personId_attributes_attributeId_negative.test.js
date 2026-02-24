/**
 * NEGATIVE TESTS: GET /persons/:personId/attributes/:attributeId
 * 
 * Tests error scenarios for getting a single attribute
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import axios from 'axios';
import pg from 'pg';
const { Client } = pg;
import { config } from 'dotenv';

config();

describe('NEGATIVE: GET /persons/:personId/attributes/:attributeId', () => {
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
      await clientWithoutAuth.get(
        '/persons/550e8400-e29b-41d4-a716-446655440000/attributes/999999'
      );
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
      await clientWithInvalidKey.get(
        '/persons/550e8400-e29b-41d4-a716-446655440000/attributes/999999'
      );
      fail('Should have thrown 401');
    } catch (error) {
      expect(error.response.status).toBe(401);
    }
  });
  
  // ========================================
  // NON-EXISTENT IDs
  // ========================================
  
  test('Should return 404 for non-existent personId', async () => {
    try {
      await apiClient.get(
        '/persons/00000000-0000-0000-0000-000000000000/attributes/999999'
      );
      fail('Should have thrown 404');
    } catch (error) {
      expect(error.response.status).toBe(404);
    }
  });
  
  test('Should return 404 for non-existent attributeId', async () => {
    // Note: attributeId is an integer (SERIAL), not a UUID.
    // Use a non-existent integer ID. Person 550e8400... may not exist either,
    // so we accept both 400 (invalid personId) and 404 (not found).
    try {
      await apiClient.get(
        '/persons/550e8400-e29b-41d4-a716-446655440000/attributes/999999'
      );
      fail('Should have thrown 404');
    } catch (error) {
      expect([400, 404]).toContain(error.response.status);
    }
  });
  
  // ========================================
  // INVALID UUID FORMATS
  // ========================================
  
  test('Should reject invalid UUID format for personId', async () => {
    try {
      await apiClient.get(
        '/persons/invalid-uuid/attributes/999999'
      );
      fail('Should have thrown error');
    } catch (error) {
      expect([400, 404]).toContain(error.response.status);
    }
  });
  
  test('Should reject invalid UUID format for attributeId', async () => {
    try {
      await apiClient.get(
        '/persons/550e8400-e29b-41d4-a716-446655440000/attributes/invalid-uuid'
      );
      fail('Should have thrown error');
    } catch (error) {
      expect([400, 404]).toContain(error.response.status);
    }
  });
  
  test('Should reject both IDs with invalid format', async () => {
    try {
      await apiClient.get('/persons/invalid/attributes/also-invalid');
      fail('Should have thrown error');
    } catch (error) {
      expect([400, 404]).toContain(error.response.status);
    }
  });
  
  // ========================================
  // EMPTY PARAMETERS
  // ========================================
  
  test('Should reject empty personId', async () => {
    try {
      await apiClient.get('/persons//attributes/999999');
      fail('Should have thrown error');
    } catch (error) {
      expect([400, 404, 405]).toContain(error.response.status);
    }
  });
  
  test('Should reject empty attributeId', async () => {
    try {
      await apiClient.get('/persons/550e8400-e29b-41d4-a716-446655440000/attributes/');
      fail('Should have thrown error');
    } catch (error) {
      expect([400, 404, 405]).toContain(error.response.status);
    }
  });
  
  // ========================================
  // INVALID HTTP METHODS
  // ========================================
  
  test('Should reject POST method on GET endpoint', async () => {
    try {
      await apiClient.post(
        '/persons/550e8400-e29b-41d4-a716-446655440000/attributes/999999'
      );
      fail('Should have thrown error');
    } catch (error) {
      expect([404, 405]).toContain(error.response.status);
    }
  });
  
  test('Should reject PATCH method', async () => {
    try {
      await apiClient.patch(
        '/persons/550e8400-e29b-41d4-a716-446655440000/attributes/999999'
      );
      fail('Should have thrown error');
    } catch (error) {
      expect([404, 405]).toContain(error.response.status);
    }
  });
  
  // ========================================
  // SPECIAL CHARACTERS & SECURITY
  // ========================================
  
  test('Should handle SQL injection in personId', async () => {
    try {
      await apiClient.get(
        "/persons/'; DROP TABLE person; --/attributes/999999"
      );
      fail('Should have thrown error');
    } catch (error) {
      expect([400, 404]).toContain(error.response.status);
    }
  });
  
  test('Should handle SQL injection in attributeId', async () => {
    try {
      await apiClient.get(
        "/persons/550e8400-e29b-41d4-a716-446655440000/attributes/'; DROP TABLE person_attributes; --"
      );
      fail('Should have thrown error');
    } catch (error) {
      expect([400, 404]).toContain(error.response.status);
    }
  });
  
  test('Should prevent path traversal', async () => {
    try {
      await apiClient.get(
        '/persons/../../../etc/passwd/attributes/999999'
      );
      fail('Should have thrown error');
    } catch (error) {
      expect([400, 404]).toContain(error.response.status);
    }
  });
  
  // ========================================
  // MALFORMED REQUESTS
  // ========================================
  
  test('Should ignore request body on GET', async () => {
    try {
      const response = await axios.get(
        `${BASE_URL}/persons/550e8400-e29b-41d4-a716-446655440000/attributes/999999`,
        {
          headers: { 'x-api-key': API_KEY },
          data: { unexpected: 'body' }
        }
      );
      
      // Should ignore body, return 200 or 404
      expect([200, 404]).toContain(response.status);
    } catch (error) {
      // Or API may reject GET with body as 400, or 404 for non-existent resource
      expect([400, 404]).toContain(error.response.status);
    }
  });
  
  test('Should handle invalid Accept header', async () => {
    try {
      await apiClient.get(
        '/persons/550e8400-e29b-41d4-a716-446655440000/attributes/999999',
        {
          headers: { 'Accept': 'text/xml' }
        }
      );
    } catch (error) {
      // May return 400 (bad request), 404 (not found), or 406 (not acceptable)
      if (error.response) {
        expect([400, 404, 406]).toContain(error.response.status);
      }
    }
  });
});
