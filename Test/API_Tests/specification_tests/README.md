# 🎯 **SPECIFICATION TESTS - Test SEHARUSNYA, Bukan Yang Ada!**

## 📋 **Apa Ini?**

**Specification Tests** adalah test yang mendefinisikan **bagaimana code SEHARUSNYA bekerja**, bukan hanya test implementasi yang sudah ada.

Ini adalah **predictive/proactive testing** - test yang:
- ✅ **Menemukan bug** sebelum production
- ✅ **Define expected behavior** yang harus ada
- ✅ **Test edge cases** yang mungkin belum di-handle
- ✅ **Verify security** yang seharusnya ada
- ✅ **Predict problems** sebelum terjadi

---

## 🆚 **PERBEDAAN 3 JENIS TEST:**

| Aspect | Fast Tests | Comprehensive Tests | **Specification Tests** |
|--------|-----------|---------------------|------------------------|
| **Purpose** | Quick regression | Deep verification | **Find bugs & define behavior** |
| **Based On** | Current API contract | Current implementation + DB | **What SHOULD work** |
| **Mindset** | "Does it work?" | "Is data correct?" | **"What if...?"** |
| **Approach** | Test what exists | Verify what happens | **Predict what could happen** |
| **Test Cases** | Happy path + basic errors | Full CRUD + encryption | **Edge cases + security + business logic** |
| **May Fail** | ❌ If API broken | ❌ If DB integrity broken | ⚠️ **If security/validation missing!** |
| **Finds** | API bugs | Data bugs | **Missing validation, security holes, edge cases** |

---

## 📂 **TEST FILES:**

### **1. `person_attributes_security_spec.test.js`** (8 tests)

**Test Security & Edge Cases yang SEHARUSNYA di-handle:**

✅ **SQL Injection Protection**
```javascript
// Test dengan payload: '; DROP TABLE person_attributes; --
// SHOULD: Either reject OR safely escape
```

✅ **XSS Prevention**
```javascript
// Test dengan: <script>alert("XSS")</script>
// SHOULD: Sanitize or escape
```

✅ **Extreme Input Validation**
```javascript
// Test key dengan 10,000 characters
// SHOULD: Reject or limit
```

✅ **Unicode & Special Characters**
```javascript
// Test emoji, Chinese, Arabic, null bytes
// SHOULD: Handle without corruption
```

✅ **Authorization Bypass Attempts**
```javascript
// Try to access Person1's attribute via Person2 endpoint
// SHOULD: Block with 403/404
```

✅ **Duplicate Key Handling**
```javascript
// Create same key twice
// SHOULD: Update (upsert) not duplicate
```

✅ **Null/Empty Value Edge Cases**
```javascript
// Test empty string, whitespace, "null", "undefined"
// SHOULD: Have clear validation rules
```

---

### **2. `person_attributes_business_spec.test.js`** (6 tests)

**Test Business Logic yang SEHARUSNYA ada:**

✅ **Audit Trail Completeness**
```javascript
// Every operation SHOULD be logged to request_log
// SHOULD: Have trace_id, caller, reason
```

✅ **Concurrent Modification Handling**
```javascript
// 5 simultaneous updates to same attribute
// SHOULD: Handle gracefully without data loss
```

✅ **Cascade Delete**
```javascript
// Delete person
// SHOULD: Cascade delete all attributes
```

✅ **Timestamp Consistency**
```javascript
// created_at SHOULD NOT change on update
// updated_at SHOULD change
```

✅ **Transaction Atomicity**
```javascript
// Failed operation SHOULD NOT leave partial data
```

✅ **Attribute Key Uniqueness**
```javascript
// One person SHOULD have only one attribute per key
// SHOULD: Upsert behavior
```

---

## 🎯 **KENAPA PENTING?**

### **Fast Tests Say:**
> "Email attribute created successfully ✅"

### **Comprehensive Tests Say:**
> "Email is encrypted in DB ✅, decrypts correctly ✅"

### **Specification Tests Ask:**
> **"Tapi kalau email-nya `'; DROP TABLE --` gimana?"** ⚠️  
> **"Kalau 2 user update bersamaan gimana?"** ⚠️  
> **"Kalau user A coba akses data user B gimana?"** ⚠️  

---

## 🐛 **CONTOH BUG YANG BISA DITEMUKAN:**

### **Example 1: SQL Injection**

**Specification Test:**
```javascript
test('Should prevent SQL injection', async () => {
  await apiClient.post(..., {
    key: "'; DROP TABLE person_attributes; --",
    value: 'test'
  });
  
  // Verify table still exists
  const check = await dbClient.query('SELECT COUNT(*) FROM person_attributes');
  expect(check.rows).toBeDefined(); // ✅ Table not dropped
});
```

**Jika FAIL:** ❌ **CRITICAL SECURITY BUG!** SQL injection vulnerability!

---

### **Example 2: Authorization Bypass**

**Specification Test:**
```javascript
test('Should prevent cross-person access', async () => {
  const person1Attr = await create_attribute(person1_id, 'email', 'secret@example.com');
  
  // Try to access via person2 endpoint
  try {
    await apiClient.get(`/persons/${person2_id}/attributes/${person1Attr.id}`);
    fail('Should have blocked!');
  } catch (error) {
    expect(error.response.status).toBe(403); // ✅ Blocked
  }
});
```

**Jika PASS tapi return 200:** ❌ **SECURITY BUG!** Data leak!

---

### **Example 3: Race Condition**

**Specification Test:**
```javascript
test('Should handle concurrent updates', async () => {
  const updates = [
    apiClient.put(..., { value: 'update-1' }),
    apiClient.put(..., { value: 'update-2' }),
    apiClient.put(..., { value: 'update-3' })
  ];
  
  await Promise.all(updates);
  
  // Should have exactly 1 record
  const count = await dbClient.query('SELECT COUNT(*) FROM ... WHERE id = $1');
  expect(parseInt(count.rows[0].count)).toBe(1); // ✅ No duplicates
});
```

**Jika count > 1:** ❌ **DATA INTEGRITY BUG!** Race condition!

---

## 🚀 **CARA MENJALANKAN:**

### **Run Specification Tests:**
```powershell
npm run test:spec
```

### **Run ALL Test Types:**
```powershell
npm run test:all  # Fast + Comprehensive + Specification
```

### **Run Individual:**
```powershell
# Security tests
node --experimental-vm-modules node_modules/jest/bin/jest.js API_Tests/specification_tests/person_attributes_security_spec.test.js --runInBand

# Business logic tests
node --experimental-vm-modules node_modules/jest/bin/jest.js API_Tests/specification_tests/person_attributes_business_spec.test.js --runInBand
```

---

## 📊 **EXPECTED RESULTS:**

### **Some Tests MIGHT Fail - That's OK!**

Specification tests **PREDICT** how code SHOULD work. If they fail, it means:

✅ **Test reveals missing validation**  
✅ **Test found security hole**  
✅ **Test discovered edge case not handled**  
✅ **Test identified business logic gap**  

**This is GOOD!** Kamu menemukan bug sebelum production! 🎉

---

## 🎨 **CONTOH OUTPUT:**

### **When Everything Works:**
```
🔐 SPECIFICATION TESTS: Security & Edge Cases

🔐 Testing SQL Injection Protection
   🔵 Testing payload: '; DROP TABLE person_attributes...
   ✅ Request properly rejected: 400
   ✅ SQL Injection Protection: PASSED

✅ person_attributes_security_spec.test.js (8 tests)
```

### **When Bug Found:**
```
🔐 Testing Authorization Boundaries
   🔵 Attempting to access Person 1 attribute via Person 2...
   ⚠️  SECURITY ISSUE: Cross-person attribute access allowed!
   Retrieved value: person1@example.com

❌ Authorization bypass detected!
```

**Action:** Fix code, then test passes! ✅

---

## 📝 **ADDING MORE SPECIFICATION TESTS:**

### **Template:**

```javascript
test('SPEC: Should [EXPECTED BEHAVIOR]', async () => {
  console.log('🔐 Testing [FEATURE]\n');
  
  // Setup
  console.log('🔵 [Action description]...');
  
  // Test the edge case / security concern
  // ...
  
  // Verify EXPECTED behavior
  if (actualBehavior === expectedBehavior) {
    console.log('   ✅ Behavior correct');
  } else {
    console.log('   ⚠️  Potential issue found');
  }
  
  // Cleanup
});
```

### **Ideas for More Tests:**

- **Performance:** Response time under load
- **Rate Limiting:** API should limit requests per minute
- **File Upload:** Should validate file types/sizes
- **Encryption Key Rotation:** Should handle old keys
- **Soft Delete:** Should not truly delete, just mark
- **Pagination:** Should limit result size
- **Sorting:** Should handle invalid sort fields
- **Filtering:** Should sanitize filter inputs

---

## 🎯 **USE CASES:**

### **Use Specification Tests When:**

✅ **Before Production Deploy** - Find security holes  
✅ **Security Audit** - Verify protection mechanisms  
✅ **Adding New Features** - Define expected behavior first  
✅ **Penetration Testing** - Test attack scenarios  
✅ **Compliance Check** - Verify audit trails  
✅ **Data Integrity Audit** - Check consistency rules  

### **Don't Use For:**

❌ Daily development (too slow, might fail on WIP features)  
❌ CI/CD quick checks (use fast tests)  
❌ Unit testing (too integration-heavy)  

---

## 📈 **FULL TEST SUITE SUMMARY:**

```
Test/API_Tests/
├── tests/                      ✅ 54 tests - Fast (4s)
│   └── Quick regression
│
├── comprehensive_tests/        ✅ 10 tests - Thorough (1.5s)
│   └── DB + Encryption verification
│
└── specification_tests/        ⚠️ 14 tests - Predictive (varies)
    └── Security + Business logic + Edge cases
```

**Total: 78 Tests**
- **64 tests** verify what EXISTS ✅
- **14 tests** verify what SHOULD exist ⚠️

---

## 💡 **PHILOSOPHY:**

### **Normal Tests (Fast + Comprehensive):**
> "Memastikan code bekerja seperti yang ditulis"

### **Specification Tests:**
> **"Memastikan code bekerja seperti yang SEHARUSNYA"**

---

## 🎓 **BEST PRACTICES:**

1. **Run spec tests BEFORE production deploy**
2. **Fix failures or document WHY behavior is acceptable**
3. **Add spec test whenever you find a bug**
4. **Use failures to improve code, not just test**
5. **Document expected vs actual behavior**

---

## 🏆 **SUCCESS CRITERIA:**

### **All Spec Tests Pass:**
✅ Code handles edge cases  
✅ Security properly implemented  
✅ Business logic complete  
✅ Data integrity maintained  

→ **Ready for production! 🚀**

### **Some Spec Tests Fail:**
⚠️ Review failures  
⚠️ Decide: Fix code OR accept risk (document why)  
⚠️ Add to backlog if acceptable for now  

→ **Informed decision making! 📋**

---

**Remember:** Specification tests are your **safety net** that catches what other tests miss! 🎯✅
