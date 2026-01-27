# 🔬 **Comprehensive Tests with Full Database Verification**

## 📋 **Apa Ini?**

Ini adalah **comprehensive tests** yang mengikuti pattern dari `Test/steps/person_attributes_with_db.test.js`.

Test-test ini berbeda dengan test di folder `tests/` karena memiliki **verifikasi database yang lengkap** dan **detailed logging**.

---

## 🎯 **Perbedaan dengan Test Biasa**

| Feature | Test Biasa (`tests/`) | Comprehensive (`comprehensive_tests/`) |
|---------|----------------------|----------------------------------------|
| **Kecepatan** | ✅ Cepat (~3-4 detik) | ⚠️ Lebih lambat (~10-15 detik) |
| **Database Check** | ❌ Minimal | ✅ **Full verification setiap step** |
| **Logging** | ❌ Simple | ✅ **Detailed console.log setiap step** |
| **Encryption Check** | ❌ Tidak ada | ✅ **Verify encryption/decryption** |
| **Coverage** | ✅ Semua endpoint (54 tests) | ⚠️ Fokus pada core features (10 tests) |
| **Purpose** | Quick regression testing | **Deep verification & debugging** |

---

## 📂 **Test Files**

### **1. `key_value_full_verification.test.js`** (5 tests)

Test comprehensive untuk Key-Value API dengan database verification:

- ✅ CREATE dengan database verification
- ✅ GET dengan cross-check database
- ✅ UPDATE dengan before/after comparison
- ✅ DELETE dengan removal verification
- ✅ Full CRUD lifecycle dengan step-by-step DB checks

**Pattern:**
```javascript
test('1. CREATE key-value via API and verify in database', async () => {
  console.log('📝 Test 1: CREATE Key-Value Pair\n');
  
  // Step 1: API Call
  console.log('🔵 Step 1: Sending POST request...');
  const apiResponse = await apiClient.post(...);
  console.log('✅ API Response received');
  
  // Step 2: Database Verification
  console.log('🔵 Step 2: Querying database...');
  const dbResult = await dbClient.query(...);
  console.log('✅ Found in database');
  
  // Step 3: Comparison
  console.log('🔵 Step 3: Verifying values match...');
  expect(apiResponse.data.value).toBe(dbResult.rows[0].value);
  console.log('✅ Values match!\n');
});
```

---

### **2. `person_attributes_full_verification.test.js`** (5 tests)

Test comprehensive untuk Person Attributes API dengan **encryption verification**:

- ✅ CREATE dengan encryption check
- ✅ GET dengan decryption verification
- ✅ UPDATE dengan re-encryption check
- ✅ DELETE dengan removal verification
- ✅ Full CRUD lifecycle dengan encryption di setiap step

**Encryption Checks:**
```javascript
// Verify data is ENCRYPTED in database
const dbResult = await dbClient.query('SELECT encrypted_value FROM person_attributes...');
expect(Buffer.isBuffer(dbResult.rows[0].encrypted_value)).toBe(true);
console.log('✅ Value is encrypted (binary)');

// Verify API returns DECRYPTED
const apiResponse = await apiClient.get(...);
expect(apiResponse.data.value).toBe('plain-text-value');
console.log('✅ API returns decrypted value');

// Manually decrypt to verify
const decrypted = await dbClient.query(
  'SELECT pgp_sym_decrypt(encrypted_value, $1) as val FROM ...',
  [encryptionKey]
);
expect(decrypted.rows[0].val.toString()).toBe('plain-text-value');
console.log('✅ Manual decryption successful');
```

---

## 🚀 **Cara Menjalankan**

### **Run Comprehensive Tests Only:**
```powershell
npm run test:comprehensive
```

### **Run All Tests (Biasa + Comprehensive):**
```powershell
npm run test:all
```

### **Run Individual Comprehensive Test:**
```powershell
# Key-Value
node --experimental-vm-modules node_modules/jest/bin/jest.js API_Tests/comprehensive_tests/key_value_full_verification.test.js --runInBand

# Person Attributes
node --experimental-vm-modules node_modules/jest/bin/jest.js API_Tests/comprehensive_tests/person_attributes_full_verification.test.js --runInBand
```

---

## 📊 **Output Example**

### **Detailed Logging:**

```
🚀 Starting Key-Value API Test with Full DB Verification...

✅ Database connected

📝 Test 1: CREATE Key-Value Pair

🔵 Step 1: Sending POST request to create key-value...
   Key: test-create-1737394800000
   Value: test-value-for-create
✅ API Response received
   Status: 200
   Data: { key: 'test-create-1737394800000', value: 'test-value-for-create', ... }
✅ API response validation passed

🔵 Step 2: Querying database to verify key-value...
   Rows found: 1
✅ Key-value found in database

🔵 Step 3: Verifying database values...
   DB Key: test-create-1737394800000
   DB Value: test-value-for-create
✅ Database values match expected data

 PASS  API_Tests/comprehensive_tests/key_value_full_verification.test.js
  ✓ 1. CREATE key-value via API and verify in database (125ms)
```

---

## 🎯 **Kapan Menggunakan Test Ini?**

### **Use Comprehensive Tests When:**

✅ Debugging masalah database  
✅ Verifying encryption bekerja dengan benar  
✅ Investigating data consistency issues  
✅ Testing critical production scenarios  
✅ Need detailed logs untuk troubleshooting  
✅ Demonstrating test to stakeholders  

### **Use Regular Tests When:**

✅ Quick regression testing  
✅ CI/CD pipeline (perlu cepat)  
✅ Testing API contract  
✅ Checking response format  
✅ Daily development testing  

---

## 📈 **Test Coverage**

| Test File | Tests | Focus | DB Checks | Encryption Checks |
|-----------|-------|-------|-----------|-------------------|
| `key_value_full_verification.test.js` | 5 | Key-Value CRUD | ✅ Every step | ❌ N/A |
| `person_attributes_full_verification.test.js` | 5 | Attributes CRUD | ✅ Every step | ✅ Every operation |
| **Total** | **10** | **Core APIs** | ✅ **Full** | ✅ **Full** |

---

## 🔧 **Struktur Test**

Setiap test mengikuti pattern:

```javascript
test('X. [OPERATION] with [VERIFICATION TYPE]', async () => {
  console.log('📝 Test X: [DESCRIPTION]\n');
  
  // Setup (if needed)
  console.log('🔧 Setup: ...');
  // ... setup code ...
  console.log('✅ Setup complete\n');
  
  // Step 1: Action
  console.log('🔵 Step 1: [ACTION DESCRIPTION]...');
  // ... action code ...
  console.log('✅ [ACTION] successful');
  
  // Step 2: Verification
  console.log('\n🔵 Step 2: [VERIFICATION DESCRIPTION]...');
  // ... verification code ...
  console.log('✅ [VERIFICATION] passed');
  
  // Step 3: Additional checks
  console.log('\n🔵 Step 3: [ADDITIONAL CHECK]...');
  // ... check code ...
  console.log('✅ [CHECK] complete\n');
});
```

---

## ✅ **Benefits**

1. **Transparency** - See exactly what's happening at each step
2. **Debuggable** - Easy to identify where things fail
3. **Educational** - Great for understanding how the system works
4. **Reliable** - Full database verification catches edge cases
5. **Security** - Encryption checks ensure data protection

---

## 📝 **Adding More Comprehensive Tests**

To add a new comprehensive test, follow this pattern:

1. **Import dependencies:**
```javascript
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import axios from 'axios';
import pg from 'pg';
const { Client } = pg;
import { config } from 'dotenv';
```

2. **Setup API & DB clients in beforeAll()**

3. **Each test should:**
   - Log each step with `console.log()`
   - Perform API operation
   - Verify in database
   - Cross-check values
   - For Person Attributes: verify encryption

4. **Cleanup in afterAll()**

---

## 🎉 **Example Run**

```powershell
PS> npm run test:comprehensive

Test Suites: 2 passed, 2 total
Tests:       10 passed, 10 total
Time:        12.456 s

🚀 Starting Key-Value API Test with Full DB Verification...
✅ Database connected
📝 Test 1: CREATE Key-Value Pair
🔵 Step 1: Sending POST request...
✅ API Response received
...
✅ FULL CRUD LIFECYCLE COMPLETE!

🚀 Starting Person Attributes Test with Full DB & Encryption Verification...
✅ Database connected
📝 Test 1: CREATE with Encryption Verification
🔵 Step 1: Sending POST request...
✅ API Response received
🔵 Step 2: Querying database...
✅ Value is encrypted (binary)
...
✅ ENCRYPTION VERIFICATION COMPLETE!
```

---

**Happy Testing with Full Verification! 🔬✅**
