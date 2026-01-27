# 🐛 BUG FIX REQUEST - CRITICAL: 500 Error for Non-Existent Person

**Priority:** 🔴 **P0 - CRITICAL - Fix Immediately**  
**Severity:** CRITICAL  
**Reported:** January 21, 2026  
**Status:** 🔴 **NOT FIXED**

---

## 📋 **EXECUTIVE SUMMARY**

API mengembalikan **500 Internal Server Error** ketika seharusnya mengembalikan **404 Not Found** untuk person ID yang tidak ada di database. Ini menyebabkan server crash dan user experience yang buruk.

**Impact:**
- ❌ Server crash/error tidak tertangani
- ❌ User mendapat error message yang tidak jelas
- ❌ Potensi security vulnerability (information disclosure)
- ❌ Server logs penuh dengan stack traces
- ❌ Monitoring alerts false positive

**Affected Endpoints:**
- `GET /persons/:personId/attributes`
- `POST /persons/:personId/attributes`

---

## 🔍 **ROOT CAUSE**

**Problem:** Null pointer exception ketika person tidak ditemukan di database.

**Location:** Handler untuk `GetAllAttributes` dan `CreateAttribute` di `person_attributes.go`

**Issue:** Code tidak melakukan null check setelah query database, langsung mengakses property person yang nil.

---

## 🧪 **REPRODUCTION STEPS**

### **Test Case 1: GET Non-Existent Person Attributes**

```bash
# Request
GET http://localhost:3000/persons/00000000-0000-0000-0000-000000000000/attributes
Headers:
  x-api-key: person-service-key-82aca3c8-8e5d-42d4-9b00-7bc2f3077a58

# Expected Response
HTTP/1.1 404 Not Found
Content-Type: application/json

{
  "error": "Person not found",
  "message": "Person with ID 00000000-0000-0000-0000-000000000000 does not exist"
}

# Actual Response (BUG)
HTTP/1.1 500 Internal Server Error
Content-Type: application/json

{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred"
}

# Server Logs
panic: runtime error: invalid memory address or nil pointer dereference
```

### **Test Case 2: POST Attribute to Non-Existent Person**

```bash
# Request
POST http://localhost:3000/persons/00000000-0000-0000-0000-000000000000/attributes
Headers:
  x-api-key: person-service-key-82aca3c8-8e5d-42d4-9b00-7bc2f3077a58
  Content-Type: application/json

Body:
{
  "key": "email",
  "value": "test@example.com",
  "meta": {
    "caller": "test",
    "reason": "automated-testing",
    "traceId": "test-12345"
  }
}

# Expected Response
HTTP/1.1 404 Not Found
Content-Type: application/json

{
  "error": "Person not found",
  "message": "Person with ID 00000000-0000-0000-0000-000000000000 does not exist"
}

# Actual Response (BUG)
HTTP/1.1 500 Internal Server Error
Content-Type: application/json

{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred"
}
```

### **Test Case 3: GET with Query Parameters**

```bash
# Request
GET http://localhost:3000/persons/550e8400-e29b-41d4-a716-446655440000/attributes?invalid=param&foo=bar
Headers:
  x-api-key: person-service-key-82aca3c8-8e5d-42d4-9b00-7bc2f3077a58

# Expected: 404 (if person doesn't exist) or 200 (if exists, ignore query params)
# Actual: 500 Internal Server Error
```

### **Test Case 4: GET with Invalid Accept Header**

```bash
# Request
GET http://localhost:3000/persons/550e8400-e29b-41d4-a716-446655440000/attributes
Headers:
  x-api-key: person-service-key-82aca3c8-8e5d-42d4-9b00-7bc2f3077a58
  Accept: application/xml

# Expected: 200 or 406 Not Acceptable
# Actual: 500 Internal Server Error
```

### **Test Case 5: GET with Body (Should be ignored)**

```bash
# Request
GET http://localhost:3000/persons/550e8400-e29b-41d4-a716-446655440000/attributes
Headers:
  x-api-key: person-service-key-82aca3c8-8e5d-42d4-9b00-7bc2f3077a58
  Content-Type: application/json

Body:
{
  "unexpected": "body"
}

# Expected: 200 or 404 (body should be ignored)
# Actual: 500 Internal Server Error
```

---

## 📊 **ALL FAILING TEST CASES**

| # | Endpoint | Method | Person ID | Expected | Actual | Status |
|---|----------|--------|-----------|----------|--------|--------|
| 1 | `/persons/00000000-0000-0000-0000-000000000000/attributes` | GET | Non-existent | 404 | 500 | ❌ FAIL |
| 2 | `/persons/00000000-0000-0000-0000-000000000000/attributes` | POST | Non-existent | 404 | 500 | ❌ FAIL |
| 3 | `/persons/550e8400-e29b-41d4-a716-446655440000/attributes?invalid=param` | GET | Non-existent | 404 | 500 | ❌ FAIL |
| 4 | `/persons/550e8400-e29b-41d4-a716-446655440000/attributes` (with body) | GET | Non-existent | 404 | 500 | ❌ FAIL |
| 5 | `/persons/550e8400-e29b-41d4-a716-446655440000/attributes` (Accept: xml) | GET | Non-existent | 404/406 | 500 | ❌ FAIL |
| 6 | `/persons/550e8400-e29b-41d4-a716-446655440000/attributes?invalid=param` | GET | Non-existent | 404 | 500 | ❌ FAIL |
| 7 | `/persons/550e8400-e29b-41d4-a716-446655440000/attributes` (with body) | GET | Non-existent | 404 | 500 | ❌ FAIL |

**Total Failures:** 7 test cases

---

## 🔧 **RECOMMENDED FIX**

### **Fix for GetAllAttributes Handler:**

```go
// File: source/app/person_attributes/person_attributes.go
// Function: GetAllAttributes

func (h *Handler) GetAllAttributes(c echo.Context) error {
    personID := c.Param("personId")
    
    // Validate UUID format
    if _, err := uuid.Parse(personID); err != nil {
        return c.JSON(400, map[string]string{
            "error": "Invalid person ID format",
            "message": "Person ID must be a valid UUID",
        })
    }
    
    // Get person from database
    person, err := h.db.GetPersonByID(personID)
    if err != nil {
        // Log error for debugging
        log.Printf("Error getting person %s: %v", personID, err)
        return c.JSON(500, map[string]string{
            "error": "Database error",
            "message": "Failed to query person",
        })
    }
    
    // ✅ ADD THIS NULL CHECK
    if person == nil {
        return c.JSON(404, map[string]string{
            "error": "Person not found",
            "message": fmt.Sprintf("Person with ID %s does not exist", personID),
        })
    }
    
    // Continue with existing logic...
    // ... rest of the function
}
```

### **Fix for CreateAttribute Handler:**

```go
// File: source/app/person_attributes/person_attributes.go
// Function: CreateAttribute

func (h *Handler) CreateAttribute(c echo.Context) error {
    personID := c.Param("personId")
    
    // Validate UUID format
    if _, err := uuid.Parse(personID); err != nil {
        return c.JSON(400, map[string]string{
            "error": "Invalid person ID format",
            "message": "Person ID must be a valid UUID",
        })
    }
    
    // Get person from database
    person, err := h.db.GetPersonByID(personID)
    if err != nil {
        log.Printf("Error getting person %s: %v", personID, err)
        return c.JSON(500, map[string]string{
            "error": "Database error",
            "message": "Failed to query person",
        })
    }
    
    // ✅ ADD THIS NULL CHECK
    if person == nil {
        return c.JSON(404, map[string]string{
            "error": "Person not found",
            "message": fmt.Sprintf("Person with ID %s does not exist", personID),
        })
    }
    
    // Continue with existing logic...
    // ... rest of the function
}
```

### **Alternative: Check in Database Layer**

If you prefer to handle this in the database layer:

```go
// In database layer
func (db *DB) GetPersonByID(personID string) (*Person, error) {
    var person Person
    err := db.QueryRow(`
        SELECT id, client_id, created_at, updated_at 
        FROM person 
        WHERE id = $1 AND deleted_at IS NULL
    `, personID).Scan(&person.ID, &person.ClientID, &person.CreatedAt, &person.UpdatedAt)
    
    if err == sql.ErrNoRows {
        // Return nil, nil to indicate not found (not an error)
        return nil, nil
    }
    if err != nil {
        return nil, err
    }
    
    return &person, nil
}
```

Then in handler:

```go
person, err := h.db.GetPersonByID(personID)
if err != nil {
    return c.JSON(500, map[string]string{
        "error": "Database error",
        "message": "Failed to query person",
    })
}
if person == nil {
    return c.JSON(404, map[string]string{
        "error": "Person not found",
        "message": fmt.Sprintf("Person with ID %s does not exist", personID),
    })
}
```

---

## ✅ **ACCEPTANCE CRITERIA**

After fix, all these should pass:

- [ ] `GET /persons/00000000-0000-0000-0000-000000000000/attributes` returns **404**, not 500
- [ ] `POST /persons/00000000-0000-0000-0000-000000000000/attributes` returns **404**, not 500
- [ ] Error message is clear: `"Person not found"`
- [ ] No 500 errors in logs for non-existent person IDs
- [ ] All 7 failing negative tests pass
- [ ] No regression in existing functionality
- [ ] Response time is acceptable (< 200ms)

---

## 🧪 **TESTING INSTRUCTIONS**

### **1. Manual Testing:**

```bash
# Test 1: GET non-existent person
curl -X GET "http://localhost:3000/persons/00000000-0000-0000-0000-000000000000/attributes" \
  -H "x-api-key: person-service-key-82aca3c8-8e5d-42d4-9b00-7bc2f3077a58"

# Expected: 404 with clear error message
# Should NOT return 500

# Test 2: POST to non-existent person
curl -X POST "http://localhost:3000/persons/00000000-0000-0000-0000-000000000000/attributes" \
  -H "x-api-key: person-service-key-82aca3c8-8e5d-42d4-9b00-7bc2f3077a58" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "email",
    "value": "test@example.com",
    "meta": {
      "caller": "test",
      "reason": "test",
      "traceId": "123"
    }
  }'

# Expected: 404 with clear error message
# Should NOT return 500
```

### **2. Automated Testing:**

```bash
# Run negative tests
cd Test
npm run test:negative

# Specifically test these endpoints
npm test -- API_Tests/negative_tests/GET_persons_personId_attributes_negative.test.js
npm test -- API_Tests/negative_tests/POST_persons_personId_attributes_negative.test.js

# All tests should pass
```

### **3. Verify No Regressions:**

```bash
# Run all tests to ensure no breaking changes
npm run test:all

# Check that existing functionality still works
# Test with valid person IDs
```

---

## 📝 **ADDITIONAL NOTES**

### **Error Handling Best Practices:**

1. **Always check for nil** after database queries
2. **Return appropriate HTTP status codes:**
   - `400` - Bad Request (invalid input format)
   - `404` - Not Found (resource doesn't exist)
   - `500` - Internal Server Error (only for unexpected errors)
3. **Provide clear error messages** to help debugging
4. **Log errors** for monitoring and debugging
5. **Don't expose internal errors** to clients

### **Code Review Checklist:**

- [ ] Null check added after `GetPersonByID`
- [ ] Returns 404 (not 500) for non-existent person
- [ ] Error message is clear and helpful
- [ ] UUID validation added
- [ ] Error logging implemented
- [ ] No sensitive information in error messages
- [ ] Unit tests updated
- [ ] Integration tests pass

---

## 🚀 **DEPLOYMENT CHECKLIST**

Before deploying to production:

- [ ] Code reviewed and approved
- [ ] All negative tests pass
- [ ] All existing tests pass (no regressions)
- [ ] Manual testing completed
- [ ] Error messages verified
- [ ] Logs checked (no 500 errors for this case)
- [ ] Deployed to staging
- [ ] Verified in staging environment
- [ ] Ready for production deployment

---

## 📞 **CONTACT**

**Test Files Location:**
- `Test/API_Tests/negative_tests/GET_persons_personId_attributes_negative.test.js`
- `Test/API_Tests/negative_tests/POST_persons_personId_attributes_negative.test.js`

**Full Bug Report:**
- `Test/API_Tests/negative_tests/BUG_REPORT_NEGATIVE_TESTS.html`

**Run Tests:**
```bash
cd Test
npm run test:negative
```

---

## ⚠️ **URGENCY**

**This is a CRITICAL bug that:**
- Causes server crashes
- Affects user experience
- Could be a security vulnerability
- Generates false monitoring alerts

**Please fix ASAP (within 24 hours).**

---

**Reported by:** Automated Negative Test Suite  
**Date:** January 21, 2026  
**Priority:** 🔴 P0 - CRITICAL  
**Status:** 🔴 NOT FIXED
