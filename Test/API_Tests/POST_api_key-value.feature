Feature: POST /api/key-value - Create or Update Key-Value Pair
  As an API consumer
  I want to store key-value pairs
  So that I can persist simple configuration data

  Background:
    Given the service is running
    And the key-value table exists

  Scenario: Create a new key-value pair
    When I send a POST request to "/api/key-value" with body:
      """
      {
        "key": "test-key",
        "value": "test-value"
      }
      """
    Then the response status code should be 200
    And the response should contain field "key" with value "test-key"
    And the response should contain field "value" with value "test-value"
    And the response should contain field "created_at"
    And the response should contain field "updated_at"

  Scenario: Update an existing key-value pair
    Given a key-value pair exists with key "existing-key" and value "old-value"
    When I send a POST request to "/api/key-value" with body:
      """
      {
        "key": "existing-key",
        "value": "new-value"
      }
      """
    Then the response status code should be 200
    And the response should contain field "key" with value "existing-key"
    And the response should contain field "value" with value "new-value"
    And the "updated_at" timestamp should be more recent than "created_at"

  Scenario: Create key-value with special characters
    When I send a POST request to "/api/key-value" with body:
      """
      {
        "key": "special-key",
        "value": "value with spaces & special chars: @#$%"
      }
      """
    Then the response status code should be 200
    And the response should contain field "value" with value "value with spaces & special chars: @#$%"

  Scenario: Missing required field - key
    When I send a POST request to "/api/key-value" with body:
      """
      {
        "value": "test-value"
      }
      """
    Then the response status code should be 400
    And the response should contain field "error"

  Scenario: Missing required field - value
    When I send a POST request to "/api/key-value" with body:
      """
      {
        "key": "test-key"
      }
      """
    Then the response status code should be 400
    And the response should contain field "error"

  Scenario: Empty key
    When I send a POST request to "/api/key-value" with body:
      """
      {
        "key": "",
        "value": "test-value"
      }
      """
    Then the response status code should be 400
    And the response should contain field "error"

  Scenario: Empty value
    When I send a POST request to "/api/key-value" with body:
      """
      {
        "key": "test-key",
        "value": ""
      }
      """
    Then the response status code should be 400
    And the response should contain field "error"

  Scenario: Invalid JSON body
    When I send a POST request to "/api/key-value" with invalid JSON
    Then the response status code should be 400
    And the response should contain field "error"

  Scenario: Create multiple key-value pairs
    When I send a POST request to "/api/key-value" with body:
      """
      {
        "key": "key1",
        "value": "value1"
      }
      """
    And I send a POST request to "/api/key-value" with body:
      """
      {
        "key": "key2",
        "value": "value2"
      }
      """
    And I send a POST request to "/api/key-value" with body:
      """
      {
        "key": "key3",
        "value": "value3"
      }
      """
    Then all responses should have status code 200
