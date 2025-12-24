import { describe, it, expect, beforeEach } from '@jest/globals';
import fetch from 'node-fetch';

/**
 * Integration Tests - I/O Layer
 *
 * Tests interact with the service via HTTP (public I/O Layer API).
 * No business logic is implemented here - only orchestration and assertions.
 */

describe('Health Check Integration Tests', () => {
  let serviceUrl;

  beforeEach(async () => {
    // Guard clause: ensure test environment is initialized
    if (!global.__TEST_ENV__) {
      throw new Error('Test environment not initialized');
    }

    serviceUrl = global.__TEST_ENV__.getServiceUrl();
  });

  describe('GET /health', () => {
    it('should return 200 OK with health status', async () => {
      // When: GET request to health endpoint
      const response = await fetch(`${serviceUrl}/health`);

      // Then: API returns 200 OK
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.status).toBe('healthy');
    });

    it('should return valid JSON response', async () => {
      // When: GET request to health endpoint
      const response = await fetch(`${serviceUrl}/health`);

      // Then: Response is valid JSON
      expect(response.headers.get('content-type')).toMatch(/application\/json/);

      const data = await response.json();
      expect(data).toBeDefined();
      expect(typeof data).toBe('object');
    });

    it('should include service metadata in response', async () => {
      // When: GET request to health endpoint
      const response = await fetch(`${serviceUrl}/health`);

      const data = await response.json();

      // Then: Response contains expected fields
      expect(data.status).toBeDefined();
      expect(['healthy', 'unhealthy']).toContain(data.status);
    });
  });

  describe('Service Availability', () => {
    it('should be responsive to multiple health checks', async () => {
      // When: Make multiple health check requests
      const requests = Array(3).fill(null).map(() =>
        fetch(`${serviceUrl}/health`)
      );

      const responses = await Promise.all(requests);

      // Then: All requests succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    it('should not timeout during health check', async () => {
      // When: GET request with reasonable timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const response = await fetch(`${serviceUrl}/health`, {
          signal: controller.signal
        });

        // Then: Request completes and returns success
        expect(response.status).toBe(200);
      } finally {
        clearTimeout(timeoutId);
      }
    });
  });
});
