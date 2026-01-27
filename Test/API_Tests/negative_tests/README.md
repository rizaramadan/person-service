# 🔴 **NEGATIVE TEST CASES**

## 📋 **Overview**

Negative test cases verify that the API **correctly rejects invalid requests** and **handles error scenarios gracefully**.

**Purpose:**
- ✅ Verify proper error handling
- ✅ Test input validation
- ✅ Check authentication/authorization
- ✅ Ensure security (SQL injection, XSS, etc.)
- ✅ Test boundary conditions
- ✅ Verify API doesn't crash on bad input

---

## 📂 **Test Files**

Total: **5 Negative Test Files** covering all 10 API endpoints

```
negative_tests/
├── GET_health_negative.test.js                           (5 tests)
├── POST_api_key-value_negative.test.js                   (20 tests)
├── GET_api_key-value_key_negative.test.js                (16 tests)
├── DELETE_api_key-value_key_negative.test.js             (17 tests)
└── POST_persons_personId_attributes_negative.test.js     (28 tests)

Total: ~86 Negative Tests
```

---

## 🎯 **What Each File Tests**

### **1. GET_health_negative.test.js**

**Tests:** 5 negative scenarios

**Categories:**
- ❌ Invalid HTTP methods (POST instead of GET)
- ❌ Invalid paths (/healths vs /health)
- ✅ Query parameters handling
- ✅ Timeout handling
- ✅ Invalid Accept headers

**Expected Results:**
- Invalid methods → 404/405
- Invalid paths → 404
- Query params → Ignored (200 OK)
- Malformed headers → Handled gracefully

---

### **2. POST_api_key-value_negative.test.js**

**Tests:** 20 negative scenarios

**Categories:**
- ❌ Missing required fields (key, value)
- ❌ Empty/null values
- ❌ Invalid data types (number, object, array as key)
- ❌ Malformed JSON
- ❌ Wrong Content-Type
- ❌ Extremely long inputs (10KB key, 1MB value)
- ❌ Whitespace-only values
- ❌ Special characters
- ✅ Extra fields (should be ignored)

**Expected Results:**
- Missing fields → 400 Bad Request
- Empty values → 400 Bad Request
- Invalid types → 400 Bad Request
- Malformed JSON → 400/500
- Too large → 400/413 Payload Too Large
- Extra fields → Ignored (200 OK)

---

### **3. GET_api_key-value_key_negative.test.js**

**Tests:** 16 negative scenarios

**Categories:**
- ❌ Non-existent keys
- ❌ Empty key parameter
- ❌ URL-encoded special characters
- ❌ Path traversal attempts (../../../etc/passwd)
- ❌ Invalid HTTP methods (PUT, POST on GET endpoint)
- ❌ Malformed requests
- ❌ Query parameters (should be ignored)
- ❌ SQL injection in key
- ❌ Null bytes in key
- ❌ Very long keys (2000 chars)
- ✅ Case sensitivity

**Expected Results:**
- Non-existent → 404 Not Found
- Path traversal → 400/404 (prevented)
- SQL injection → 400/404 (not executed)
- Invalid methods → 404/405
- Null bytes → 400/404
- Too long → 400/414 URI Too Long

---

### **4. DELETE_api_key-value_key_negative.test.js**

**Tests:** 17 negative scenarios

**Categories:**
- ✅ Delete non-existent key (idempotent)
- ✅ Double delete
- ❌ Empty key
- ❌ Whitespace-only key
- ❌ Invalid HTTP methods
- ✅ Request body (should be ignored)
- ❌ SQL injection in key
- ❌ Path traversal
- ❌ XSS payload in key
- ✅ Concurrent deletes
- ✅ Invalid headers (should be ignored)
- ✅ URL encoding

**Expected Results:**
- Non-existent → 200 OK (idempotent) or 404
- Double delete → 200 OK (idempotent)
- SQL injection → Safely handled (not executed)
- Path traversal → 400/404 (prevented)
- Concurrent → All succeed (idempotent)

---

### **5. POST_persons_personId_attributes_negative.test.js**

**Tests:** 28 negative scenarios

**Categories:**
- ❌ **Authentication Errors:**
  - Missing API key
  - Invalid API key
  - Wrong format API key
  
- ❌ **Invalid Person ID:**
  - Non-existent personId
  - Invalid UUID format
  - Empty personId
  
- ❌ **Missing Required Fields:**
  - No key field
  - No meta field
  - Empty meta object
  - No body at all
  
- ❌ **Empty/Null Values:**
  - Empty string as key
  - Null as key
  - Whitespace-only key
  
- ❌ **Invalid Data Types:**
  - Number as key
  - Object as key
  - Array as value
  
- ❌ **Malformed Requests:**
  - Invalid JSON
  - Wrong Content-Type
  
- ❌ **Boundary Conditions:**
  - Extremely long key (10KB)
  - Extremely long value (1MB)
  
- ❌ **Invalid HTTP Methods:**
  - Wrong methods (PATCH)

**Expected Results:**
- No API key → 401 Unauthorized
- Invalid API key → 401 Unauthorized
- Non-existent person → 404 Not Found
- Missing required → 400 Bad Request
- Invalid types → 400 Bad Request
- Too large → 400/413

---

## 🚀 **How to Run**

### **Run All Negative Tests:**

```bash
cd Test

# Run all negative tests
npm run test:negative
```

### **Run Specific Negative Test:**

```bash
# Health endpoint
node --experimental-vm-modules node_modules/jest/bin/jest.js API_Tests/negative_tests/GET_health_negative.test.js

# Key-Value POST
node --experimental-vm-modules node_modules/jest/bin/jest.js API_Tests/negative_tests/POST_api_key-value_negative.test.js

# Key-Value GET
node --experimental-vm-modules node_modules/jest/bin/jest.js API_Tests/negative_tests/GET_api_key-value_key_negative.test.js

# Key-Value DELETE
node --experimental-vm-modules node_modules/jest/bin/jest.js API_Tests/negative_tests/DELETE_api_key-value_key_negative.test.js

# Person Attributes
node --experimental-vm-modules node_modules/jest/bin/jest.js API_Tests/negative_tests/POST_persons_personId_attributes_negative.test.js
```

---

## 📊 **Test Categories Breakdown**

| Category | Tests | Purpose |
|----------|-------|---------|
| **Authentication** | 3 | Verify API key validation |
| **Authorization** | 5 | Check access control |
| **Input Validation** | 25 | Test field validation |
| **Data Types** | 12 | Wrong type rejection |
| **Empty/Null Values** | 10 | Handle missing data |
| **Boundary Conditions** | 8 | Test limits |
| **Security** | 15 | SQL injection, XSS, etc. |
| **HTTP Methods** | 8 | Method validation |

**Total: ~86 Negative Tests**

---

## ✅ **Expected Behaviors**

### **HTTP Status Codes:**

| Status | Meaning | When Used |
|--------|---------|-----------|
| **400** | Bad Request | Invalid input, missing fields |
| **401** | Unauthorized | Missing/invalid API key |
| **404** | Not Found | Resource doesn't exist |
| **405** | Method Not Allowed | Wrong HTTP method |
| **413** | Payload Too Large | Request body too big |
| **414** | URI Too Long | URL too long |
| **415** | Unsupported Media Type | Wrong Content-Type |
| **500** | Internal Server Error | Server error (should be minimal) |

---

## 🎯 **What Makes a Good Negative Test?**

### **1. Test Invalid Input:**
```javascript
test('Should reject empty key', async () => {
  try {
    await apiClient.post('/api/key-value', { key: '', value: 'test' });
    fail('Should have thrown error');
  } catch (error) {
    expect(error.response.status).toBe(400);
  }
});
```

### **2. Test Security:**
```javascript
test('Should prevent SQL injection', async () => {
  const response = await apiClient.delete("/api/key-value/'; DROP TABLE --");
  // Should NOT execute SQL, just return 404 or 200
  expect([200, 404]).toContain(response.status);
});
```

### **3. Test Authentication:**
```javascript
test('Should reject without API key', async () => {
  try {
    await clientWithoutAuth.post('/persons/.../attributes', {...});
    fail('Should have thrown 401');
  } catch (error) {
    expect(error.response.status).toBe(401);
  }
});
```

### **4. Test Boundary Conditions:**
```javascript
test('Should reject extremely long input', async () => {
  const longKey = 'k'.repeat(10000);
  try {
    await apiClient.post('/api/key-value', { key: longKey, value: 'test' });
  } catch (error) {
    expect([400, 413]).toContain(error.response.status);
  }
});
```

---

## 🐛 **Common Issues Negative Tests Find**

### **1. Missing Input Validation:**
- ❌ API accepts empty strings
- ❌ API accepts null values
- ❌ API accepts wrong data types

### **2. Poor Error Messages:**
- ❌ Generic "error" without details
- ❌ Exposing internal errors to users
- ❌ No indication of what went wrong

### **3. Security Vulnerabilities:**
- ❌ SQL injection possible
- ❌ Path traversal not blocked
- ❌ XSS payloads stored unsanitized

### **4. Missing Authentication:**
- ❌ Protected endpoints accessible without auth
- ❌ Invalid API keys accepted
- ❌ Wrong format keys not rejected

### **5. Poor Error Handling:**
- ❌ Server crashes on invalid input
- ❌ 500 errors instead of 400
- ❌ No graceful handling

---

## 📈 **Metrics**

```
Total Negative Tests: 86
├── Authentication: 3
├── Authorization: 5
├── Input Validation: 25
├── Data Types: 12
├── Empty/Null: 10
├── Boundaries: 8
├── Security: 15
└── HTTP Methods: 8

Pass Criteria:
- All invalid inputs rejected ✅
- Proper status codes returned ✅
- Security vulnerabilities blocked ✅
- No server crashes ✅
```

---

## 🎓 **Best Practices**

### **1. Always Test the Negative Path:**
```javascript
// Don't just test success
test('Create works', async () => {
  const response = await create();
  expect(response.status).toBe(201);
});

// Also test failure
test('Create fails without required field', async () => {
  try {
    await create({ /* missing field */ });
    fail('Should have thrown');
  } catch (error) {
    expect(error.response.status).toBe(400);
  }
});
```

### **2. Test ALL Required Fields:**
```javascript
// Test missing each required field
test('Rejects without key');
test('Rejects without value');
test('Rejects without meta');
```

### **3. Test Security:**
```javascript
test('Prevents SQL injection');
test('Prevents XSS');
test('Prevents path traversal');
test('Requires authentication');
```

### **4. Expect Specific Error Codes:**
```javascript
// Be specific
expect(error.response.status).toBe(400);

// Not vague
expect(error.response.status).toBeGreaterThan(399);
```

---

## 🎯 **When to Run Negative Tests**

✅ **Before every deployment**  
✅ **After adding new validation**  
✅ **During security audits**  
✅ **When fixing bugs**  
✅ **In CI/CD pipeline**  

---

## 📝 **Adding New Negative Tests**

### **Template:**

```javascript
test('Should reject [SPECIFIC INVALID INPUT]', async () => {
  try {
    await apiClient.[METHOD]('[ENDPOINT]', {
      // Invalid data here
    });
    fail('Should have thrown error');
  } catch (error) {
    expect(error.response.status).toBe([EXPECTED_STATUS]);
    expect(error.response.data).toHaveProperty('error');
  }
});
```

### **Checklist:**
- [ ] Test name describes what's being rejected
- [ ] Uses `try/catch` with `fail()` for expected errors
- [ ] Asserts specific status code
- [ ] Checks error response structure
- [ ] Cleans up any created data

---

## 🎊 **Summary**

**Negative tests ensure:**
- ✅ API rejects bad input
- ✅ Proper error messages
- ✅ Security vulnerabilities blocked
- ✅ Authentication enforced
- ✅ No server crashes
- ✅ Users get helpful errors

**Remember:** A good API says **NO** to bad requests! 🛑

---

**Run negative tests:** `npm run test:negative`
