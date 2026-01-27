Feature: GET /api/key-value/:key - Retrieve Value by Key
  As an API consumer
  I want to retrieve values by their key
  So that I can access stored configuration data

  Background:
    Given the service is running
    And the key-value table exists

  Scenario: Get an existing key-value pair
    Given a key-value pair exists with key "mykey" and value "myvalue"
    When I send a GET request to "/api/key-value/mykey"
    Then the response status code should be 200
    And the response should contain field "key" with value "mykey"
    And the response should contain field "value" with value "myvalue"
    And the response should contain field "created_at"
    And the response should contain field "updated_at"

  Scenario: Get non-existent key
    When I send a GET request to "/api/key-value/nonexistent"
    Then the response status code should be 404
    And the response should contain field "error" with value "Key not found"

  Scenario: Get key with special characters
    Given a key-value pair exists with key "special-key-123" and value "special-value"
    When I send a GET request to "/api/key-value/special-key-123"
    Then the response status code should be 200
    And the response should contain field "key" with value "special-key-123"

  Scenario: Get empty key
    When I send a GET request to "/api/key-value/"
    Then the response status code should be 400
    And the response should contain field "error"

  Scenario: Get key returns latest value after update
    Given a key-value pair exists with key "updated-key" and value "old-value"
    And the key "updated-key" is updated to value "new-value"
    When I send a GET request to "/api/key-value/updated-key"
    Then the response status code should be 200
    And the response should contain field "value" with value "new-value"
    And the "updated_at" timestamp should be more recent than "created_at"

  Scenario: Get multiple different keys
    Given a key-value pair exists with key "key1" and value "value1"
    And a key-value pair exists with key "key2" and value "value2"
    And a key-value pair exists with key "key3" and value "value3"
    When I send a GET request to "/api/key-value/key1"
    Then the response should contain field "value" with value "value1"
    When I send a GET request to "/api/key-value/key2"
    Then the response should contain field "value" with value "value2"
    When I send a GET request to "/api/key-value/key3"
    Then the response should contain field "value" with value "value3"

  Scenario: Get key with long value
    Given a key-value pair exists with key "long-key" and value "this is a very long value that contains multiple words and sentences to test the storage and retrieval of lengthy text"
    When I send a GET request to "/api/key-value/long-key"
    Then the response status code should be 200
    And the response should contain the complete long value

  Scenario: Get key after it was deleted
    Given a key-value pair exists with key "temp-key" and value "temp-value"
    And the key "temp-key" is deleted
    When I send a GET request to "/api/key-value/temp-key"
    Then the response status code should be 404
    And the response should contain field "error" with value "Key not found"

  Scenario: Verify timestamps are valid
    Given a key-value pair exists with key "timestamp-test" and value "test"
    When I send a GET request to "/api/key-value/timestamp-test"
    Then the response status code should be 200
    And the "created_at" timestamp should be a valid ISO 8601 datetime
    And the "updated_at" timestamp should be a valid ISO 8601 datetime
    And the "created_at" timestamp should be less than or equal to "updated_at"
