import { describe, it, expect, beforeEach } from '@jest/globals';
import fetch from 'node-fetch';

/**
 * Integration Tests - Key-Value Operations
 *
 * Tests interact with the service via HTTP (public I/O Layer API).
 * They verify both API responses and database state via the Dependencies Layer (DB).
 * No business logic is implemented here - only orchestration and assertions.
 */

describe.skip('Key-Value Service Integration Tests', () => {
  let serviceUrl;
  let dbClient;

  beforeEach(async () => {
    // Guard clause: ensure test environment is initialized
    if (!global.__TEST_ENV__) {
      throw new Error('Test environment not initialized');
    }

    serviceUrl = global.__TEST_ENV__.getServiceUrl();
    dbClient = global.__TEST_ENV__.getDbClient();

    // Clean database before each test
    await global.__TEST_ENV__.cleanupDatabase();
  });

  describe('POST /api/keyvalue - SetValue', () => {
    it('should set a key-value pair successfully', async () => {
      // When: POST request to set a key-value pair
      const response = await fetch(`${serviceUrl}/api/keyvalue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'test-key',
          value: 'test-value'
        })
      });

      // Then: API returns 200 OK
      expect(response.status).toBe(200);

      //check the response data
      const data = await response.json();
      expect(data.key).toBe('test-key');
      expect(data.value).toBe('test-value');

      // And: Key-value pair is stored in database
      const dbResult = await dbClient.query(
        'SELECT * FROM key_value WHERE key = $1',
        ['test-key']
      );

      expect(dbResult.rows).toHaveLength(1);
      expect(dbResult.rows[0].key).toBe('test-key');
      expect(dbResult.rows[0].value).toBe('test-value');
      expect(dbResult.rows[0].created_at).toBeDefined();
    });

    it('should update an existing key with new value', async () => {
      // Given: A key-value pair already exists in the database
      await dbClient.query(
        'INSERT INTO key_value (key, value) VALUES ($1, $2)',
        ['existing-key', 'old-value']
      );

      // When: POST request with the same key but different value
      const response = await fetch(`${serviceUrl}/api/keyvalue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'existing-key',
          value: 'new-value'
        })
      });

      // Then: API returns 200 OK
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.value).toBe('new-value');

      // And: Database reflects the updated value
      const dbResult = await dbClient.query(
        'SELECT * FROM key_value WHERE key = $1',
        ['existing-key']
      );

      expect(dbResult.rows).toHaveLength(1);
      expect(dbResult.rows[0].value).toBe('new-value');
    });
  });

  describe('GET /api/keyvalue/:key - GetValue', () => {
    it('should retrieve a value by key', async () => {
      // Given: A key-value pair exists in the database
      await dbClient.query(
        'INSERT INTO key_value (key, value) VALUES ($1, $2)',
        ['retrieve-key', 'retrieve-value']
      );

      // When: GET request to retrieve the value
      const response = await fetch(`${serviceUrl}/api/keyvalue/retrieve-key`);

      // Then: API returns 200 OK with the value
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.key).toBe('retrieve-key');
      expect(data.value).toBe('retrieve-value');
    });

    it('should return 404 when key does not exist', async () => {
      // When: GET request for a non-existent key
      const response = await fetch(`${serviceUrl}/api/keyvalue/non-existent-key`);

      // Then: API returns 404 Not Found
      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error).toMatch(/not found|not exist|no value/i);
    });

    it('should retrieve multiple different key-value pairs', async () => {
      // Given: Multiple key-value pairs in the database
      await dbClient.query(
        'INSERT INTO key_value (key, value) VALUES ($1, $2), ($3, $4), ($5, $6)',
        ['key1', 'value1', 'key2', 'value2', 'key3', 'value3']
      );

      // When: GET request for each key
      const response1 = await fetch(`${serviceUrl}/api/keyvalue/key1`);
      const response2 = await fetch(`${serviceUrl}/api/keyvalue/key2`);
      const response3 = await fetch(`${serviceUrl}/api/keyvalue/key3`);

      // Then: All requests return the correct values
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(response3.status).toBe(200);

      const data1 = await response1.json();
      const data2 = await response2.json();
      const data3 = await response3.json();

      expect(data1.value).toBe('value1');
      expect(data2.value).toBe('value2');
      expect(data3.value).toBe('value3');
    });
  });

  describe('DELETE /api/keyvalue/:key - DeleteValue', () => {
    it('should delete a key-value pair successfully', async () => {
      // Given: A key-value pair exists in the database
      await dbClient.query(
        'INSERT INTO key_value (key, value) VALUES ($1, $2)',
        ['delete-key', 'delete-value']
      );

      // When: DELETE request to remove the key
      const response = await fetch(`${serviceUrl}/api/keyvalue/delete-key`, {
        method: 'DELETE'
      });

      // Then: API returns 200 OK
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.message).toBeDefined();
      expect(data.message).toMatch(/deleted|removed|success/i);

      // And: Key-value pair is removed from database
      const dbResult = await dbClient.query(
        'SELECT * FROM key_value WHERE key = $1',
        ['delete-key']
      );

      expect(dbResult.rows).toHaveLength(0);
    });

    it('should handle delete of non-existent key gracefully', async () => {
      // When: DELETE request for a non-existent key
      const response = await fetch(`${serviceUrl}/api/keyvalue/non-existent-delete-key`, {
        method: 'DELETE'
      });

      // Then: API returns 200 OK (idempotent) or 404
      expect([200, 404]).toContain(response.status);

      // And: Database remains empty
      const dbResult = await dbClient.query(
        'SELECT COUNT(*) as count FROM key_value'
      );

      expect(dbResult.rows[0].count).toBe('0');
    });
  });

  describe('Data Consistency - Full Lifecycle', () => {
    it('should maintain consistency through Set, Get, Update, Delete cycle', async () => {
      // Step 1: Set initial value
      let response = await fetch(`${serviceUrl}/api/keyvalue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'lifecycle-key', value: 'initial' })
      });

      expect(response.status).toBe(200);

      // Step 2: Get and verify initial value
      response = await fetch(`${serviceUrl}/api/keyvalue/lifecycle-key`);
      expect(response.status).toBe(200);

      let data = await response.json();
      expect(data.value).toBe('initial');

      // Step 3: Update the value
      response = await fetch(`${serviceUrl}/api/keyvalue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'lifecycle-key', value: 'updated' })
      });

      expect(response.status).toBe(200);

      // Step 4: Get and verify updated value
      response = await fetch(`${serviceUrl}/api/keyvalue/lifecycle-key`);
      data = await response.json();
      expect(data.value).toBe('updated');

      // Step 5: Verify database state
      const dbResult = await dbClient.query(
        'SELECT * FROM key_value WHERE key = $1',
        ['lifecycle-key']
      );

      expect(dbResult.rows).toHaveLength(1);
      expect(dbResult.rows[0].value).toBe('updated');

      // Step 6: Delete the key
      response = await fetch(`${serviceUrl}/api/keyvalue/lifecycle-key`, {
        method: 'DELETE'
      });

      expect(response.status).toBe(200);

      // Step 7: Verify key no longer exists
      response = await fetch(`${serviceUrl}/api/keyvalue/lifecycle-key`);
      expect(response.status).toBe(404);

      // Step 8: Verify database is empty
      const finalDbResult = await dbClient.query(
        'SELECT COUNT(*) as count FROM key_value WHERE key = $1',
        ['lifecycle-key']
      );

      expect(finalDbResult.rows[0].count).toBe('0');
    });

    it('should handle concurrent Set operations on different keys', async () => {
      // When: Multiple Set requests for different keys simultaneously
      const requests = [
        fetch(`${serviceUrl}/api/keyvalue`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'concurrent-1', value: 'value1' })
        }),
        fetch(`${serviceUrl}/api/keyvalue`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'concurrent-2', value: 'value2' })
        }),
        fetch(`${serviceUrl}/api/keyvalue`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'concurrent-3', value: 'value3' })
        })
      ];

      const responses = await Promise.all(requests);

      // Then: All requests succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // And: All keys are in the database
      const dbResult = await dbClient.query(
        'SELECT COUNT(*) as count FROM key_value'
      );

      expect(dbResult.rows[0].count).toBe('3');
    });
  });
});
