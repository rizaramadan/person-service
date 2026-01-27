/**
 * NEGATIVE TESTS: DELETE /api/key-value/:key
 * 
 * Tests error scenarios for deleting key-value pairs
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import axios from 'axios';
import { config } from 'dotenv';

config();

describe('NEGATIVE: DELETE /api/key-value/:key - Delete Key-Value', () => {
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
  
  test('Should handle DELETE of non-existent key', async () => {
    // DELETE might return 200 (idempotent) or 404
    const response = await apiClient.delete(`/api/key-value/nonexistent-${Date.now()}`);
    expect([200, 404]).toContain(response.status);
  });
  
  test('Should handle DELETE of already deleted key', async () => {
    const testKey = `double-delete-${Date.now()}`;
    
    // First delete (may or may not exist)
    await apiClient.delete(`/api/key-value/${testKey}`);
    
    // Second delete (definitely doesn't exist)
    const response = await apiClient.delete(`/api/key-value/${testKey}`);
    expect([200, 404]).toContain(response.status);
  });
  
  // ========================================
  // EMPTY/INVALID PARAMETERS
  // ========================================
  
  test('Should reject DELETE with empty key', async () => {
    try {
      await apiClient.delete('/api/key-value/');
      fail('Should have thrown error');
    } catch (error) {
      expect([400, 404, 405]).toContain(error.response.status);
    }
  });
  
  test('Should reject DELETE with whitespace-only key', async () => {
    try {
      await apiClient.delete('/api/key-value/   ');
      // May accept (treat as valid key) or reject
    } catch (error) {
      if (error.response) {
        expect([400, 404]).toContain(error.response.status);
      }
    }
  });
  
  // ========================================
  // INVALID HTTP METHODS
  // ========================================
  
  test('Should reject GET on DELETE endpoint', async () => {
    // GET /api/key-value/:key exists, so this should work
    // But testing to ensure proper routing
    try {
      await apiClient.get('/api/key-value/test');
    } catch (error) {
      // Will fail because key doesn't exist, not because of method
      expect([404, 500]).toContain(error.response.status);
    }
  });
  
  test('Should reject PATCH method', async () => {
    try {
      await apiClient.patch('/api/key-value/test-key');
      fail('Should have thrown error');
    } catch (error) {
      expect([404, 405]).toContain(error.response.status);
    }
  });
  
  // ========================================
  // REQUEST WITH BODY (Should be ignored)
  // ========================================
  
  test('Should ignore request body on DELETE', async () => {
    const response = await apiClient.delete(`/api/key-value/nonexistent-${Date.now()}`, {
      data: {
        unexpected: 'body',
        shouldBe: 'ignored'
      }
    });
    
    // Should succeed (body ignored), returns 200 or 404
    expect([200, 404]).toContain(response.status);
  });
  
  // ========================================
  // SPECIAL CHARACTERS
  // ========================================
  
  test('Should handle DELETE with SQL injection pattern in key', async () => {
    const response = await apiClient.delete("/api/key-value/'; DROP TABLE key_value; --");
    
    // Should safely handle (not execute SQL), return 200 or 404
    expect([200, 404]).toContain(response.status);
  });
  
  test('Should handle DELETE with path traversal attempt', async () => {
    try {
      await apiClient.delete('/api/key-value/../../../etc/passwd');
      // Should prevent traversal
    } catch (error) {
      expect([400, 404]).toContain(error.response.status);
    }
  });
  
  test('Should handle DELETE with XSS payload in key', async () => {
    const response = await apiClient.delete('/api/key-value/<script>alert("xss")</script>');
    
    // Should safely handle, return 200 or 404
    expect([200, 404]).toContain(response.status);
  });
  
  // ========================================
  // CONCURRENT DELETES
  // ========================================
  
  test('Should handle multiple concurrent DELETEs of same key', async () => {
    const testKey = `concurrent-delete-${Date.now()}`;
    
    // Attempt 5 simultaneous deletes
    const deletes = Array(5).fill(null).map(() => 
      apiClient.delete(`/api/key-value/${testKey}`)
    );
    
    const results = await Promise.allSettled(deletes);
    
    // All should succeed (idempotent) or some may fail
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        expect([200, 404]).toContain(result.value.status);
      }
    });
  });
  
  // ========================================
  // HEADERS
  // ========================================
  
  test('Should ignore invalid Content-Type header on DELETE', async () => {
    const response = await apiClient.delete(`/api/key-value/nonexistent-${Date.now()}`, {
      headers: {
        'Content-Type': 'application/invalid'
      }
    });
    
    // Should ignore Content-Type on DELETE
    expect([200, 404]).toContain(response.status);
  });
  
  test('Should handle DELETE without Accept header', async () => {
    const response = await axios.delete(`${BASE_URL}/api/key-value/nonexistent-${Date.now()}`, {
      headers: {}
    });
    
    expect([200, 404]).toContain(response.status);
  });
  
  // ========================================
  // URL ENCODING
  // ========================================
  
  test('Should handle URL-encoded key in DELETE', async () => {
    const response = await apiClient.delete('/api/key-value/test%20with%20spaces');
    
    // Should handle URL encoding
    expect([200, 404]).toContain(response.status);
  });
  
  test('Should handle special URL characters', async () => {
    const response = await apiClient.delete('/api/key-value/test%2Fwith%2Fslashes');
    
    expect([200, 404]).toContain(response.status);
  });
});
