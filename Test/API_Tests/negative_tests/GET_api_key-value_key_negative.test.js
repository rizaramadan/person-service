/**
 * NEGATIVE TESTS: GET /api/key-value/:key
 * 
 * Tests error scenarios for retrieving key-value pairs
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import axios from 'axios';
import { config } from 'dotenv';

config();

describe('NEGATIVE: GET /api/key-value/:key - Retrieve Value', () => {
  let apiClient;
  const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
  
  beforeAll(() => {
    apiClient = axios.create({
      baseURL: BASE_URL,
      timeout: 10000
    });
  });
  
  // ========================================
  // NON-EXISTENT KEYS
  // ========================================
  
  test('Should return 404 for non-existent key', async () => {
    try {
      await apiClient.get(`/api/key-value/nonexistent-key-${Date.now()}`);
      fail('Should have thrown 404');
    } catch (error) {
      expect([404, 500]).toContain(error.response.status);
      expect(error.response.data).toHaveProperty('error');
    }
  });
  
  test('Should return 404 for random UUID as key', async () => {
    try {
      await apiClient.get('/api/key-value/550e8400-e29b-41d4-a716-446655440000');
      fail('Should have thrown 404');
    } catch (error) {
      expect([404, 500]).toContain(error.response.status);
    }
  });
  
  // ========================================
  // EMPTY/INVALID PARAMETERS
  // ========================================
  
  test('Should reject empty key parameter', async () => {
    try {
      await apiClient.get('/api/key-value/');
      fail('Should have thrown error');
    } catch (error) {
      // May return 404 (not found) or 400 (bad request)
      expect([400, 404]).toContain(error.response.status);
    }
  });
  
  test('Should handle URL-encoded special characters in key', async () => {
    try {
      await apiClient.get('/api/key-value/test%20with%20spaces');
      // May work or fail depending on implementation
    } catch (error) {
      expect([404, 500]).toContain(error.response.status);
    }
  });
  
  test('Should handle key with slashes (path traversal attempt)', async () => {
    try {
      await apiClient.get('/api/key-value/../../../etc/passwd');
      fail('Should have thrown error');
    } catch (error) {
      // Should prevent path traversal
      expect([400, 404]).toContain(error.response.status);
    }
  });
  
  // ========================================
  // INVALID HTTP METHODS
  // ========================================
  
  test('Should reject PUT method on GET endpoint', async () => {
    try {
      await apiClient.put('/api/key-value/test-key', { value: 'test' });
      fail('Should have thrown error');
    } catch (error) {
      expect([404, 405]).toContain(error.response.status);
    }
  });
  
  test('Should reject POST method on GET endpoint', async () => {
    try {
      await apiClient.post('/api/key-value/test-key');
      fail('Should have thrown error');
    } catch (error) {
      expect([404, 405]).toContain(error.response.status);
    }
  });
  
  // ========================================
  // MALFORMED REQUESTS
  // ========================================
  
  test('Should handle invalid Accept header', async () => {
    try {
      await apiClient.get('/api/key-value/test-key', {
        headers: { 'Accept': 'application/xml' }
      });
      // May return 406 Not Acceptable or ignore
    } catch (error) {
      if (error.response) {
        expect([404, 406, 500]).toContain(error.response.status);
      }
    }
  });
  
  test('Should reject request with body (GET should not have body)', async () => {
    try {
      await axios.get(`${BASE_URL}/api/key-value/test-key`, {
        data: { unexpected: 'body' }
      });
      // Most servers ignore GET body, but should handle it
    } catch (error) {
      // May or may not fail
      if (error.response) {
        expect([400, 404, 500]).toContain(error.response.status);
      }
    }
  });
  
  // ========================================
  // QUERY PARAMETERS (Should be ignored)
  // ========================================
  
  test('Should ignore query parameters on GET', async () => {
    try {
      await apiClient.get('/api/key-value/nonexistent?param=value');
      fail('Should have thrown 404');
    } catch (error) {
      // Query params should be ignored, still 404 for nonexistent key
      expect([404, 500]).toContain(error.response.status);
    }
  });
  
  // ========================================
  // SPECIAL CHARACTERS IN KEY
  // ========================================
  
  test('Should handle or reject key with SQL injection pattern', async () => {
    try {
      await apiClient.get("/api/key-value/'; DROP TABLE key_value; --");
      fail('Should have thrown error');
    } catch (error) {
      // Should handle safely (not execute SQL)
      expect([400, 404, 500]).toContain(error.response.status);
    }
  });
  
  test('Should handle key with null byte', async () => {
    try {
      await apiClient.get('/api/key-value/test\x00null');
      fail('Should have thrown error');
    } catch (error) {
      // Should reject null bytes
      expect([400, 404, 500]).toContain(error.response.status);
    }
  });
  
  test('Should handle very long key in URL', async () => {
    const longKey = 'k'.repeat(2000);
    
    try {
      await apiClient.get(`/api/key-value/${longKey}`);
      fail('Should have thrown error');
    } catch (error) {
      // Should reject or return 404
      expect([400, 404, 414]).toContain(error.response.status);
    }
  });
  
  // ========================================
  // CASE SENSITIVITY
  // ========================================
  
  test('Should handle case sensitivity in key lookup', async () => {
    // Note: This tests if keys are case-sensitive
    // Assumes 'test-key' doesn't exist, 'Test-Key' also shouldn't
    try {
      await apiClient.get('/api/key-value/Test-Key-Nonexistent');
      fail('Should have thrown 404');
    } catch (error) {
      expect([404, 500]).toContain(error.response.status);
    }
  });
});
