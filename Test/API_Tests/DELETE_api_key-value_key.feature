Feature: DELETE /api/key-value/:key - Delete Key-Value Pair
  As an API consumer
  I want to delete key-value pairs
  So that I can remove obsolete configuration data

  Background:
    Given the service is running
    And the key-value table exists

  Scenario: Delete an existing key-value pair
    Given a key-value pair exists with key "delete-me" and value "test-value"
    When I send a DELETE request to "/api/key-value/delete-me"
    Then the response status code should be 200
    And the response should contain field "message" with value "Key deleted successfully"

  Scenario: Verify key is deleted from database
    Given a key-value pair exists with key "verify-delete" and value "test-value"
    When I send a DELETE request to "/api/key-value/verify-delete"
    Then the response status code should be 200
    When I send a GET request to "/api/key-value/verify-delete"
    Then the response status code should be 404
    And the response should contain field "error" with value "Key not found"

  Scenario: Delete non-existent key
    When I send a DELETE request to "/api/key-value/nonexistent"
    Then the response status code should be 200
    And the response should contain field "message"

  Scenario: Delete empty key
    When I send a DELETE request to "/api/key-value/"
    Then the response status code should be 400
    And the response should contain field "error"

  Scenario: Delete key with special characters
    Given a key-value pair exists with key "special-key-@#$" and value "special-value"
    When I send a DELETE request to "/api/key-value/special-key-@#$"
    Then the response status code should be 200

  Scenario: Delete same key twice
    Given a key-value pair exists with key "double-delete" and value "test-value"
    When I send a DELETE request to "/api/key-value/double-delete"
    Then the response status code should be 200
    When I send a DELETE request to "/api/key-value/double-delete"
    Then the response status code should be 200

  Scenario: Delete multiple keys sequentially
    Given a key-value pair exists with key "key1" and value "value1"
    And a key-value pair exists with key "key2" and value "value2"
    And a key-value pair exists with key "key3" and value "value3"
    When I send a DELETE request to "/api/key-value/key1"
    Then the response status code should be 200
    When I send a DELETE request to "/api/key-value/key2"
    Then the response status code should be 200
    When I send a DELETE request to "/api/key-value/key3"
    Then the response status code should be 200
    When I send a GET request to "/api/key-value/key1"
    Then the response status code should be 404
    When I send a GET request to "/api/key-value/key2"
    Then the response status code should be 404
    When I send a GET request to "/api/key-value/key3"
    Then the response status code should be 404

  Scenario: Create, Read, Update, Delete lifecycle
    When I send a POST request to "/api/key-value" with body:
      """
      {
        "key": "lifecycle-key",
        "value": "initial-value"
      }
      """
    Then the response status code should be 200
    When I send a GET request to "/api/key-value/lifecycle-key"
    Then the response status code should be 200
    And the response should contain field "value" with value "initial-value"
    When I send a POST request to "/api/key-value" with body:
      """
      {
        "key": "lifecycle-key",
        "value": "updated-value"
      }
      """
    Then the response status code should be 200
    When I send a GET request to "/api/key-value/lifecycle-key"
    Then the response should contain field "value" with value "updated-value"
    When I send a DELETE request to "/api/key-value/lifecycle-key"
    Then the response status code should be 200
    When I send a GET request to "/api/key-value/lifecycle-key"
    Then the response status code should be 404
