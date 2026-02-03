# 📋 **DAFTAR LENGKAP 76 BUG - LAPORAN UNTUK ENGINEER**

**Tanggal:** 3 Februari 2026  
**Total Failures:** 76 (dari 219 tests)  
**Pass Rate:** 65%  
**Target:** 100%

---

## 🤖 INSTRUCTIONS FOR CODING AGENT

**Read this first before making changes.**

### Project Structure
- **Source code:** `source/app/` (Go application)
- **Tests:** `Test/` (Node.js/Jest API tests)
- **Run tests:** `cd Test && npm test`
- **Run server:** `cd source/app && go run main.go` (requires DATABASE_URL, PORT, PERSON_API_KEY_*)

### Cascade Dependencies (IMPORTANT)
- **Bug #1** and **Bug #2** cause cascade failures: many tests fail because their setup step (POST attributes or POST key-value) returns 500. Fix Bug #1 first, then Bug #2 — this alone resolves ~44 tests.
- Tests 43–47, 67, 70–76 fail due to Bug #1 (POST attributes setup fails).
- Tests 48–49, 51–53, 57–65 fail due to Bug #2 (POST key-value setup fails).

### Fix Order (recommended)
1. Bug #1 → Bug #2 → Bug #3 → Bug #4 → Bug #5 → PUT attributes handler

### Full Source File Paths (from repo root)
| Handler | File | Function | Line |
|---------|------|----------|------|
| POST attributes | `source/app/person_attributes/person_attributes.go` | `CreateAttribute` | ~60 |
| GET all attributes | `source/app/person_attributes/person_attributes.go` | `GetAllAttributes` | ~189 |
| PUT attribute | `source/app/person_attributes/person_attributes.go` | `UpdateAttribute` | ~330 |
| POST key-value | `source/app/key_value/key_value.go` | `SetValue` | ~31 |
| GET key-value | `source/app/key_value/key_value.go` | `GetValue` | ~86 |
| DELETE key-value | `source/app/key_value/key_value.go` | `DeleteValue` | ~127 |

---

## 📊 RINGKASAN PER KATEGORI

| Kategori | Jumlah | Root Cause | Priority |
|----------|--------|------------|----------|
| POST /persons/:personId/attributes 500 | 30+ | Bug #1 - Server error | 🔴 P0 |
| POST /api/key-value 500 | 15+ | Bug #2 - Server error | 🔴 P0 |
| DELETE /api/key-value/:key 500 | 9 | Bug #3 - Missing pgx.ErrNoRows | 🔴 P0 |
| GET /persons/:personId/attributes 500 | 4+ | Bug #4 - Regression | 🟠 P1 |
| PUT/DELETE/GET attributes cascade | 20+ | Setup fails (POST 500) | 🔴 P0 |
| Negative tests (expect 404, get 500) | 24 | Same root causes | Mixed |

---

## 🔴 BUG #1: POST /persons/:personId/attributes → 500 Internal Server Error

**Severity:** CRITICAL | **Impact:** 30+ tests | **Endpoint:** `POST /persons/:personId/attributes`

### Root Cause (Suspected)
- Database connection issue
- Encryption key (ENCRYPTION_KEY) not configured
- Migration not run
- Error handling broken

### ACTION for Agent
1. **Read** `source/app/person_attributes/person_attributes.go` — function `CreateAttribute` (starts ~line 60)
2. **Check:** Is `h.db` or `h.queries` nil? Is `ENCRYPTION_KEY` env var used and validated?
3. **Add:** Nil checks at start of handler; detailed error logging before returning 500
4. **Verify:** Ensure `GetPersonById` is called to validate person exists before creating attribute (return 404 if person not found)
5. **Reproduce:** `cd Test && npm test -- API_Tests/comprehensive_tests/person_attributes_full_verification.test.js`

### Affected Bugs (1–16, 66, 67, 70–76)

| # | Test Name | Test File | Request | Expected | Actual | Error |
|---|-----------|-----------|---------|----------|--------|-------|
| 1 | CREATE attribute via API and verify ENCRYPTION in database | `person_attributes_full_verification.test.js` | POST /persons/:id/attributes | 201 | 500 | AxiosError: Request failed with status code 500 |
| 2 | GET attribute via API and verify DECRYPTION | `person_attributes_full_verification.test.js` | POST (setup) /persons/:id/attributes | 201 | 500 | AxiosError: Request failed with status code 500 |
| 3 | UPDATE attribute and verify RE-ENCRYPTION in database | `person_attributes_full_verification.test.js` | POST (setup) /persons/:id/attributes | 201 | 500 | AxiosError: Request failed with status code 500 |
| 4 | DELETE attribute and verify complete removal from database | `person_attributes_full_verification.test.js` | POST (setup) /persons/:id/attributes | 201 | 500 | AxiosError: Request failed with status code 500 |
| 5 | FULL CRUD LIFECYCLE with encryption at each step | `person_attributes_full_verification.test.js` | POST /persons/:id/attributes | 201 | 500 | AxiosError: Request failed with status code 500 |
| 6 | Should create audit trail for all operations | `person_attributes_business_spec.test.js` | POST /persons/:id/attributes | 201 | 500 | AxiosError: Request failed with status code 500 |
| 7 | Should handle concurrent updates gracefully | `person_attributes_business_spec.test.js` | POST /persons/:id/attributes | 201 | 500 | AxiosError: Request failed with status code 500 |
| 8 | Should cascade delete attributes when person is deleted | `person_attributes_business_spec.test.js` | POST /persons/:id/attributes | 201 | 500 | AxiosError: Request failed with status code 500 |
| 9 | Should maintain consistent timestamps | `person_attributes_business_spec.test.js` | POST /persons/:id/attributes | 201 | 500 | AxiosError: Request failed with status code 500 |
| 10 | Should enforce attribute key uniqueness per person | `person_attributes_business_spec.test.js` | POST /persons/:id/attributes | 201 | 500 | AxiosError: Request failed with status code 500 |
| 11 | Should prevent SQL injection in attribute key | `person_attributes_security_spec.test.js` | POST /persons/:id/attributes | 201/400 | 500 | AxiosError: Request failed with status code 500 |
| 12 | Should sanitize XSS payloads in values | `person_attributes_security_spec.test.js` | POST /persons/:id/attributes | 201/400 | 500 | AxiosError: Request failed with status code 500 |
| 13 | Should handle extremely long attribute keys | `person_attributes_security_spec.test.js` | POST /persons/:id/attributes | 201/400 | 500 | AxiosError: Request failed with status code 500 |
| 14 | Should handle Unicode and special characters | `person_attributes_security_spec.test.js` | POST /persons/:id/attributes | 201 | 500 | AxiosError: Request failed with status code 500 |
| 15 | Should prevent accessing other person's attributes | `person_attributes_security_spec.test.js` | POST /persons/:id/attributes | 201/403 | 500 | AxiosError: Request failed with status code 500 |
| 16 | Should handle duplicate attribute keys correctly | `person_attributes_security_spec.test.js` | POST /persons/:id/attributes | 201/409 | 500 | AxiosError: Request failed with status code 500 |
| 66 | Create a single attribute | `POST_persons_personId_attributes.test.js` | POST /persons/:id/attributes | 201 | 500 | AxiosError: Request failed with status code 500 |
| 67 | Update attribute value only | `PUT_persons_personId_attributes_attributeId.test.js` | POST (setup) /persons/:id/attributes | 201 | 500 | AxiosError: Request failed with status code 500 |
| 70 | Get existing attribute by ID | `GET_persons_personId_attributes_attributeId.test.js` | POST (setup) /persons/:id/attributes | 201 | 500 | AxiosError: Request failed with status code 500 |
| 71 | Get non-existent attribute | `GET_persons_personId_attributes_attributeId.test.js` | Depends on setup | 404 | 500 | AxiosError: Request failed with status code 500 |
| 72 | Get attribute without API key | `GET_persons_personId_attributes_attributeId.test.js` | Depends on setup | 401 | 500 | AxiosError: Request failed with status code 500 |
| 73 | Verify attribute value is decrypted | `GET_persons_personId_attributes_attributeId.test.js` | Depends on setup | 200 | 500 | AxiosError: Request failed with status code 500 |
| 74 | Verify response includes all fields | `GET_persons_personId_attributes_attributeId.test.js` | Depends on setup | 200 | 500 | AxiosError: Request failed with status code 500 |
| 75 | Get all attributes for person with multiple attributes | `GET_persons_personId_attributes.test.js` | POST (setup) /persons/:id/attributes | 201 | 500 | AxiosError: Request failed with status code 500 |
| 76 | Verify all attributes are decrypted | `GET_persons_personId_attributes.test.js` | GET /persons/:id/attributes | 200 | 500 | AxiosError: Request failed with status code 500 |

**File to Fix:** `source/app/person_attributes/person_attributes.go` (CreateAttribute handler, ~line 60)  
**Reproduce:** `cd Test && npm test -- API_Tests/comprehensive_tests/person_attributes_full_verification.test.js`

---

## 🔴 BUG #2: POST /api/key-value → 500 Internal Server Error

**Severity:** CRITICAL | **Impact:** 15+ tests | **Endpoint:** `POST /api/key-value`

### Root Cause (Suspected)
- Same as Bug #1: database connection, table `key_value` missing, or config issue
- Handler: `SetValue` in key_value.go

### ACTION for Agent
1. **Read** `source/app/key_value/key_value.go` — function `SetValue` (starts ~line 31)
2. **Check:** Is `h.queries` nil? Does `key_value` table exist? Run migrations.
3. **Add:** Nil check for queries; log the actual error before returning 500 (e.g. `log.Errorf("SetValue failed: %v", err)`)
4. **Verify:** Ensure `SetValue` and `GetKeyValue` db calls handle errors properly
5. **Reproduce:** `cd Test && npm test -- API_Tests/tests/POST_api_key-value.test.js`

### Affected Bugs (17–21, 48–49, 51–53, 57–65)

| # | Test Name | Test File | Request | Expected | Actual | Error |
|---|-----------|-----------|---------|----------|--------|-------|
| 17 | CREATE key-value via API and verify in database | `key_value_full_verification.test.js` | POST /api/key-value | 201 | 500 | AxiosError: Request failed with status code 500 |
| 18 | GET key-value via API and verify response matches database | `key_value_full_verification.test.js` | GET (after POST) | 200 | 500 | AxiosError: Request failed with status code 500 |
| 19 | UPDATE key-value via API and verify in database | `key_value_full_verification.test.js` | POST /api/key-value | 200 | 500 | AxiosError: Request failed with status code 500 |
| 20 | DELETE key-value via API and verify removal from database | `key_value_full_verification.test.js` | POST (setup) /api/key-value | 201 | 500 | AxiosError: Request failed with status code 500 |
| 21 | FULL CRUD LIFECYCLE with step-by-step database verification | `key_value_full_verification.test.js` | POST /api/key-value | 201 | 500 | AxiosError: Request failed with status code 500 |
| 48 | Delete an existing key-value pair | `DELETE_api_key-value_key.test.js` | POST (setup) /api/key-value | 201 | 500 | AxiosError: Request failed with status code 500 |
| 49 | Verify key is deleted from database | `DELETE_api_key-value_key.test.js` | POST (setup) /api/key-value | 201 | 500 | AxiosError: Request failed with status code 500 |
| 51 | Delete same key twice | `DELETE_api_key-value_key.test.js` | POST (setup) /api/key-value | 201 | 500 | AxiosError: Request failed with status code 500 |
| 52 | Delete multiple keys sequentially | `DELETE_api_key-value_key.test.js` | POST (setup) /api/key-value | 201 | 500 | AxiosError: Request failed with status code 500 |
| 53 | CRUD lifecycle | `DELETE_api_key-value_key.test.js` | POST (setup) /api/key-value | 201 | 500 | AxiosError: Request failed with status code 500 |
| 57 | Get an existing key-value pair | `GET_api_key-value_key.test.js` | POST (setup) /api/key-value | 201 | 500 | AxiosError: Request failed with status code 500 |
| 58 | Get key with special characters | `GET_api_key-value_key.test.js` | POST (setup) /api/key-value | 201 | 500 | AxiosError: Request failed with status code 500 |
| 59 | Get key returns latest value after update | `GET_api_key-value_key.test.js` | POST (setup) /api/key-value | 201 | 500 | AxiosError: Request failed with status code 500 |
| 60 | Get multiple different keys | `GET_api_key-value_key.test.js` | POST (setup) /api/key-value | 201 | 500 | AxiosError: Request failed with status code 500 |
| 61 | Verify timestamps are valid | `GET_api_key-value_key.test.js` | POST (setup) /api/key-value | 201 | 500 | AxiosError: Request failed with status code 500 |
| 62 | Create a new key-value pair | `POST_api_key-value.test.js` | POST /api/key-value | 201 | 500 | AxiosError: Request failed with status code 500 |
| 63 | Update an existing key-value pair | `POST_api_key-value.test.js` | POST /api/key-value | 200 | 500 | AxiosError: Request failed with status code 500 |
| 64 | Create key-value with special characters | `POST_api_key-value.test.js` | POST /api/key-value | 201 | 500 | AxiosError: Request failed with status code 500 |
| 65 | Create multiple key-value pairs | `POST_api_key-value.test.js` | POST /api/key-value | 201 | 500 | AxiosError: Request failed with status code 500 |

**File to Fix:** `source/app/key_value/key_value.go` (SetValue handler, ~line 31)  
**Reproduce:** `cd Test && npm test -- API_Tests/tests/POST_api_key-value.test.js`

---

## 🔴 BUG #3: DELETE /api/key-value/:key → 500 for Non-Existent Key

**Severity:** CRITICAL | **Impact:** 9 tests | **Endpoint:** `DELETE /api/key-value/:key`

### Root Cause
- `DeleteValue` does not check if key exists before deleting. When deleting non-existent key, DB may return error or behavior is wrong — tests expect 404.
- Fix: Call `GetKeyValue` first; if `sql.ErrNoRows` or `pgx.ErrNoRows`, return 404. (This codebase uses `database/sql` — check for `sql.ErrNoRows` in GetValue; use same pattern for DeleteValue.)

### ACTION for Agent
1. **Read** `source/app/key_value/key_value.go` — function `DeleteValue` (starts ~line 127)
2. **Change:** Before calling `DeleteValue`, call `GetKeyValue(ctx, key)`. If error is `sql.ErrNoRows` (or `pgx.ErrNoRows` if using pgx), return 404 with message "Key not found".
3. **Code pattern:** Same as `GetValue` (lines 99–104) which already checks `sql.ErrNoRows` for 404.
4. **Reproduce:** `cd Test && npm test -- API_Tests/negative_tests/DELETE_api_key-value_key_negative.test.js`

### Affected Bugs (34–42, 50)

| # | Test Name | Test File | Request | Expected | Actual | Error |
|---|-----------|-----------|---------|----------|--------|-------|
| 34 | Should handle DELETE of non-existent key | `DELETE_api_key-value_key_negative.test.js` | DELETE /api/key-value/nonexistent | 404 | 500 | expect(received).toBe(expected) |
| 35 | Should handle DELETE of already deleted key | `DELETE_api_key-value_key_negative.test.js` | DELETE (second time) | 404 | 500 | expect(received).toBe(expected) |
| 36 | Should ignore request body on DELETE | `DELETE_api_key-value_key_negative.test.js` | DELETE | 404/200 | 500 | expect(received).toBe(expected) |
| 37 | Should handle DELETE with SQL injection pattern in key | `DELETE_api_key-value_key_negative.test.js` | DELETE | 404 | 500 | expect(received).toBe(expected) |
| 38 | Should handle DELETE with XSS payload in key | `DELETE_api_key-value_key_negative.test.js` | DELETE | 404 | 500 | expect(received).toBe(expected) |
| 39 | Should ignore invalid Content-Type header on DELETE | `DELETE_api_key-value_key_negative.test.js` | DELETE | 404 | 500 | expect(received).toBe(expected) |
| 40 | Should handle DELETE without Accept header | `DELETE_api_key-value_key_negative.test.js` | DELETE | 404 | 500 | expect(received).toBe(expected) |
| 41 | Should handle URL-encoded key in DELETE | `DELETE_api_key-value_key_negative.test.js` | DELETE | 404 | 500 | expect(received).toBe(expected) |
| 42 | Should handle special URL characters | `DELETE_api_key-value_key_negative.test.js` | DELETE | 404 | 500 | expect(received).toBe(expected) |
| 50 | Delete non-existent key | `DELETE_api_key-value_key.test.js` | DELETE /api/key-value/nonexistent | 404 | 500 | AxiosError: Request failed with status code 500 |

**File to Fix:** `source/app/key_value/key_value.go` (DeleteValue handler, ~line 127)  
**Recommended Fix:** Add before delete:
```go
_, err := h.queries.GetKeyValue(ctx, key)
if err != nil {
    if err == sql.ErrNoRows {
        return c.JSON(http.StatusNotFound, map[string]interface{}{"message": "Key not found"})
    }
    return c.JSON(http.StatusInternalServerError, map[string]interface{}{"error": "Database error"})
}
// then call DeleteValue
```
**Reproduce:** `cd Test && npm test -- API_Tests/negative_tests/DELETE_api_key-value_key_negative.test.js`

---

## 🟠 BUG #4: GET /persons/:personId/attributes → 500 for Non-Existent Person

**Severity:** HIGH | **Impact:** 4 tests | **Endpoint:** `GET /persons/:personId/attributes`

### Root Cause
- Regression: Missing or reverted check for person not found in `GetAllAttributes`
- Should call `GetPersonById` and return 404 when `sql.ErrNoRows` or `pgx.ErrNoRows`

### ACTION for Agent
1. **Read** `source/app/person_attributes/person_attributes.go` — function `GetAllAttributes` (starts ~line 189)
2. **Check:** At start, call `GetPersonById(ctx, personID)`. If error is `sql.ErrNoRows` (or pgx equivalent), return 404 with `{"message": "Person not found"}`.
3. **Reproduce:** `cd Test && npm test -- API_Tests/negative_tests/GET_persons_personId_attributes_negative.test.js`

### Affected Bugs (30–33)

| # | Test Name | Test File | Request | Expected | Actual | Error |
|---|-----------|-----------|---------|----------|--------|-------|
| 30 | Should return empty or 404 for non-existent personId | `GET_persons_personId_attributes_negative.test.js` | GET /persons/00000000-0000-0000-0000-000000000000/attributes | 404 or [] | 500 | expect(received).toBe(expected) |
| 31 | Should reject request with body (GET should not have body) | `GET_persons_personId_attributes_negative.test.js` | GET with body | 400/404 | 500 | expect status in [400,404] |
| 32 | Should handle invalid Accept header | `GET_persons_personId_attributes_negative.test.js` | GET with bad Accept | 404/406 | 500 | expect status in [404,406] |
| 33 | Should ignore invalid query parameters | `GET_persons_personId_attributes_negative.test.js` | GET with invalid params | 200/404 | 500 | expect(received).toBe(expected) |

**File to Fix:** `source/app/person_attributes/person_attributes.go` (GetAllAttributes handler, ~line 189)  
**Reproduce:** `cd Test && npm test -- API_Tests/negative_tests/GET_persons_personId_attributes_negative.test.js`

---

## 🟠 BUG #5: PUT /persons/:personId/attributes/:attributeId → 500 for Non-Existent Attribute

**Severity:** HIGH | **Impact:** 1 test | **Endpoint:** `PUT /persons/:personId/attributes/:attributeId`

### ACTION for Agent
1. **Read** `source/app/person_attributes/person_attributes.go` — function `UpdateAttribute` (~line 330)
2. **Change:** When fetching existing attribute, if error is `sql.ErrNoRows` (or pgx), return 404 with message "Attribute not found".
3. **Reproduce:** `cd Test && npm test -- API_Tests/tests/PUT_persons_personId_attributes_attributeId.test.js`

### Affected Bugs (68)

| # | Test Name | Test File | Request | Expected | Actual | Error |
|---|-----------|-----------|---------|----------|--------|-------|
| 68 | Update non-existent attribute | `PUT_persons_personId_attributes_attributeId.test.js` | PUT /persons/:id/attributes/nonexistent-id | 404 | 500 | expect(received).toBe(expected) |

**File to Fix:** `source/app/person_attributes/person_attributes.go` (UpdateAttribute handler, ~line 330)

---

## 🟡 BUG #6: PUT Without Meta - attributeId Undefined

**Severity:** MEDIUM | **Impact:** 1 test

### Affected Bugs (69)

| # | Test Name | Test File | Request | Expected | Actual | Error |
|---|-----------|-----------|---------|----------|--------|-------|
| 69 | Update without meta information (meta is optional for UPDATE) | `PUT_persons_personId_attributes_attributeId.test.js` | PUT /persons/:id/attributes/undefined | 200/404 | 404 | Test setup may pass undefined attributeId |

**Note:** Test may have setup issue (attributeId undefined). Verify test logic and API behavior.

---

## NEGATIVE TESTS - POST attributes (22–25)

**Root Cause:** POST returns 500 (Bug #1) or wrong status for validation cases

| # | Test Name | Test File | Expected | Actual | Error |
|---|-----------|-----------|----------|--------|-------|
| 22 | Should reject request with non-existent personId | `POST_persons_personId_attributes_negative.test.js` | 404 | 500 | expect(received).toBe(expected) |
| 23 | Should reject request with empty meta object | `POST_persons_personId_attributes_negative.test.js` | 201/400 | 500 | expect(received).toBe(expected) |
| 24 | Should reject whitespace-only key | `POST_persons_personId_attributes_negative.test.js` | 400 | 500 | expect(received).toBe(expected) |
| 25 | Should handle or reject extremely long key | `POST_persons_personId_attributes_negative.test.js` | 400/413 | 500 | expect(received).toContain(expected) |

**Reproduce:** `npm test -- API_Tests/negative_tests/POST_persons_personId_attributes_negative.test.js`

---

## NEGATIVE TESTS - PUT attributes (26)

| # | Test Name | Test File | Expected | Actual | Error |
|---|-----------|-----------|----------|--------|-------|
| 26 | Should reject invalid JSON | `PUT_persons_personId_attributes_attributeId_negative.test.js` | 400 | 500 | expect(received).toContain(expected) |

---

## NEGATIVE TESTS - POST key-value (27–29)

**Root Cause:** POST key-value returns 500 (Bug #2)

| # | Test Name | Test File | Expected | Actual | Error |
|---|-----------|-----------|----------|--------|-------|
| 27 | Should reject key with only whitespace | `POST_api_key-value_negative.test.js` | 400 | 500 | expect(received).toBe(expected) |
| 28 | Should handle or reject key with special characters | `POST_api_key-value_negative.test.js` | 200/400 | 500 | expect(received).toBe(expected) |
| 29 | Should handle extra fields in request body | `POST_api_key-value_negative.test.js` | 201/400 | 500 | expect(received).toBe(expected) |

---

## CASCADE FAILURES - DELETE attributes (43–47)

**Root Cause:** Setup uses POST attributes which returns 500 (Bug #1)

| # | Test Name | Test File | Failing Step | Error |
|---|-----------|-----------|--------------|-------|
| 43 | Delete an existing attribute | `DELETE_persons_personId_attributes_attributeId.test.js` | POST setup | AxiosError: 500 |
| 44 | Verify attribute is deleted from database | `DELETE_persons_personId_attributes_attributeId.test.js` | POST setup | AxiosError: 500 |
| 45 | Delete non-existent attribute | `DELETE_persons_personId_attributes_attributeId.test.js` | POST setup | AxiosError: 500 |
| 46 | Delete without API key | `DELETE_persons_personId_attributes_attributeId.test.js` | POST setup | AxiosError: 500 |
| 47 | Full CRUD lifecycle | `DELETE_persons_personId_attributes_attributeId.test.js` | POST setup | AxiosError: 500 |

---

## CASCADE FAILURES - PUT attributes (54–56)

**Root Cause:** PUT /persons/:personId/attributes returns 500

| # | Test Name | Test File | Request | Error |
|---|-----------|-----------|---------|-------|
| 54 | Create/update attribute using PUT | `PUT_persons_personId_attributes.test.js` | PUT /persons/:id/attributes | AxiosError: 500 |
| 55 | Update existing attribute using PUT | `PUT_persons_personId_attributes.test.js` | PUT /persons/:id/attributes | AxiosError: 500 |
| 56 | PUT creates new attribute if not exists | `PUT_persons_personId_attributes.test.js` | PUT /persons/:id/attributes | AxiosError: 500 |

**File to Fix:** Same as Bug #1. `PUT /persons/:personId/attributes` (without :attributeId) uses `CreateAttribute` (see main.go line 119). Fix Bug #1 to resolve these.

---

## 📁 QUICK REFERENCE - TEST FILES (paths from Test/ folder)

| Test File | Full Path | Failures | Primary Bug |
|-----------|-----------|----------|-------------|
| person_attributes_full_verification | `Test/API_Tests/comprehensive_tests/person_attributes_full_verification.test.js` | 5 | Bug #1 |
| person_attributes_business_spec | `Test/API_Tests/specification_tests/person_attributes_business_spec.test.js` | 5 | Bug #1 |
| person_attributes_security_spec | `Test/API_Tests/specification_tests/person_attributes_security_spec.test.js` | 6 | Bug #1 |
| key_value_full_verification | `Test/API_Tests/comprehensive_tests/key_value_full_verification.test.js` | 5 | Bug #2 |
| POST_persons_personId_attributes_negative | `Test/API_Tests/negative_tests/` | 4 | Bug #1 |
| PUT_persons_personId_attributes_attributeId_negative | `Test/API_Tests/negative_tests/` | 1 | Bug #1/5 |
| POST_api_key-value_negative | `Test/API_Tests/negative_tests/` | 3 | Bug #2 |
| GET_persons_personId_attributes_negative | `Test/API_Tests/negative_tests/` | 4 | Bug #4 |
| DELETE_api_key-value_key_negative | `Test/API_Tests/negative_tests/` | 9 | Bug #3 |
| DELETE_persons_personId_attributes_attributeId | `Test/API_Tests/tests/` | 5 | Bug #1 |
| DELETE_api_key-value_key | `Test/API_Tests/tests/` | 6 | Bug #2, #3 |
| PUT_persons_personId_attributes | `Test/API_Tests/tests/` | 3 | PUT handler 500 |
| GET_api_key-value_key | `Test/API_Tests/tests/` | 5 | Bug #2 |
| POST_api_key-value | `Test/API_Tests/tests/` | 4 | Bug #2 |
| POST_persons_personId_attributes | `Test/API_Tests/tests/` | 1 | Bug #1 |
| PUT_persons_personId_attributes_attributeId | `Test/API_Tests/tests/` | 3 | Bug #1, #5 |
| GET_persons_personId_attributes_attributeId | `Test/API_Tests/tests/` | 5 | Bug #1 |
| GET_persons_personId_attributes | `Test/API_Tests/tests/` | 2 | Bug #1 |

---

## 🎯 RECOMMENDED FIX ORDER

1. **Bug #1** (POST attributes 500) → Fixes ~25 tests
2. **Bug #2** (POST key-value 500) → Fixes ~19 tests  
3. **Bug #3** (DELETE key-value 404) → Fixes ~10 tests
4. **Bug #4** (GET attributes 404) → Fixes ~4 tests
5. **Bug #5** (PUT attribute 404) → Fixes ~1 test
6. **PUT /persons/:personId/attributes** handler → Fixes ~3 tests
7. **Bug #6** (test/API edge case) → Fixes ~1 test

**Estimated Total:** Fixing Bugs #1–3 alone should restore pass rate to ~90%.

---

## 📞 HOW TO REPRODUCE ALL FAILURES

```bash
cd Test
npm test
# or specific suite:
npm test -- API_Tests/comprehensive_tests/
npm test -- API_Tests/negative_tests/
npm test -- API_Tests/tests/
```

---

## 📎 RELATED DOCUMENTS (for deeper context)

- `ENGINEER_FIX_REPORT_20260203.md` — More code samples and investigation steps
- `BUG_SPECIFICATION_UPDATE_20260203.md` — Full technical specification
- `QUICK_FIX_CHECKLIST_20260203.md` — Progress checklist

---

**Document Version:** 2.0 (Agent-oriented update)  
**Source:** test-results.json (3 Feb 2026)  
**Maintained by:** QA Team
