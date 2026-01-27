# 🐛 GitHub Issues - Bug Reports from Negative Tests

Generated from Negative Test Results - January 21, 2026

---

## Issue #1: [CRITICAL] Server Crash - 500 Error for Non-Existent Person

**Labels:** `bug`, `critical`, `security`, `P0`

**Priority:** 🔴 P0 - Fix Immediately

**Assignee:** Backend Team Lead

### 📋 Description

API returns `500 Internal Server Error` when querying non-existent person IDs, indicating unhandled null pointer exception. This should return `404 Not Found` instead.

### 🐛 Bug Details

- **Severity:** CRITICAL
- **Occurrences:** 7 instances found
- **Affected Endpoints:** 
  - `GET /persons/:personId/attributes`
  - `POST /persons/:personId/attributes`

### 🧪 Steps to Reproduce

```bash
# Step 1: Send GET request with non-existent person ID
curl -X GET "http://localhost:3000/persons/00000000-0000-0000-0000-000000000000/attributes" \
  -H "x-api-key: person-service-key-82aca3c8-8e5d-42d4-9b00-7bc2f3077a58"

# Step 2: Observe response
```

### ❌ Current Behavior

```http
HTTP/1.1 500 Internal Server Error
Content-Type: application/json

{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred"
}
```

Server logs show:
```
panic: runtime error: invalid memory address or nil pointer dereference
```

### ✅ Expected Behavior

```http
HTTP/1.1 404 Not Found
Content-Type: application/json

{
  "error": "Person not found",
  "message": "Person with ID 00000000-0000-0000-0000-000000000000 does not exist"
}
```

### 💥 Impact

- ❌ Server crashes/errors not handled properly
- ❌ Users receive unhelpful error messages
- ❌ Potential security vulnerability (information disclosure)
- ❌ Server logs filled with stack traces
- ❌ Monitoring alerts triggered unnecessarily

### 🔧 Suggested Fix

```go
// In person_attributes.go - GetAllAttributes handler

// Add null check for person
person, err := db.GetPersonByID(personID)
if err != nil || person == nil {
    return c.JSON(404, map[string]string{
        "error": "Person not found",
        "message": fmt.Sprintf("Person with ID %s does not exist", personID),
    })
}
```

### 📝 Additional Context

- Found by: Automated negative tests
- Test file: `GET_persons_personId_attributes_negative.test.js`
- Related endpoints also affected: POST /persons/:personId/attributes

### ✅ Acceptance Criteria

- [ ] GET /persons/{non-existent-id}/attributes returns 404
- [ ] POST /persons/{non-existent-id}/attributes returns 404
- [ ] Error message is clear and helpful
- [ ] No 500 errors in logs
- [ ] All negative tests pass

---

## Issue #2: [MEDIUM] Inconsistent HTTP Status Codes (400 vs 404)

**Labels:** `bug`, `api-design`, `medium`, `P2`

**Priority:** 🟡 P2 - Next Sprint

**Assignee:** API Team

### 📋 Description

API returns `400 Bad Request` for resources that don't exist when it should return `404 Not Found`. This violates REST API best practices and makes it difficult for clients to distinguish between validation errors and missing resources.

### 🐛 Bug Details

- **Severity:** MEDIUM
- **Occurrences:** 12 instances found
- **Affected Endpoints:**
  - `PUT /persons/:personId/attributes/:attributeId`
  - `DELETE /persons/:personId/attributes/:attributeId`
  - `GET /persons/:personId/attributes/:attributeId`

### 🧪 Steps to Reproduce

```bash
# Test 1: Update non-existent attribute
curl -X PUT "http://localhost:3000/persons/{valid-person-id}/attributes/00000000-0000-0000-0000-000000000000" \
  -H "x-api-key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"value": "new-value"}'

# Observe: Returns 400 instead of 404
```

### ❌ Current Behavior

```http
HTTP/1.1 400 Bad Request

{
  "error": "Bad Request",
  "message": "Invalid request"
}
```

### ✅ Expected Behavior

```http
HTTP/1.1 404 Not Found

{
  "error": "Attribute not found",
  "message": "Attribute with ID 00000000-0000-0000-0000-000000000000 does not exist"
}
```

### 💥 Impact

- Client cannot distinguish between "invalid input" and "resource not found"
- Inconsistent with REST API best practices
- Makes debugging harder for client developers
- Complicates error handling on client side

### 📚 HTTP Status Code Guidelines

| Status Code | When to Use | Example |
|-------------|-------------|---------|
| **400 Bad Request** | Request format/validation error | Missing required field, invalid data type |
| **404 Not Found** | Resource doesn't exist | Person ID or Attribute ID not in database |

### 🔧 Suggested Fix

```go
// In UpdateAttribute handler
attribute, err := db.GetAttributeByID(attributeID)
if err != nil || attribute == nil {
    return c.JSON(404, map[string]string{
        "error": "Attribute not found",
        "message": fmt.Sprintf("Attribute with ID %s does not exist", attributeID),
    })
}

// Continue with update logic...
```

### ✅ Acceptance Criteria

- [ ] PUT to non-existent attribute returns 404
- [ ] DELETE non-existent attribute returns 404
- [ ] GET non-existent attribute returns 404
- [ ] Error messages clearly indicate resource not found
- [ ] All negative tests pass
- [ ] API documentation updated

---

## Issue #3: [MEDIUM] Whitespace-Only Values Accepted as Valid

**Labels:** `bug`, `validation`, `data-quality`, `medium`, `P2`

**Priority:** 🟡 P2 - Next Sprint

**Assignee:** Backend Team

### 📋 Description

API accepts strings containing only whitespace (spaces, tabs, newlines) as valid values, allowing "dirty data" to be stored in the database.

### 🐛 Bug Details

- **Severity:** MEDIUM
- **Occurrences:** 2 endpoints affected
- **Affected Endpoints:**
  - `POST /api/key-value`
  - `POST /persons/:personId/attributes`

### 🧪 Steps to Reproduce

```bash
# Test 1: Create key-value with whitespace-only key
curl -X POST "http://localhost:3000/api/key-value" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "   ",
    "value": "test-value"
  }'

# Observe: Returns 201 Created (should be 400)
```

### ❌ Current Behavior

```http
HTTP/1.1 201 Created

{
  "message": "Created successfully"
}
```

Database stores: `key = "   "` (whitespace)

### ✅ Expected Behavior

```http
HTTP/1.1 400 Bad Request

{
  "error": "Validation failed",
  "message": "Key cannot be empty or whitespace only"
}
```

### 💥 Impact

- ❌ Dirty data enters database
- ❌ Whitespace stored as valid keys
- ❌ Difficult to search, query, or filter data
- ❌ Potential key collisions
- ❌ Database performance degradation

### 🔧 Suggested Fix

```go
// Add validation function
func validateKey(key string) error {
    // Trim whitespace
    trimmedKey := strings.TrimSpace(key)
    
    // Check if empty after trim
    if trimmedKey == "" {
        return errors.New("Key cannot be empty or whitespace only")
    }
    
    return nil
}

// Use in handler
if err := validateKey(request.Key); err != nil {
    return c.JSON(400, map[string]string{
        "error": "Validation failed",
        "message": err.Error(),
    })
}
```

### ✅ Acceptance Criteria

- [ ] Whitespace-only keys are rejected with 400
- [ ] Whitespace-only values are rejected with 400
- [ ] Leading/trailing whitespace is trimmed automatically
- [ ] Error message explains the validation failure
- [ ] Database cleanup of existing whitespace keys
- [ ] All negative tests pass

---

## Issue #4: [MEDIUM] Empty Meta Object Accepted

**Labels:** `bug`, `validation`, `audit`, `medium`, `P2`

**Priority:** 🟡 P2 - Next Sprint

**Assignee:** Backend Team

### 📋 Description

API accepts `meta: {}` (empty meta object) when creating person attributes, even though `caller`, `reason`, and `traceId` are required for audit trail purposes.

### 🐛 Bug Details

- **Severity:** MEDIUM
- **Occurrences:** 1 endpoint
- **Affected Endpoint:** `POST /persons/:personId/attributes`

### 🧪 Steps to Reproduce

```bash
curl -X POST "http://localhost:3000/persons/{person-id}/attributes" \
  -H "x-api-key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "email",
    "value": "test@example.com",
    "meta": {}
  }'

# Observe: Returns 201 Created (should be 400)
```

### ❌ Current Behavior

```http
HTTP/1.1 201 Created

{
  "id": "...",
  "key": "email",
  "value": "...",
  "meta": {}
}
```

### ✅ Expected Behavior

```http
HTTP/1.1 400 Bad Request

{
  "error": "Invalid meta object",
  "message": "Meta object must contain caller, reason, and traceId fields"
}
```

### 💥 Impact

- ❌ Incomplete audit trail (missing caller, reason, traceId)
- ❌ Cannot track who made changes
- ❌ Compliance issues (GDPR, audit requirements)
- ❌ Debugging difficult without trace information

### 🔧 Suggested Fix

```go
// Validate meta object
func validateMeta(meta Meta) error {
    if meta.Caller == "" {
        return errors.New("Meta.caller is required")
    }
    if meta.Reason == "" {
        return errors.New("Meta.reason is required")
    }
    if meta.TraceID == "" {
        return errors.New("Meta.traceId is required")
    }
    return nil
}

// Use in handler
if err := validateMeta(request.Meta); err != nil {
    return c.JSON(400, map[string]string{
        "error": "Invalid meta object",
        "message": err.Error(),
    })
}
```

### ✅ Acceptance Criteria

- [ ] Empty meta object returns 400
- [ ] Missing caller field returns 400
- [ ] Missing reason field returns 400
- [ ] Missing traceId field returns 400
- [ ] Clear error messages for each validation
- [ ] API documentation updated
- [ ] All negative tests pass

---

## Issue #5: [HIGH] Long Input Causes 500 Error (Potential DoS)

**Labels:** `bug`, `security`, `high`, `P1`, `DoS`

**Priority:** 🟠 P1 - This Week

**Assignee:** Security Team + Backend Team

### 📋 Description

Extremely long inputs (10KB key, 1MB value, 2000 char URL) cause `500 Internal Server Error` instead of proper validation errors. This can be exploited for Denial of Service (DoS) attacks.

### 🐛 Bug Details

- **Severity:** HIGH (Security Risk)
- **Occurrences:** 3 endpoints
- **Affected Endpoints:**
  - `POST /api/key-value` (10KB key, 1MB value)
  - `GET /api/key-value/:key` (2000 char key in URL)

### 🧪 Steps to Reproduce

```bash
# Test 1: Very long key (10KB)
KEY=$(python3 -c "print('k' * 10000)")
curl -X POST "http://localhost:3000/api/key-value" \
  -H "Content-Type: application/json" \
  -d "{\"key\": \"$KEY\", \"value\": \"test\"}"

# Observe: Returns 500 Internal Server Error
```

### ❌ Current Behavior

```http
HTTP/1.1 500 Internal Server Error

{
  "error": "Internal Server Error"
}
```

Server logs show memory/processing errors.

### ✅ Expected Behavior

```http
HTTP/1.1 400 Bad Request
or
HTTP/1.1 413 Payload Too Large

{
  "error": "Input too large",
  "message": "Key length exceeds maximum of 1000 characters"
}
```

### 💥 Impact

- 🚨 **SECURITY RISK:** Can be used for DoS attack
- ❌ Server crash when processing very large input
- ❌ Memory consumption increases drastically
- ❌ Database can overflow with large data
- ❌ Response time very slow for subsequent requests

### 🔧 Suggested Fix

```go
// Add length validation
const (
    MAX_KEY_LENGTH   = 1000   // 1KB max
    MAX_VALUE_LENGTH = 100000 // 100KB max
)

// Validate before processing
if len(request.Key) > MAX_KEY_LENGTH {
    return c.JSON(400, map[string]string{
        "error": "Key too long",
        "message": fmt.Sprintf("Key length exceeds maximum of %d characters", MAX_KEY_LENGTH),
    })
}

if len(request.Value) > MAX_VALUE_LENGTH {
    return c.JSON(413, map[string]string{
        "error": "Payload too large",
        "message": fmt.Sprintf("Value length exceeds maximum of %d characters", MAX_VALUE_LENGTH),
    })
}
```

### 🛡️ Security Recommendations

1. Add request size limits at middleware level
2. Implement rate limiting to prevent abuse
3. Add monitoring for abnormally large requests
4. Consider adding WAF rules

### ✅ Acceptance Criteria

- [ ] Keys > 1KB are rejected with 400
- [ ] Values > 100KB are rejected with 413
- [ ] URL paths > 2KB are rejected
- [ ] No 500 errors for large inputs
- [ ] Request size limits documented
- [ ] Load testing performed
- [ ] All negative tests pass

---

## Issue #6: [LOW] Error Message Case Inconsistency

**Labels:** `enhancement`, `code-quality`, `low`, `P3`

**Priority:** 🟢 P3 - Backlog

**Assignee:** Backend Team

### 📋 Description

Error messages use inconsistent casing for field names (e.g., "Key is required" vs "key is required"), creating minor inconsistency with JSON field naming convention.

### 🐛 Bug Details

- **Severity:** LOW
- **Occurrences:** Multiple endpoints
- **Issue Type:** Code quality / Consistency

### 🧪 Example

```bash
curl -X POST "http://localhost:3000/api/key-value" \
  -H "Content-Type: application/json" \
  -d '{"value": "test"}'

# Response message: "Key is required"
# Expected: "key is required" (lowercase, matching JSON field name)
```

### 💥 Impact

- Minor inconsistency in API responses
- Not aligned with JSON field naming (camelCase/lowercase)

### 🔧 Suggested Fix

```go
// Standardize error messages
return c.JSON(400, map[string]string{
    "error": "Validation failed",
    "message": "key is required",  // lowercase to match JSON field
})
```

### ✅ Acceptance Criteria

- [ ] All error messages use lowercase field names
- [ ] Error message style guide created
- [ ] Existing messages updated
- [ ] API documentation updated

---

## 📊 Issue Summary

| Issue # | Title | Severity | Priority | Occurrences |
|---------|-------|----------|----------|-------------|
| 1 | Server Crash (500 Error) | CRITICAL | P0 | 7 |
| 5 | Long Input DoS | HIGH | P1 | 3 |
| 2 | Inconsistent Error Codes | MEDIUM | P2 | 12 |
| 3 | Whitespace Values Accepted | MEDIUM | P2 | 2 |
| 4 | Empty Meta Object | MEDIUM | P2 | 1 |
| 6 | Error Message Case | LOW | P3 | 1 |

**Total Bugs:** 26 instances across 6 bug types

---

## 🎯 Sprint Planning Suggestion

### Sprint 1 (This Week):
- Issue #1 (Critical)
- Issue #5 (High - Security)

### Sprint 2 (Next 2 Weeks):
- Issue #2 (Medium)
- Issue #3 (Medium)
- Issue #4 (Medium)

### Backlog:
- Issue #6 (Low)

---

## 📝 Notes for Team

- All bugs discovered through automated negative testing
- Test files available in `Test/API_Tests/negative_tests/`
- Full HTML report: `BUG_REPORT_NEGATIVE_TESTS.html`
- Run tests: `npm run test:negative`

**Generated:** January 21, 2026  
**Source:** Negative Test Suite (149 tests)  
**Pass Rate:** 84% (125 passed, 24 failed)
