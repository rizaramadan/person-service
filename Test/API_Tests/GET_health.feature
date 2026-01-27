Feature: GET /health - Health Check API
  As a system administrator
  I want to check the health status of the service
  So that I can monitor service availability

  Background:
    Given the service is running

  Scenario: Health endpoint returns 200 OK
    When I send a GET request to "/health"
    Then the response status code should be 200
    And the response should be valid JSON

  Scenario: Health response contains status field
    When I send a GET request to "/health"
    Then the response status code should be 200
    And the response body should contain field "status"

  Scenario: Health response contains required metadata
    When I send a GET request to "/health"
    Then the response status code should be 200
    And the response should include service metadata
    And the response should contain field "timestamp"

  Scenario: Health check responds within acceptable time
    When I send a GET request to "/health"
    Then the response should be received within 1000 milliseconds
    And the response status code should be 200

  Scenario: Multiple health checks are consistent
    When I send 5 consecutive GET requests to "/health"
    Then all responses should have status code 200
    And all responses should contain field "status"

  Scenario: Health check does not timeout
    When I send a GET request to "/health" with 5 second timeout
    Then the response should be received before timeout
    And the response status code should be 200
