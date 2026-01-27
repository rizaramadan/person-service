Feature: PUT /persons/:personId/attributes/:attributeId - Update Person Attribute
  As an API consumer
  I want to update an existing attribute
  So that I can modify stored information

  Background:
    Given the service is running
    And I have a valid API key
    And a person exists with ID "test-person-123"

  Scenario: Update attribute value only
    Given an attribute exists for person "test-person-123" with ID "10" key "email" and value "old@example.com"
    When I send a PUT request to "/persons/test-person-123/attributes/10" with headers:
      | x-api-key | person-service-key-82aca3c8-8e5d-42d4-9b00-7bc2f3077a58 |
    And request body:
      """
      {
        "key": "email",
        "value": "new@example.com",
        "meta": {
          "caller": "test-suite",
          "reason": "testing-update",
          "traceId": "test-trace-update-001"
        }
      }
      """
    Then the response status code should be 200
    And the response should contain field "id" with value "10"
    And the response should contain field "key" with value "email"
    And the response should contain field "value" with value "new@example.com"
    And the "updated_at" timestamp should be more recent than "created_at"

  Scenario: Update attribute key and value
    Given an attribute exists for person "test-person-123" with ID "10" key "old_key" and value "old_value"
    When I send a PUT request to "/persons/test-person-123/attributes/10" with headers:
      | x-api-key | person-service-key-82aca3c8-8e5d-42d4-9b00-7bc2f3077a58 |
    And request body:
      """
      {
        "key": "new_key",
        "value": "new_value",
        "meta": {
          "caller": "test-suite",
          "reason": "testing-key-change",
          "traceId": "test-trace-update-002"
        }
      }
      """
    Then the response status code should be 200
    And the response should contain field "key" with value "new_key"
    And the response should contain field "value" with value "new_value"

  Scenario: Update non-existent attribute
    When I send a PUT request to "/persons/test-person-123/attributes/99999" with headers:
      | x-api-key | person-service-key-82aca3c8-8e5d-42d4-9b00-7bc2f3077a58 |
    And request body:
      """
      {
        "key": "email",
        "value": "test@example.com",
        "meta": {
          "caller": "test-suite",
          "reason": "testing",
          "traceId": "test-trace-update-003"
        }
      }
      """
    Then the response status code should be 404
    And the response should contain field "error"

  Scenario: Update without API key
    When I send a PUT request to "/persons/test-person-123/attributes/10" without API key
    And request body:
      """
      {
        "key": "email",
        "value": "test@example.com",
        "meta": {
          "caller": "test-suite",
          "reason": "testing",
          "traceId": "test-trace-update-004"
        }
      }
      """
    Then the response status code should be 401

  Scenario: Update without meta information
    Given an attribute exists for person "test-person-123" with ID "10" key "email" and value "old@example.com"
    When I send a PUT request to "/persons/test-person-123/attributes/10" with headers:
      | x-api-key | person-service-key-82aca3c8-8e5d-42d4-9b00-7bc2f3077a58 |
    And request body:
      """
      {
        "key": "email",
        "value": "new@example.com"
      }
      """
    Then the response status code should be 400
    And the response should contain field "message" with value "Missing required field \"meta\""

  Scenario: Update to empty value
    Given an attribute exists for person "test-person-123" with ID "10" key "email" and value "old@example.com"
    When I send a PUT request to "/persons/test-person-123/attributes/10" with headers:
      | x-api-key | person-service-key-82aca3c8-8e5d-42d4-9b00-7bc2f3077a58 |
    And request body:
      """
      {
        "key": "email",
        "value": "",
        "meta": {
          "caller": "test-suite",
          "reason": "testing-empty",
          "traceId": "test-trace-update-005"
        }
      }
      """
    Then the response status code should be 200
    And the response should contain field "value" with value ""

  Scenario: Verify updated value is re-encrypted
    Given an attribute exists for person "test-person-123" with ID "10" key "password" and value "old-password"
    When I send a PUT request to "/persons/test-person-123/attributes/10" with headers:
      | x-api-key | person-service-key-82aca3c8-8e5d-42d4-9b00-7bc2f3077a58 |
    And request body:
      """
      {
        "key": "password",
        "value": "new-password",
        "meta": {
          "caller": "test-suite",
          "reason": "password-change",
          "traceId": "test-trace-update-006"
        }
      }
      """
    Then the response status code should be 200
    And the response should contain field "value" with value "new-password"
    And the value should be re-encrypted in the database
    And the database should not contain plaintext "new-password"

  Scenario: Multiple updates to same attribute
    Given an attribute exists for person "test-person-123" with ID "10" key "status" and value "initial"
    When I update attribute "10" to value "updated-1"
    And I update attribute "10" to value "updated-2"
    And I update attribute "10" to value "updated-3"
    And I send a GET request to "/persons/test-person-123/attributes/10" with headers:
      | x-api-key | person-service-key-82aca3c8-8e5d-42d4-9b00-7bc2f3077a58 |
    Then the response status code should be 200
    And the response should contain field "value" with value "updated-3"

  Scenario: Audit log for update
    Given an attribute exists for person "test-person-123" with ID "10" key "email" and value "old@example.com"
    When I send a PUT request to "/persons/test-person-123/attributes/10" with headers:
      | x-api-key | person-service-key-82aca3c8-8e5d-42d4-9b00-7bc2f3077a58 |
    And request body:
      """
      {
        "key": "email",
        "value": "new@example.com",
        "meta": {
          "caller": "test-suite",
          "reason": "audit-test",
          "traceId": "test-trace-audit-update"
        }
      }
      """
    Then the response status code should be 200
    And an audit log entry should exist for traceId "test-trace-audit-update"
