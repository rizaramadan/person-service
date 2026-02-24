/**
 * NEGATIVE TESTS: DELETE /persons/:personId/attributes/:attributeId
 * 
 * Tests error scenarios for deleting a specific attribute
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import axios from 'axios';
import pg from 'pg';
const { Client } = pg;
import { config } from 'dotenv';

config();

describe('NEGATIVE: DELETE /persons/:personId/attributes/:attributeId', () => {
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
    
    // Create test person
    const result = await dbClient.query(`
      INSERT INTO person (id, client_id, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, NOW(), NOW())
      RETURNING id
    `, [`negative-delete-test-${Date.now()}`]);
    testPersonId = result.rows[0].id;
  });
  
  afterAll(async () => {
    if (testPersonId) {
      await dbClient.query('DELETE FROM person_attributes WHERE person_id = $1', [testPersonId]);
      await dbClient.query('DELETE FROM person WHERE id = $1', [testPersonId]);
    }
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
      await clientWithoutAuth.delete(
        `/persons/${testPersonId}/attributes/999999`
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
      await clientWithInvalidKey.delete(
        `/persons/${testPersonId}/attributes/999999`
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
      await apiClient.delete(
        '/persons/00000000-0000-0000-0000-000000000000/attributes/999999'
      );
      fail('Should have thrown 404');
    } catch (error) {
      expect(error.response.status).toBe(404);
    }
  });
  
  test('Should return 404 for non-existent attributeId', async () => {
    try {
      await apiClient.delete(
        `/persons/${testPersonId}/attributes/999999`
      );
      fail('Should have thrown 404');
    } catch (error) {
      expect(error.response.status).toBe(404);
    }
  });
  
  test('Should handle DELETE of already deleted attribute (idempotent)', async () => {
    // First delete (doesn't exist)
    try {
      await apiClient.delete(
        `/persons/${testPersonId}/attributes/999998`
      );
      fail('Should have thrown 404');
    } catch (error) {
      expect(error.response.status).toBe(404);
    }

    // Second delete (still doesn't exist)
    try {
      await apiClient.delete(
        `/persons/${testPersonId}/attributes/999998`
      );
      fail('Should have thrown 404');
    } catch (error) {
      expect(error.response.status).toBe(404);
    }
  });
  
  // ========================================
  // INVALID UUID FORMATS
  // ========================================
  
  test('Should reject invalid UUID format for personId', async () => {
    try {
      await apiClient.delete(
        '/persons/invalid-uuid/attributes/999999'
      );
      fail('Should have thrown error');
    } catch (error) {
      expect([400, 404]).toContain(error.response.status);
    }
  });
  
  test('Should reject invalid UUID format for attributeId', async () => {
    try {
      await apiClient.delete(
        `/persons/${testPersonId}/attributes/invalid-uuid`
      );
      fail('Should have thrown error');
    } catch (error) {
      expect([400, 404]).toContain(error.response.status);
    }
  });
  
  test('Should reject both IDs with invalid format', async () => {
    try {
      await apiClient.delete('/persons/invalid/attributes/also-invalid');
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
      await apiClient.delete('/persons//attributes/999999');
      fail('Should have thrown error');
    } catch (error) {
      expect([400, 404, 405]).toContain(error.response.status);
    }
  });
  
  test('Should reject empty attributeId', async () => {
    try {
      await apiClient.delete(`/persons/${testPersonId}/attributes/`);
      fail('Should have thrown error');
    } catch (error) {
      expect([400, 404, 405]).toContain(error.response.status);
    }
  });
  
  // ========================================
  // REQUEST WITH BODY (Should be ignored)
  // ========================================
  
  test('Should ignore request body on DELETE', async () => {
    try {
      await apiClient.delete(
        `/persons/${testPersonId}/attributes/999997`,
        {
          data: {
            unexpected: 'body',
            shouldBe: 'ignored'
          }
        }
      );
      fail('Should have thrown 404 (attribute doesnt exist)');
    } catch (error) {
      // Body should be ignored, returns 404 because attribute doesn't exist
      expect(error.response.status).toBe(404);
    }
  });
  
  // ========================================
  // SPECIAL CHARACTERS & SECURITY
  // ========================================
  
  test('Should handle SQL injection in personId', async () => {
    try {
      await apiClient.delete(
        "/persons/'; DROP TABLE person; --/attributes/999999"
      );
      fail('Should have thrown error');
    } catch (error) {
      expect([400, 404]).toContain(error.response.status);
    }
  });
  
  test('Should handle SQL injection in attributeId', async () => {
    try {
      await apiClient.delete(
        `/persons/${testPersonId}/attributes/'; DROP TABLE person_attributes; --`
      );
      fail('Should have thrown error');
    } catch (error) {
      expect([400, 404]).toContain(error.response.status);
    }
  });
  
  test('Should prevent path traversal', async () => {
    try {
      await apiClient.delete(
        '/persons/../../../etc/passwd/attributes/999999'
      );
      fail('Should have thrown error');
    } catch (error) {
      expect([400, 404]).toContain(error.response.status);
    }
  });
  
  test('Should handle XSS payload in IDs', async () => {
    try {
      await apiClient.delete(
        `/persons/${testPersonId}/attributes/<script>alert("xss")</script>`
      );
      fail('Should have thrown error');
    } catch (error) {
      expect([400, 404]).toContain(error.response.status);
    }
  });
  
  // ========================================
  // INVALID HTTP METHODS
  // ========================================
  
  test('Should reject POST method on DELETE endpoint', async () => {
    try {
      await apiClient.post(
        `/persons/${testPersonId}/attributes/999999`
      );
      fail('Should have thrown error');
    } catch (error) {
      expect([404, 405]).toContain(error.response.status);
    }
  });
  
  test('Should reject PATCH method', async () => {
    try {
      await apiClient.patch(
        `/persons/${testPersonId}/attributes/999999`
      );
      fail('Should have thrown error');
    } catch (error) {
      expect([404, 405]).toContain(error.response.status);
    }
  });
  
  // ========================================
  // CONCURRENT DELETES
  // ========================================
  
  test('Should handle multiple concurrent DELETEs of same attribute', async () => {
    const nonExistentId = '999996';

    // Attempt 3 simultaneous deletes
    const deletes = Array(3).fill(null).map(() =>
      apiClient.delete(`/persons/${testPersonId}/attributes/${nonExistentId}`)
    );

    const results = await Promise.allSettled(deletes);

    // All should return 404 (doesn't exist)
    results.forEach(result => {
      if (result.status === 'rejected') {
        expect(result.reason.response.status).toBe(404);
      }
    });
  });
  
  // ========================================
  // HEADERS
  // ========================================
  
  test('Should ignore invalid Content-Type header on DELETE', async () => {
    try {
      await apiClient.delete(
        `/persons/${testPersonId}/attributes/999995`,
        {
          headers: {
            'Content-Type': 'application/invalid'
          }
        }
      );
      fail('Should have thrown 404');
    } catch (error) {
      // Should ignore Content-Type, return 404 (doesn't exist)
      expect(error.response.status).toBe(404);
    }
  });
});
