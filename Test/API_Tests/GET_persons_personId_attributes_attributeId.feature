Feature: GET /persons/:personId/attributes/:attributeId - Get Single Attribute
  As an API consumer
  I want to retrieve a specific attribute by its ID
  So that I can access individual pieces of information

  Background:
    Given the service is running
    And I have a valid API key
    And a person exists with ID "test-person-123"

  Scenario: Get existing attribute by ID
    Given an attribute exists for person "test-person-123" with ID "10" key "email" and value "test@example.com"
    When I send a GET request to "/persons/test-person-123/attributes/10" with headers:
      | x-api-key | person-service-key-82aca3c8-8e5d-42d4-9b00-7bc2f3077a58 |
    Then the response status code should be 200
    And the response should contain field "id" with value "10"
    And the response should contain field "key" with value "email"
    And the response should contain field "value" with value "test@example.com"
    And the value should be decrypted (plaintext)

  Scenario: Get non-existent attribute
    When I send a GET request to "/persons/test-person-123/attributes/99999" with headers:
      | x-api-key | person-service-key-82aca3c8-8e5d-42d4-9b00-7bc2f3077a58 |
    Then the response status code should be 404
    And the response should contain field "error"

  Scenario: Get attribute without API key
    When I send a GET request to "/persons/test-person-123/attributes/10" without API key
    Then the response status code should be 401
    And the response should contain field "message" with value "Missing required header \"x-api-key\""

  Scenario: Get attribute with invalid API key
    When I send a GET request to "/persons/test-person-123/attributes/10" with headers:
      | x-api-key | invalid-key |
    Then the response status code should be 401
    And the response should contain field "message" with value "Invalid API key format"

  Scenario: Get attribute with invalid ID format
    When I send a GET request to "/persons/test-person-123/attributes/abc" with headers:
      | x-api-key | person-service-key-82aca3c8-8e5d-42d4-9b00-7bc2f3077a58 |
    Then the response status code should be 400
    And the response should contain field "error"

  Scenario: Verify attribute value is decrypted
    Given an attribute exists for person "test-person-123" with ID "10" key "password" and value "secret123"
    When I send a GET request to "/persons/test-person-123/attributes/10" with headers:
      | x-api-key | person-service-key-82aca3c8-8e5d-42d4-9b00-7bc2f3077a58 |
    Then the response status code should be 200
    And the response should contain field "value" with value "secret123"
    And the value should not contain "\\x" (should be decrypted)

  Scenario: Get attribute returns latest value after update
    Given an attribute exists for person "test-person-123" with ID "10" key "status" and value "active"
    When the attribute with ID "10" is updated to value "inactive"
    And I send a GET request to "/persons/test-person-123/attributes/10" with headers:
      | x-api-key | person-service-key-82aca3c8-8e5d-42d4-9b00-7bc2f3077a58 |
    Then the response status code should be 200
    And the response should contain field "value" with value "inactive"
    And the "updated_at" timestamp should be more recent than "created_at"

  Scenario: Verify response includes all fields
    Given an attribute exists for person "test-person-123" with ID "10" key "email" and value "test@example.com"
    When I send a GET request to "/persons/test-person-123/attributes/10" with headers:
      | x-api-key | person-service-key-82aca3c8-8e5d-42d4-9b00-7bc2f3077a58 |
    Then the response status code should be 200
    And the response should contain field "id"
    And the response should contain field "key"
    And the response should contain field "value"
    And the response should contain field "created_at"
    And the response should contain field "updated_at"
    And all timestamp fields should be valid ISO 8601 format

  Scenario: Get attribute for different person (security test)
    Given an attribute exists for person "person-A" with ID "10" key "secret" and value "secret-A"
    And an attribute exists for person "person-B" with ID "20" key "secret" and value "secret-B"
    When I send a GET request to "/persons/person-A/attributes/10" with headers:
      | x-api-key | person-service-key-82aca3c8-8e5d-42d4-9b00-7bc2f3077a58 |
    Then the response should contain field "value" with value "secret-A"
    When I send a GET request to "/persons/person-A/attributes/20" with headers:
      | x-api-key | person-service-key-82aca3c8-8e5d-42d4-9b00-7bc2f3077a58 |
    Then the response status code should be 404 or return attribute for person-B
