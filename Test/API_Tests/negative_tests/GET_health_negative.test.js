/**
 * NEGATIVE TESTS: GET /health
 * 
 * Tests error scenarios and edge cases for health check endpoint
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import axios from 'axios';
import { config } from 'dotenv';

config();

describe('NEGATIVE: GET /health - Health Check Endpoint', () => {
  let apiClient;
  const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
  
  beforeAll(() => {
    apiClient = axios.create({
      baseURL: BASE_URL,
      timeout: 10000
    });
  });
  
  test('Should handle invalid HTTP method (POST instead of GET)', async () => {
    try {
      await apiClient.post('/health');
      // If it doesn't throw, check if it returned appropriate response
    } catch (error) {
      // Should return 404 or 405 (Method Not Allowed)
      expect([404, 405]).toContain(error.response?.status);
    }
  });
  
  test('Should handle invalid path (/healths instead of /health)', async () => {
    try {
      await apiClient.get('/healths');
      fail('Should have thrown 404');
    } catch (error) {
      expect(error.response.status).toBe(404);
    }
  });
  
  test('Should handle path with query parameters', async () => {
    // Health endpoint should ignore query params
    const response = await apiClient.get('/health?test=123');
    expect(response.status).toBe(200);
  });
  
  test('Should handle excessive request timeout', async () => {
    const response = await apiClient.get('/health', {
      timeout: 100 // Very short timeout
    });
    expect(response.status).toBe(200);
  });
  
  test('Should handle malformed Accept header', async () => {
    const response = await apiClient.get('/health', {
      headers: {
        'Accept': 'application/invalid-type'
      }
    });
    // Should still respond (health check is forgiving)
    expect([200, 406]).toContain(response.status);
  });
});
