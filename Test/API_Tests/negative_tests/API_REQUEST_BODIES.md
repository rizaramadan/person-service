# 📋 API REQUEST BODIES - Negative Tests

**Generated:** January 21, 2026  
**Source:** Negative Test Suite  
**Purpose:** Document all request bodies sent during negative testing

---

## 🔍 **1. POST /api/key-value**

### **Missing Required Fields:**

```json
// Missing 'key' field
{
  "value": "test-value"
}

// Missing 'value' field
{
  "key": "test-key"
}

// Completely empty body
{}
```

### **Empty/Null Values:**

```json
// Empty string as key
{
  "key": "",
  "value": "test-value"
}

// Empty string as value
{
  "key": "test-key",
  "value": ""
}

// Null as key
{
  "key": null,
  "value": "test-value"
}

// Null as value
{
  "key": "test-key",
  "value": null
}
```

### **Invalid Data Types:**

```json
// Number as key
{
  "key": 12345,
  "value": "test-value"
}

// Object as key
{
  "key": { "nested": "object" },
  "value": "test-value"
}

// Array as key
{
  "key": ["array", "value"],
  "value": "test-value"
}

// Boolean as key
{
  "key": true,
  "value": "test-value"
}
```

### **Whitespace Issues:**

```json
// Whitespace-only key
{
  "key": "   ",
  "value": "test-value"
}
```

### **Boundary Conditions:**

```json
// Extremely long key (10KB - 10,000 characters)
{
  "key": "kkkkkkkkkkkkkkkkkkkkkkkkkk...",  // 10,000 'k' characters
  "value": "test-value"
}

// Extremely long value (1MB - 1,000,000 characters)
{
  "key": "long-value-test",
  "value": "vvvvvvvvvvvvvvvvvvvvvvvv...",  // 1,000,000 'v' characters
}
```

### **Special Characters:**

```json
// Key with special characters
{
  "key": "test!@#$%^&*()",
  "value": "test-value"
}
```

### **Extra Fields (Should be ignored):**

```json
{
  "key": "test-key",
  "value": "test-value",
  "extraField1": "should-be-ignored",
  "extraField2": 12345,
  "nested": {
    "object": "ignored"
  }
}
```

### **Malformed JSON:**

```http
Content-Type: application/json

invalid json string
```

### **Wrong Content-Type:**

```http
Content-Type: text/plain

{
  "key": "test",
  "value": "test"
}
```

---

## 🔍 **2. POST /persons/:personId/attributes**

### **Valid Request (Baseline):**

```json
{
  "key": "email",
  "value": "test@example.com",
  "meta": {
    "caller": "test",
    "reason": "automated-testing",
    "traceId": "test-12345"
  }
}
```

### **Missing Required Fields:**

```json
// Missing 'key' field
{
  "value": "test@example.com",
  "meta": {
    "caller": "test",
    "reason": "test",
    "traceId": "123"
  }
}

// Missing 'meta' field
{
  "key": "email",
  "value": "test@example.com"
}

// Empty meta object
{
  "key": "email",
  "value": "test@example.com",
  "meta": {}
}

// No body at all
(null body)
```

### **Empty/Null Values:**

```json
// Empty string as key
{
  "key": "",
  "value": "test@example.com",
  "meta": {
    "caller": "test",
    "reason": "test",
    "traceId": "123"
  }
}

// Null as key
{
  "key": null,
  "value": "test@example.com",
  "meta": {
    "caller": "test",
    "reason": "test",
    "traceId": "123"
  }
}

// Whitespace-only key
{
  "key": "   ",
  "value": "test@example.com",
  "meta": {
    "caller": "test",
    "reason": "test",
    "traceId": "123"
  }
}
```

### **Invalid Data Types:**

```json
// Number as key
{
  "key": 12345,
  "value": "test@example.com",
  "meta": {
    "caller": "test",
    "reason": "test",
    "traceId": "123"
  }
}

// Object as key
{
  "key": { "nested": "object" },
  "value": "test@example.com",
  "meta": {
    "caller": "test",
    "reason": "test",
    "traceId": "123"
  }
}

// Array as value
{
  "key": "test-key",
  "value": ["array", "value"],
  "meta": {
    "caller": "test",
    "reason": "test",
    "traceId": "123"
  }
}
```

### **Boundary Conditions:**

```json
// Extremely long key (10KB)
{
  "key": "kkkkkkkkkkkkkkkkkkkkkkkkkk...",  // 10,000 characters
  "value": "test-value",
  "meta": {
    "caller": "test",
    "reason": "test",
    "traceId": "123"
  }
}

// Extremely long value (1MB)
{
  "key": "long-value",
  "value": "vvvvvvvvvvvvvvvvvvvvvvvv...",  // 1,000,000 characters
  "meta": {
    "caller": "test",
    "reason": "test",
    "traceId": "123"
  }
}
```

### **Invalid Person ID in URL:**

```
POST /persons/00000000-0000-0000-0000-000000000000/attributes
POST /persons/invalid-uuid-format/attributes
POST /persons//attributes  (empty personId)
```

---

## 🔍 **3. PUT /persons/:personId/attributes/:attributeId**

### **Valid Request (Baseline):**

```json
{
  "value": "new-updated-value"
}
```

### **Missing/Invalid Body:**

```json
// No body at all
(null)

// Empty body
{}

// Missing 'value' field
{
  "notValue": "something"
}
```

### **Empty/Null Values:**

```json
// Empty string as value
{
  "value": ""
}

// Null as value
{
  "value": null
}

// Whitespace-only value
{
  "value": "   "
}
```

### **Invalid Data Types:**

```json
// Number as value
{
  "value": 12345
}

// Object as value
{
  "value": { "nested": "object" }
}

// Array as value
{
  "value": ["array", "value"]
}
```

### **Boundary Conditions:**

```json
// Extremely long value (1MB)
{
  "value": "vvvvvvvvvvvvvvvvvvvvvvvv...",  // 1,000,000 characters
}
```

### **Invalid IDs in URL:**

```
PUT /persons/00000000-0000-0000-0000-000000000000/attributes/660e8400-e29b-41d4-a716-446655440000
PUT /persons/invalid-uuid/attributes/660e8400-e29b-41d4-a716-446655440000
PUT /persons/550e8400-e29b-41d4-a716-446655440000/attributes/00000000-0000-0000-0000-000000000000
PUT /persons/550e8400-e29b-41d4-a716-446655440000/attributes/invalid-uuid
```

---

## 🔍 **4. GET /api/key-value/:key**

### **Invalid Keys in URL:**

```
GET /api/key-value/nonexistent-key-123456789
GET /api/key-value/550e8400-e29b-41d4-a716-446655440000  (random UUID)
GET /api/key-value/  (empty key)
GET /api/key-value/../../../etc/passwd  (path traversal)
GET /api/key-value/'; DROP TABLE key_value; --  (SQL injection)
GET /api/key-value/test\x00null  (null byte)
GET /api/key-value/kkkkkkkkkk...  (2000+ characters)
```

### **With Query Parameters:**

```
GET /api/key-value/test-key?param=value
GET /api/key-value/nonexistent?param=value
```

### **With Body (Should be ignored):**

```http
GET /api/key-value/test-key
Content-Type: application/json

{
  "unexpected": "body"
}
```

### **Invalid Headers:**

```http
GET /api/key-value/test-key
Accept: application/xml
```

---

## 🔍 **5. DELETE /api/key-value/:key**

### **Invalid Keys in URL:**

```
DELETE /api/key-value/nonexistent-key-123456789
DELETE /api/key-value/  (empty key)
DELETE /api/key-value/   (whitespace)
DELETE /api/key-value/../../../etc/passwd  (path traversal)
DELETE /api/key-value/'; DROP TABLE key_value; --  (SQL injection)
DELETE /api/key-value/<script>alert("xss")</script>  (XSS)
DELETE /api/key-value/test%20with%20spaces  (URL encoded)
DELETE /api/key-value/test%2Fwith%2Fslashes  (special chars)
```

### **With Body (Should be ignored):**

```http
DELETE /api/key-value/test-key
Content-Type: application/json

{
  "unexpected": "body",
  "shouldBe": "ignored"
}
```

---

## 🔍 **6. GET /persons/:personId/attributes**

### **Invalid Person IDs:**

```
GET /persons/00000000-0000-0000-0000-000000000000/attributes
GET /persons/invalid-uuid/attributes
GET /persons//attributes  (empty personId)
GET /persons/'; DROP TABLE person; --/attributes  (SQL injection)
GET /persons/../../../etc/passwd/attributes  (path traversal)
```

### **With Query Parameters:**

```
GET /persons/550e8400-e29b-41d4-a716-446655440000/attributes?invalid=param&foo=bar
```

### **With Body (Should be ignored):**

```http
GET /persons/550e8400-e29b-41d4-a716-446655440000/attributes
Content-Type: application/json

{
  "unexpected": "body"
}
```

### **Invalid Headers:**

```http
GET /persons/550e8400-e29b-41d4-a716-446655440000/attributes
Accept: application/xml
```

---

## 🔍 **7. GET /persons/:personId/attributes/:attributeId**

### **Invalid IDs:**

```
GET /persons/00000000-0000-0000-0000-000000000000/attributes/660e8400-e29b-41d4-a716-446655440000
GET /persons/550e8400-e29b-41d4-a716-446655440000/attributes/00000000-0000-0000-0000-000000000000
GET /persons/invalid-uuid/attributes/660e8400-e29b-41d4-a716-446655440000
GET /persons/550e8400-e29b-41d4-a716-446655440000/attributes/invalid-uuid
GET /persons/invalid/attributes/also-invalid
GET /persons//attributes/660e8400-e29b-41d4-a716-446655440000  (empty personId)
GET /persons/550e8400-e29b-41d4-a716-446655440000/attributes/  (empty attributeId)
```

### **Security Tests:**

```
GET /persons/'; DROP TABLE person; --/attributes/660e8400-e29b-41d4-a716-446655440000
GET /persons/550e8400-e29b-41d4-a716-446655440000/attributes/'; DROP TABLE person_attributes; --
GET /persons/../../../etc/passwd/attributes/660e8400-e29b-41d4-a716-446655440000
```

---

## 🔍 **8. DELETE /persons/:personId/attributes/:attributeId**

### **Invalid IDs:**

```json
DELETE /persons/00000000-0000-0000-0000-000000000000/attributes/660e8400-e29b-41d4-a716-446655440000
DELETE /persons/550e8400-e29b-41d4-a716-446655440000/attributes/00000000-0000-0000-0000-000000000000
DELETE /persons/invalid-uuid/attributes/660e8400-e29b-41d4-a716-446655440000
DELETE /persons/550e8400-e29b-41d4-a716-446655440000/attributes/invalid-uuid
DELETE /persons/invalid/attributes/also-invalid
DELETE /persons//attributes/660e8400-e29b-41d4-a716-446655440000
DELETE /persons/550e8400-e29b-41d4-a716-446655440000/attributes/
```

### **With Body (Should be ignored):**

```http
DELETE /persons/550e8400-e29b-41d4-a716-446655440000/attributes/660e8400-e29b-41d4-a716-446655440000
Content-Type: application/json

{
  "unexpected": "body",
  "shouldBe": "ignored"
}
```

### **Security Tests:**

```
DELETE /persons/'; DROP TABLE person; --/attributes/660e8400-e29b-41d4-a716-446655440000
DELETE /persons/550e8400-e29b-41d4-a716-446655440000/attributes/'; DROP TABLE person_attributes; --
DELETE /persons/../../../etc/passwd/attributes/660e8400-e29b-41d4-a716-446655440000
DELETE /persons/550e8400-e29b-41d4-a716-446655440000/attributes/<script>alert("xss")</script>
```

---

## 🔍 **9. Authentication Tests**

### **Missing API Key:**

```http
POST /persons/550e8400-e29b-41d4-a716-446655440000/attributes
Content-Type: application/json
(No x-api-key header)

{
  "key": "email",
  "value": "test@example.com",
  "meta": {
    "caller": "test",
    "reason": "test",
    "traceId": "123"
  }
}
```

### **Invalid API Key:**

```http
POST /persons/550e8400-e29b-41d4-a716-446655440000/attributes
Content-Type: application/json
x-api-key: invalid-key-12345

{
  "key": "email",
  "value": "test@example.com",
  "meta": {
    "caller": "test",
    "reason": "test",
    "traceId": "123"
  }
}
```

### **Wrong Format API Key:**

```http
POST /persons/550e8400-e29b-41d4-a716-446655440000/attributes
Content-Type: application/json
x-api-key: wrong-format-no-uuid

{
  "key": "email",
  "value": "test@example.com",
  "meta": {
    "caller": "test",
    "reason": "test",
    "traceId": "123"
  }
}
```

---

## 📊 **REQUEST BODY SUMMARY BY CATEGORY**

### **Missing Fields:**
- Missing `key`
- Missing `value`
- Missing `meta`
- Empty body `{}`
- No body at all

### **Empty/Null Values:**
- Empty string `""`
- Null `null`
- Whitespace-only `"   "`

### **Invalid Data Types:**
- Number instead of string
- Object instead of string
- Array instead of string
- Boolean instead of string

### **Boundary Conditions:**
- Very long key (10KB)
- Very long value (1MB)
- Very long URL (2000+ chars)

### **Security Tests:**
- SQL injection patterns
- XSS payloads
- Path traversal attempts
- Null byte injection

### **Invalid IDs:**
- Non-existent UUIDs
- Invalid UUID formats
- Empty IDs in URL

### **Malformed Requests:**
- Invalid JSON
- Wrong Content-Type
- Request body on GET/DELETE
- Invalid headers

---

## 🎯 **HOW TO USE THIS DOCUMENT**

### **For Developers:**
- Copy request bodies to test manually
- Use in Postman/Insomnia
- Reference for fixing validation

### **For QA:**
- Create manual test cases
- Verify expected responses
- Document edge cases

### **For API Documentation:**
- Show example of invalid requests
- Document validation rules
- Explain error scenarios

---

## 📝 **NOTES**

1. **All requests use:**
   - Base URL: `http://localhost:3000`
   - Headers: `Content-Type: application/json`
   - Auth: `x-api-key: person-service-key-82aca3c8-8e5d-42d4-9b00-7bc2f3077a58` (for protected endpoints)

2. **Expected Status Codes:**
   - `400` - Bad Request (validation errors)
   - `401` - Unauthorized (missing/invalid API key)
   - `404` - Not Found (resource doesn't exist)
   - `405` - Method Not Allowed (wrong HTTP method)
   - `413` - Payload Too Large (input too big)
   - `415` - Unsupported Media Type (wrong Content-Type)
   - `500` - Internal Server Error (BUGS - should be fixed!)

3. **Test Files Location:**
   - All tests in: `Test/API_Tests/negative_tests/`
   - Run with: `npm run test:negative`

---

**Generated from:** Negative Test Suite  
**Last Updated:** January 21, 2026  
**Total Request Bodies Documented:** 100+ scenarios
