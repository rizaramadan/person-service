/**
 * Health Check Step Definitions
 * 
 * Step definitions for the Health Check feature tests.
 * Uses jest-cucumber to bind Gherkin scenarios to Jest tests.
 */

import { loadFeature, defineFeature } from 'jest-cucumber';
import { expect, beforeEach } from '@jest/globals';
import {
  createTestContext,
  assertServiceRunning,
  sendGet,
  sendGetWithTimeout,
  sendConcurrentGet,
  assertResponseStatus,
  assertContentType,
  assertValidJson,
  assertResponseIsObject,
  assertFieldValue,
  assertHasField,
  assertFieldOneOf,
  assertAllResponsesStatus,
  assertNoTimeout
} from './common.steps.js';

const feature = loadFeature('../features/health.feature', {
  loadRelativePath: true
});

defineFeature(feature, (test) => {
  let ctx;

  beforeEach(() => {
    ctx = createTestContext();
  });

  test('Health endpoint returns 200 OK', ({ given, when, then, and }) => {
    given('the service is running', () => {
      assertServiceRunning(expect);
    });

    when(/^I send a GET request to "([^"]*)"$/, async (path) => {
      await sendGet(ctx, path);
      await assertValidJson(expect, ctx);
    });

    then(/^the response status should be (\d+)$/, (status) => {
      assertResponseStatus(expect, ctx, parseInt(status, 10));
    });

    and(/^the response should contain "([^"]*)" with value "([^"]*)"$/, async (field, value) => {
      await assertFieldValue(expect, ctx, field, value);
    });
  });

  test('Health endpoint returns valid JSON', ({ given, when, then, and }) => {
    given('the service is running', () => {
      assertServiceRunning(expect);
    });

    when(/^I send a GET request to "([^"]*)"$/, async (path) => {
      await sendGet(ctx, path);
    });

    then(/^the response content type should be "([^"]*)"$/, (expectedType) => {
      assertContentType(expect, ctx, expectedType);
    });

    and('the response should be valid JSON', async () => {
      await assertValidJson(expect, ctx);
    });

    and('the response should be an object', async () => {
      await assertResponseIsObject(expect, ctx);
    });
  });

  test('Health endpoint includes service metadata', ({ given, when, then, and }) => {
    given('the service is running', () => {
      assertServiceRunning(expect);
    });

    when(/^I send a GET request to "([^"]*)"$/, async (path) => {
      await sendGet(ctx, path);
      await assertValidJson(expect, ctx);
    });

    then(/^the response should have field "([^"]*)"$/, async (field) => {
      await assertHasField(expect, ctx, field);
    });

    and(/^the field "([^"]*)" should be one of "([^"]*)"$/, async (field, valuesStr) => {
      await assertFieldOneOf(expect, ctx, field, valuesStr);
    });
  });

  test('Service is responsive to multiple health checks', ({ given, when, then }) => {
    given('the service is running', () => {
      assertServiceRunning(expect);
    });

    when(/^I send (\d+) concurrent GET requests to "([^"]*)"$/, async (count, path) => {
      await sendConcurrentGet(ctx, path, parseInt(count, 10));
    });

    then(/^all responses should have status (\d+)$/, (expectedStatus) => {
      assertAllResponsesStatus(expect, ctx, parseInt(expectedStatus, 10));
    });
  });

  test('Health check does not timeout', ({ given, when, then, and }) => {
    given('the service is running', () => {
      assertServiceRunning(expect);
    });

    when(/^I send a GET request to "([^"]*)" with (\d+)ms timeout$/, async (path, timeoutMs) => {
      await sendGetWithTimeout(ctx, path, parseInt(timeoutMs, 10));
    });

    then(/^the response status should be (\d+)$/, (status) => {
      assertResponseStatus(expect, ctx, parseInt(status, 10));
    });

    and('the request should complete within timeout', () => {
      assertNoTimeout(expect, ctx);
    });
  });
});
