Feature: PUT /persons/:personId/attributes - Create/Update Person Attribute (Alias)
  As an API consumer
  I want to create or update attributes using PUT method
  So that I can use RESTful conventions

  Background:
    Given the service is running
    And I have a valid API key
    And a person exists with ID "test-person-123"

  Scenario: Create attribute using PUT (same as POST)
    When I send a PUT request to "/persons/test-person-123/attributes" with headers:
      | x-api-key | person-service-key-82aca3c8-8e5d-42d4-9b00-7bc2f3077a58 |
    And request body:
      """
      {
        "key": "email",
        "value": "test@example.com",
        "meta": {
          "caller": "test-suite",
          "reason": "testing-put",
          "traceId": "test-trace-put-001"
        }
      }
      """
    Then the response status code should be 201
    And the response should contain field "key" with value "email"
    And the response should contain field "value" with value "test@example.com"

  Scenario: Update existing attribute using PUT
    Given an attribute exists for person "test-person-123" with key "phone" and value "old-number"
    When I send a PUT request to "/persons/test-person-123/attributes" with headers:
      | x-api-key | person-service-key-82aca3c8-8e5d-42d4-9b00-7bc2f3077a58 |
    And request body:
      """
      {
        "key": "phone",
        "value": "new-number",
        "meta": {
          "caller": "test-suite",
          "reason": "testing-put-update",
          "traceId": "test-trace-put-002"
        }
      }
      """
    Then the response status code should be 201
    And the response should contain field "value" with value "new-number"

  Scenario: PUT without API key
    When I send a PUT request to "/persons/test-person-123/attributes" without API key
    And request body:
      """
      {
        "key": "email",
        "value": "test@example.com",
        "meta": {
          "caller": "test-suite",
          "reason": "testing",
          "traceId": "test-trace-put-003"
        }
      }
      """
    Then the response status code should be 401

  Note: PUT /persons/:personId/attributes is an alias to POST /persons/:personId/attributes
        Both endpoints use the same handler: CreateAttribute
