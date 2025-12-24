import { describe, it, expect, beforeEach } from '@jest/globals';
import fetch from 'node-fetch';

/**
 * Integration Tests - I/O Layer
 *
 * Tests interact with the service via HTTP (public I/O Layer API).
 * They verify both API responses and database state via the Dependencies Layer (DB).
 * No business logic is implemented here - only orchestration and assertions.
 */

describe.skip('User Service Integration Tests', () => {
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

  describe('POST /api/users', () => {
    it('should create a user successfully', async () => {
      // When: POST request to create user
      const response = await fetch(`${serviceUrl}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'John Doe',
          email: 'john@example.com'
        })
      });

      // Then: API returns 201 Created
      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.id).toBeDefined();
      expect(data.name).toBe('John Doe');
      expect(data.email).toBe('john@example.com');

      // And: User is stored in database
      const dbResult = await dbClient.query(
        'SELECT * FROM users WHERE email = $1',
        ['john@example.com']
      );

      expect(dbResult.rows).toHaveLength(1);
      expect(dbResult.rows[0].name).toBe('John Doe');
      expect(dbResult.rows[0].email).toBe('john@example.com');
      expect(dbResult.rows[0].created_at).toBeDefined();
    });

    it('should reject duplicate email with 409 error', async () => {
      // Given: A user already exists in the database
      await dbClient.query(
        'INSERT INTO users (name, email) VALUES ($1, $2)',
        ['Alice', 'alice@example.com']
      );

      // When: POST request with the same email
      const response = await fetch(`${serviceUrl}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Alice Copy',
          email: 'alice@example.com'
        })
      });

      // Then: API returns 409 Conflict
      expect(response.status).toBe(409);

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error).toMatch(/email.*exists|already.*email|duplicate/i);
    });
  });

  describe('GET /api/users', () => {
    it('should retrieve all users', async () => {
      // Given: Multiple users in the database
      await dbClient.query(
        'INSERT INTO users (name, email) VALUES ($1, $2), ($3, $4)',
        ['User One', 'user1@example.com', 'User Two', 'user2@example.com']
      );

      // When: GET request to retrieve users
      const response = await fetch(`${serviceUrl}/api/users`);

      // Then: API returns 200 OK with all users
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(2);

      const emails = data.map(u => u.email).sort();
      expect(emails).toEqual(['user1@example.com', 'user2@example.com']);
    });

    it('should return empty list when no users exist', async () => {
      // When: GET request with no users in database
      const response = await fetch(`${serviceUrl}/api/users`);

      // Then: API returns 200 OK with empty list
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(0);
    });
  });

  describe('Data Consistency', () => {
    it('should maintain consistency between API and database', async () => {
      // Given: Create multiple users via API
      const user1Response = await fetch(`${serviceUrl}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Charlie', email: 'charlie@example.com' })
      });

      expect(user1Response.status).toBe(201);
      const user1Data = await user1Response.json();

      // When: Query database directly
      const dbResult = await dbClient.query(
        'SELECT COUNT(*) as count FROM users'
      );

      // Then: Count matches API expectation
      expect(dbResult.rows[0].count).toBe('1');

      // And: Verify the created user matches
      const userQuery = await dbClient.query(
        'SELECT * FROM users WHERE id = $1',
        [user1Data.id]
      );

      expect(userQuery.rows).toHaveLength(1);
      expect(userQuery.rows[0].email).toBe('charlie@example.com');
    });
  });
});
