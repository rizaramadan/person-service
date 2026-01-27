Feature: POST /persons/:personId/attributes - Create Person Attribute
  As an API consumer
  I want to create encrypted attributes for a person
  So that I can store sensitive personal information securely

  Background:
    Given the service is running
    And I have a valid API key
    And a person exists with ID "test-person-123"

  Scenario: Create a single attribute
    When I send a POST request to "/persons/test-person-123/attributes" with headers:
      | x-api-key | person-service-key-82aca3c8-8e5d-42d4-9b00-7bc2f3077a58 |
    And request body:
      """
      {
        "key": "email",
        "value": "test@example.com",
        "meta": {
          "caller": "test-suite",
          "reason": "testing",
          "traceId": "test-trace-001"
        }
      }
      """
    Then the response status code should be 201
    And the response should contain field "id"
    And the response should contain field "key" with value "email"
    And the response should contain field "value" with value "test@example.com"
    And the value should be encrypted in the database

  Scenario: Create attribute with special characters
    When I send a POST request to "/persons/test-person-123/attributes" with headers:
      | x-api-key | person-service-key-82aca3c8-8e5d-42d4-9b00-7bc2f3077a58 |
    And request body:
      """
      {
        "key": "address",
        "value": "123 Main St, Apt #5, City & State",
        "meta": {
          "caller": "test-suite",
          "reason": "testing",
          "traceId": "test-trace-002"
        }
      }
      """
    Then the response status code should be 201
    And the response should contain field "value" with value "123 Main St, Apt #5, City & State"

  Scenario: Create attribute without API key
    When I send a POST request to "/persons/test-person-123/attributes" without API key
    And request body:
      """
      {
        "key": "email",
        "value": "test@example.com",
        "meta": {
          "caller": "test-suite",
          "reason": "testing",
          "traceId": "test-trace-003"
        }
      }
      """
    Then the response status code should be 401
    And the response should contain field "message" with value "Missing required header \"x-api-key\""

  Scenario: Create attribute with invalid API key format
    When I send a POST request to "/persons/test-person-123/attributes" with headers:
      | x-api-key | invalid-key |
    And request body:
      """
      {
        "key": "email",
        "value": "test@example.com",
        "meta": {
          "caller": "test-suite",
          "reason": "testing",
          "traceId": "test-trace-004"
        }
      }
      """
    Then the response status code should be 401
    And the response should contain field "message" with value "Invalid API key format"

  Scenario: Create attribute with wrong API key
    When I send a POST request to "/persons/test-person-123/attributes" with headers:
      | x-api-key | person-service-key-00000000-0000-0000-0000-000000000000 |
    And request body:
      """
      {
        "key": "email",
        "value": "test@example.com",
        "meta": {
          "caller": "test-suite",
          "reason": "testing",
          "traceId": "test-trace-005"
        }
      }
      """
    Then the response status code should be 401
    And the response should contain field "message" with value "Invalid API key"

  Scenario: Create attribute without meta information
    When I send a POST request to "/persons/test-person-123/attributes" with headers:
      | x-api-key | person-service-key-82aca3c8-8e5d-42d4-9b00-7bc2f3077a58 |
    And request body:
      """
      {
        "key": "email",
        "value": "test@example.com"
      }
      """
    Then the response status code should be 400
    And the response should contain field "message" with value "Missing required field \"meta\""

  Scenario: Create attribute without key
    When I send a POST request to "/persons/test-person-123/attributes" with headers:
      | x-api-key | person-service-key-82aca3c8-8e5d-42d4-9b00-7bc2f3077a58 |
    And request body:
      """
      {
        "value": "test@example.com",
        "meta": {
          "caller": "test-suite",
          "reason": "testing",
          "traceId": "test-trace-006"
        }
      }
      """
    Then the response status code should be 400
    And the response should contain field "message" with value "Key is required"

  Scenario: Create attribute with empty value
    When I send a POST request to "/persons/test-person-123/attributes" with headers:
      | x-api-key | person-service-key-82aca3c8-8e5d-42d4-9b00-7bc2f3077a58 |
    And request body:
      """
      {
        "key": "email",
        "value": "",
        "meta": {
          "caller": "test-suite",
          "reason": "testing",
          "traceId": "test-trace-007"
        }
      }
      """
    Then the response status code should be 201
    And the response should contain field "value" with value ""

  Scenario: Create duplicate attribute (upsert behavior)
    Given an attribute exists for person "test-person-123" with key "email" and value "old@example.com"
    When I send a POST request to "/persons/test-person-123/attributes" with headers:
      | x-api-key | person-service-key-82aca3c8-8e5d-42d4-9b00-7bc2f3077a58 |
    And request body:
      """
      {
        "key": "email",
        "value": "new@example.com",
        "meta": {
          "caller": "test-suite",
          "reason": "testing-upsert",
          "traceId": "test-trace-008"
        }
      }
      """
    Then the response status code should be 201
    And the response should contain field "value" with value "new@example.com"
    And only one attribute with key "email" should exist for person "test-person-123"

  Scenario: Idempotency - Same traceId returns cached response
    Given a previous request was made with traceId "test-trace-idempotent"
    When I send a POST request to "/persons/test-person-123/attributes" with headers:
      | x-api-key | person-service-key-82aca3c8-8e5d-42d4-9b00-7bc2f3077a58 |
    And request body:
      """
      {
        "key": "phone",
        "value": "+1234567890",
        "meta": {
          "caller": "test-suite",
          "reason": "testing-idempotency",
          "traceId": "test-trace-idempotent"
        }
      }
      """
    Then the response status code should be 201
    And the response should match the previous response

  Scenario: Verify audit log creation
    When I send a POST request to "/persons/test-person-123/attributes" with headers:
      | x-api-key | person-service-key-82aca3c8-8e5d-42d4-9b00-7bc2f3077a58 |
    And request body:
      """
      {
        "key": "ssn",
        "value": "123-45-6789",
        "meta": {
          "caller": "test-suite",
          "reason": "audit-test",
          "traceId": "test-trace-audit"
        }
      }
      """
    Then the response status code should be 201
    And an audit log entry should exist for traceId "test-trace-audit"
    And the audit log should contain encrypted request body
    And the audit log should contain encrypted response body
