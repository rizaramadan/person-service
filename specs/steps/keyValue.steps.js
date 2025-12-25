/**
 * Key Value Step Definitions
 * 
 * Step definitions for the Key Value feature tests.
 * Uses jest-cucumber to bind Gherkin scenarios to Jest tests.
 */

import { loadFeature, defineFeature } from 'jest-cucumber';
import { expect, beforeEach } from '@jest/globals';
import { createTestContext, assertServiceRunning, sendPost } from './common.steps.js';
import { parseJsonResponse } from '../helpers/api.js';

const feature = loadFeature('../features/keyValue.feature', {
  loadRelativePath: true
});

defineFeature(feature, (test) => {
  let ctx;
  let dbClient;

  beforeEach(() => {
    ctx = createTestContext();
    // Store inserted data for verification
    ctx.insertedKey = null;
    ctx.insertedValue = null;
    ctx.queryResult = null;
  });

  test('Key-Value table', ({ given, when, then }) => {
    // @Given("the service is running")
    given('the service is running', () => {
      assertServiceRunning(expect);
      // Get database client from global test environment
      dbClient = global.__TEST_ENV__.getDbClient();
      expect(dbClient).toBeDefined();
    });

    // @When("I insert key {string} and value {string} directly to database")
    when(/^I insert key "([^"]*)" and value "([^"]*)" directly to database$/, async (key, value) => {
      // Store for later verification
      ctx.insertedKey = key;
      ctx.insertedValue = value;

      // Insert directly into the database
      const insertQuery = `
        INSERT INTO key_value (key, value)
        VALUES ($1, $2)
        ON CONFLICT (key) DO UPDATE 
        SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
        RETURNING key, value, created_at, updated_at
      `;
      
      const result = await dbClient.query(insertQuery, [key, value]);
      ctx.queryResult = result.rows[0];
    });

    // @Then("it should return key {string} and value {string} and created_at and updated_at should be current timestamp")
    then(/^it should return key "([^"]*)" and value "([^"]*)" and created_at and updated_at should be current timestamp$/, async (expectedKey, expectedValue) => {
      // Verify the query returned a result
      expect(ctx.queryResult).toBeDefined();
      expect(ctx.queryResult).not.toBeNull();

      // Verify key and value
      expect(ctx.queryResult.key).toBe(expectedKey);
      expect(ctx.queryResult.value).toBe(expectedValue);

      // Verify timestamps exist and are valid
      expect(ctx.queryResult.created_at).toBeDefined();
      expect(ctx.queryResult.updated_at).toBeDefined();

      // Parse timestamps
      const createdAt = new Date(ctx.queryResult.created_at);
      const updatedAt = new Date(ctx.queryResult.updated_at);

      // Verify timestamps are valid dates
      expect(createdAt.toString()).not.toBe('Invalid Date');
      expect(updatedAt.toString()).not.toBe('Invalid Date');

      // Verify timestamps are reasonable (not in the far past or future)
      // Use a 24-hour window to accommodate timezone differences between test runner and database
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const oneDayFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      expect(createdAt.getTime()).toBeGreaterThan(oneDayAgo.getTime());
      expect(createdAt.getTime()).toBeLessThan(oneDayFromNow.getTime());
      expect(updatedAt.getTime()).toBeGreaterThan(oneDayAgo.getTime());
      expect(updatedAt.getTime()).toBeLessThan(oneDayFromNow.getTime());

      // Verify created_at and updated_at are close to each other for new inserts
      const timeDiff = Math.abs(createdAt - updatedAt);
      expect(timeDiff).toBeLessThan(1000); // Should be within 1 second of each other
    });
  });

  test('Key-Value api', ({ given, when, then, and }) => {
    // @Given("the service is running")
    given('the service is running', () => {
      assertServiceRunning(expect);
      // Get database client from global test environment
      dbClient = global.__TEST_ENV__.getDbClient();
      expect(dbClient).toBeDefined();
    });

    // @When("I call the key-value api with key {string} and value {string}")
    when(/^I call the key-value api with key "([^"]*)" and value "([^"]*)"$/, async (key, value) => {
      // Store key and value for later verification
      ctx.apiKey = key;
      ctx.apiValue = value;
      
      // Call the key-value API endpoint
      await sendPost(ctx, '/api/key-value', { key, value });
      
      // Parse the response data
      if (ctx.response && ctx.response.ok) {
        ctx.apiResponse = await parseJsonResponse(ctx.response);
      } else {
        ctx.apiResponse = null;
      }
    });

    // @Then("it should respond with key {string} and value {string} and created_at and updated_at should be current timestamp")
    then(/^it should respond with key "([^"]*)" and value "([^"]*)" and created_at and updated_at should be current timestamp$/, async (expectedKey, expectedValue) => {
      // Verify the API responded successfully
      expect(ctx.response).toBeDefined();
      expect(ctx.response.status).toBe(200);
      expect(ctx.response.headers.get('content-type')).toMatch(/application\/json/);
      
      // Verify the response data
      expect(ctx.apiResponse).toBeDefined();
      expect(ctx.apiResponse).not.toBeNull();
      
      // Verify key and value
      expect(ctx.apiResponse.key).toBe(expectedKey);
      expect(ctx.apiResponse.value).toBe(expectedValue);
      
      // Verify timestamps exist and are valid
      expect(ctx.apiResponse.created_at).toBeDefined();
      expect(ctx.apiResponse.updated_at).toBeDefined();
      
      // Parse timestamps
      const createdAt = new Date(ctx.apiResponse.created_at);
      const updatedAt = new Date(ctx.apiResponse.updated_at);
      
      // Verify timestamps are valid dates
      expect(createdAt.toString()).not.toBe('Invalid Date');
      expect(updatedAt.toString()).not.toBe('Invalid Date');
      
      // Verify timestamps are reasonable (within 24 hours of current time)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const oneDayFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      expect(createdAt.getTime()).toBeGreaterThan(oneDayAgo.getTime());
      expect(createdAt.getTime()).toBeLessThan(oneDayFromNow.getTime());
      expect(updatedAt.getTime()).toBeGreaterThan(oneDayAgo.getTime());
      expect(updatedAt.getTime()).toBeLessThan(oneDayFromNow.getTime());
      
      // Verify created_at and updated_at are close to each other for new inserts
      const timeDiff = Math.abs(createdAt - updatedAt);
      expect(timeDiff).toBeLessThan(1000); // Should be within 1 second of each other
    });

    // @And("exist row in key_value table with key {string} and value {string}")
    and(/^exist row in key_value table with key "([^"]*)" and value "([^"]*)"$/, async (expectedKey, expectedValue) => {
      // Query the database to verify the row exists
      const selectQuery = `SELECT * FROM key_value WHERE key = $1`;
      const result = await dbClient.query(selectQuery, [expectedKey]);
      
      // Verify the row exists
      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rows[0]).toBeDefined();
      
      // Verify the key and value match
      expect(result.rows[0].key).toBe(expectedKey);
      expect(result.rows[0].value).toBe(expectedValue);
      
      // Verify the timestamps exist
      expect(result.rows[0].created_at).toBeDefined();
      expect(result.rows[0].updated_at).toBeDefined();
    });
  });
});

