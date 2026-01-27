Feature: GET /persons/:personId/attributes - Get All Attributes for Person
  As an API consumer
  I want to retrieve all attributes for a person
  So that I can access all their stored information

  Background:
    Given the service is running
    And I have a valid API key
    And a person exists with ID "test-person-123"

  Scenario: Get all attributes for person with multiple attributes
    Given the following attributes exist for person "test-person-123":
      | key     | value            |
      | email   | test@example.com |
      | phone   | +1234567890      |
      | address | 123 Main St      |
    When I send a GET request to "/persons/test-person-123/attributes" with headers:
      | x-api-key | person-service-key-82aca3c8-8e5d-42d4-9b00-7bc2f3077a58 |
    Then the response status code should be 200
    And the response should be an array with 3 elements
    And all values should be decrypted
    And the response should contain attribute with key "email"
    And the response should contain attribute with key "phone"
    And the response should contain attribute with key "address"

  Scenario: Get attributes for person with no attributes
    When I send a GET request to "/persons/test-person-123/attributes" with headers:
      | x-api-key | person-service-key-82aca3c8-8e5d-42d4-9b00-7bc2f3077a58 |
    Then the response status code should be 200
    And the response should be an empty array

  Scenario: Get attributes without API key
    When I send a GET request to "/persons/test-person-123/attributes" without API key
    Then the response status code should be 401
    And the response should contain field "message" with value "Missing required header \"x-api-key\""

  Scenario: Get attributes with invalid API key
    When I send a GET request to "/persons/test-person-123/attributes" with headers:
      | x-api-key | invalid-key |
    Then the response status code should be 401
    And the response should contain field "message" with value "Invalid API key format"

  Scenario: Get attributes for non-existent person
    When I send a GET request to "/persons/nonexistent-person/attributes" with headers:
      | x-api-key | person-service-key-82aca3c8-8e5d-42d4-9b00-7bc2f3077a58 |
    Then the response status code should be 200
    And the response should be an empty array

  Scenario: Verify all attributes are decrypted
    Given the following attributes exist for person "test-person-123":
      | key      | value            |
      | email    | test@example.com |
      | password | secret123        |
      | ssn      | 123-45-6789      |
    When I send a GET request to "/persons/test-person-123/attributes" with headers:
      | x-api-key | person-service-key-82aca3c8-8e5d-42d4-9b00-7bc2f3077a58 |
    Then the response status code should be 200
    And all attribute values should be plaintext (decrypted)
    And no attribute value should contain "\\x" (encrypted format)

  Scenario: Get attributes returns latest values
    Given an attribute exists for person "test-person-123" with key "status" and value "active"
    When the attribute "status" is updated to "inactive"
    And I send a GET request to "/persons/test-person-123/attributes" with headers:
      | x-api-key | person-service-key-82aca3c8-8e5d-42d4-9b00-7bc2f3077a58 |
    Then the response status code should be 200
    And the response should contain attribute with key "status" and value "inactive"

  Scenario: Get large number of attributes
    Given 50 attributes exist for person "test-person-123"
    When I send a GET request to "/persons/test-person-123/attributes" with headers:
      | x-api-key | person-service-key-82aca3c8-8e5d-42d4-9b00-7bc2f3077a58 |
    Then the response status code should be 200
    And the response should be an array with 50 elements
    And all values should be decrypted

  Scenario: Verify response format and structure
    Given an attribute exists for person "test-person-123" with key "email" and value "test@example.com"
    When I send a GET request to "/persons/test-person-123/attributes" with headers:
      | x-api-key | person-service-key-82aca3c8-8e5d-42d4-9b00-7bc2f3077a58 |
    Then the response status code should be 200
    And the response should be a JSON array
    And each element should have field "id"
    And each element should have field "key"
    And each element should have field "value"
    And each element should have field "created_at"
    And each element should have field "updated_at"
