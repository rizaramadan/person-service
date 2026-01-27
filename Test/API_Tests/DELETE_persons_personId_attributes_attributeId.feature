Feature: DELETE /persons/:personId/attributes/:attributeId - Delete Person Attribute
  As an API consumer
  I want to delete a specific attribute
  So that I can remove obsolete or incorrect information

  Background:
    Given the service is running
    And I have a valid API key
    And a person exists with ID "test-person-123"

  Scenario: Delete existing attribute
    Given an attribute exists for person "test-person-123" with ID "10" key "temp-data" and value "delete-me"
    When I send a DELETE request to "/persons/test-person-123/attributes/10" with headers:
      | x-api-key | person-service-key-82aca3c8-8e5d-42d4-9b00-7bc2f3077a58 |
    Then the response status code should be 200
    And the response should contain a success message

  Scenario: Verify attribute is deleted from database
    Given an attribute exists for person "test-person-123" with ID "10" key "verify-delete" and value "test"
    When I send a DELETE request to "/persons/test-person-123/attributes/10" with headers:
      | x-api-key | person-service-key-82aca3c8-8e5d-42d4-9b00-7bc2f3077a58 |
    Then the response status code should be 200
    When I send a GET request to "/persons/test-person-123/attributes/10" with headers:
      | x-api-key | person-service-key-82aca3c8-8e5d-42d4-9b00-7bc2f3077a58 |
    Then the response status code should be 404
    And the attribute should not exist in the database

  Scenario: Delete non-existent attribute
    When I send a DELETE request to "/persons/test-person-123/attributes/99999" with headers:
      | x-api-key | person-service-key-82aca3c8-8e5d-42d4-9b00-7bc2f3077a58 |
    Then the response status code should be 404
    And the response should contain field "error"

  Scenario: Delete without API key
    When I send a DELETE request to "/persons/test-person-123/attributes/10" without API key
    Then the response status code should be 401
    And the response should contain field "message" with value "Missing required header \"x-api-key\""

  Scenario: Delete with invalid API key
    When I send a DELETE request to "/persons/test-person-123/attributes/10" with headers:
      | x-api-key | invalid-key |
    Then the response status code should be 401
    And the response should contain field "message" with value "Invalid API key format"

  Scenario: Delete with invalid attribute ID format
    When I send a DELETE request to "/persons/test-person-123/attributes/abc" with headers:
      | x-api-key | person-service-key-82aca3c8-8e5d-42d4-9b00-7bc2f3077a58 |
    Then the response status code should be 400
    And the response should contain field "error"

  Scenario: Delete same attribute twice
    Given an attribute exists for person "test-person-123" with ID "10" key "double-delete" and value "test"
    When I send a DELETE request to "/persons/test-person-123/attributes/10" with headers:
      | x-api-key | person-service-key-82aca3c8-8e5d-42d4-9b00-7bc2f3077a58 |
    Then the response status code should be 200
    When I send a DELETE request to "/persons/test-person-123/attributes/10" with headers:
      | x-api-key | person-service-key-82aca3c8-8e5d-42d4-9b00-7bc2f3077a58 |
    Then the response status code should be 404

  Scenario: Delete one attribute doesn't affect others
    Given the following attributes exist for person "test-person-123":
      | id | key     | value            |
      | 10 | email   | test@example.com |
      | 11 | phone   | +1234567890      |
      | 12 | address | 123 Main St      |
    When I send a DELETE request to "/persons/test-person-123/attributes/11" with headers:
      | x-api-key | person-service-key-82aca3c8-8e5d-42d4-9b00-7bc2f3077a58 |
    Then the response status code should be 200
    When I send a GET request to "/persons/test-person-123/attributes" with headers:
      | x-api-key | person-service-key-82aca3c8-8e5d-42d4-9b00-7bc2f3077a58 |
    Then the response should contain attribute with ID "10"
    And the response should not contain attribute with ID "11"
    And the response should contain attribute with ID "12"

  Scenario: Delete all attributes for a person
    Given the following attributes exist for person "test-person-123":
      | id | key   | value   |
      | 10 | attr1 | value1  |
      | 11 | attr2 | value2  |
      | 12 | attr3 | value3  |
    When I delete all attributes for person "test-person-123"
    When I send a GET request to "/persons/test-person-123/attributes" with headers:
      | x-api-key | person-service-key-82aca3c8-8e5d-42d4-9b00-7bc2f3077a58 |
    Then the response status code should be 200
    And the response should be an empty array

  Scenario: Complete lifecycle - Create, Read, Update, Delete
    When I create an attribute for person "test-person-123" with key "lifecycle" and value "initial"
    Then the attribute should be created with an ID
    When I get the attribute by ID
    Then the response should contain value "initial"
    When I update the attribute to value "updated"
    Then the response should contain value "updated"
    When I delete the attribute by ID
    Then the attribute should no longer exist
    When I try to get the deleted attribute
    Then the response status code should be 404

  Scenario: Verify encrypted data is removed from database
    Given an attribute exists for person "test-person-123" with ID "10" key "sensitive" and value "confidential-data"
    When I send a DELETE request to "/persons/test-person-123/attributes/10" with headers:
      | x-api-key | person-service-key-82aca3c8-8e5d-42d4-9b00-7bc2f3077a58 |
    Then the response status code should be 200
    And the encrypted value should be removed from database
    And no trace of "confidential-data" should exist in database
