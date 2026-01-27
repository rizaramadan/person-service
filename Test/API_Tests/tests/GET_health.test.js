/**
 * Tests for GET /health - Health Check API
 * Based on: Test/API_Tests/GET_health.feature
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import axios from 'axios';
import { config } from 'dotenv';

config();

describe('GET /health - Health Check API', () => {
  let apiClient;
  const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
  
  beforeAll(() => {
    apiClient = axios.create({
      baseURL: BASE_URL,
      timeout: 10000
    });
  });
  
  test('Health endpoint returns 200 OK', async () => {
    const response = await apiClient.get('/health');
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
  });
  
  test('Health response contains status field', async () => {
    const response = await apiClient.get('/health');
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('status');
  });
  
  test('Health response is valid JSON', async () => {
    const response = await apiClient.get('/health');
    expect(response.status).toBe(200);
    expect(typeof response.data).toBe('object');
  });
  
  test('Health check responds within acceptable time', async () => {
    const startTime = Date.now();
    const response = await apiClient.get('/health');
    const duration = Date.now() - startTime;
    
    expect(response.status).toBe(200);
    expect(duration).toBeLessThan(1000); // Less than 1 second
  });
  
  test('Multiple health checks are consistent', async () => {
    const responses = await Promise.all([
      apiClient.get('/health'),
      apiClient.get('/health'),
      apiClient.get('/health'),
      apiClient.get('/health'),
      apiClient.get('/health')
    ]);
    
    responses.forEach(response => {
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status');
    });
  });
  
  test('Health check does not timeout', async () => {
    const response = await apiClient.get('/health', {
      timeout: 5000
    });
    expect(response.status).toBe(200);
  });
});
