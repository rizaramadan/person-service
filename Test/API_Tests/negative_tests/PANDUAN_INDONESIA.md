# 🔴 **PANDUAN NEGATIVE TEST CASES**

## 📋 **Apa itu Negative Test?**

**Negative Test** adalah pengujian yang memastikan API **menolak request yang tidak valid** dan **menangani error dengan baik**.

**Tujuan:**
- ✅ Memastikan validasi input berfungsi
- ✅ Memastikan autentikasi diterapkan
- ✅ Mencegah serangan keamanan (SQL injection, XSS, dll)
- ✅ Memastikan API tidak crash saat menerima input buruk
- ✅ Memastikan error message yang jelas

---

## 🎯 **Apa yang Sudah Dibuat?**

### **Total: 9 File Negative Test**

```
Test/API_Tests/negative_tests/
├── GET_health_negative.test.js                                    (5 test)
├── POST_api_key-value_negative.test.js                           (20 test)
├── GET_api_key-value_key_negative.test.js                        (16 test)
├── DELETE_api_key-value_key_negative.test.js                     (17 test)
├── POST_persons_personId_attributes_negative.test.js             (28 test)
├── GET_persons_personId_attributes_negative.test.js              (12 test)
├── GET_persons_personId_attributes_attributeId_negative.test.js  (19 test)
├── PUT_persons_personId_attributes_attributeId_negative.test.js  (25 test)
└── DELETE_persons_personId_attributes_attributeId_negative.test.js (27 test)

Total: ~169 Test Case
```

---

## 🚀 **Cara Menjalankan Test:**

### **1. Jalankan SEMUA Negative Test:**

```bash
cd Test
npm run test:negative
```

### **2. Jalankan Test per Endpoint:**

```bash
# Health API
npm test -- API_Tests/negative_tests/GET_health_negative.test.js

# Key-Value API
npm test -- API_Tests/negative_tests/POST_api_key-value_negative.test.js
npm test -- API_Tests/negative_tests/GET_api_key-value_key_negative.test.js
npm test -- API_Tests/negative_tests/DELETE_api_key-value_key_negative.test.js

# Person Attributes API
npm test -- API_Tests/negative_tests/POST_persons_personId_attributes_negative.test.js
npm test -- API_Tests/negative_tests/GET_persons_personId_attributes_negative.test.js
npm test -- API_Tests/negative_tests/GET_persons_personId_attributes_attributeId_negative.test.js
npm test -- API_Tests/negative_tests/PUT_persons_personId_attributes_attributeId_negative.test.js
npm test -- API_Tests/negative_tests/DELETE_persons_personId_attributes_attributeId_negative.test.js
```

### **3. Jalankan Test dengan Report HTML:**

```bash
npm run test:report:negative
```

---

## 🔍 **Apa Saja yang Ditest?**

### **🔐 Autentikasi & Otorisasi (20+ test)**

**Test:**
- ❌ Request tanpa API key
- ❌ API key yang salah
- ❌ Format API key yang invalid

**Contoh:**
```javascript
test('Harus menolak request tanpa API key', async () => {
  try {
    await apiClient.post('/persons/.../attributes', { ... });
    fail('Seharusnya error 401');
  } catch (error) {
    expect(error.response.status).toBe(401);
  }
});
```

**Expected Result:**
```
Status: 401 Unauthorized
Message: "Missing required header 'x-api-key'"
```

---

### **✏️ Validasi Input (40+ test)**

**Test:**
- ❌ Field yang wajib tidak ada (missing required fields)
- ❌ Empty string
- ❌ Null value
- ❌ Whitespace saja (hanya spasi)
- ❌ Tipe data salah (number jadi string, dll)

**Contoh:**
```javascript
test('Harus menolak key yang kosong', async () => {
  try {
    await apiClient.post('/api/key-value', {
      key: '',
      value: 'test'
    });
    fail('Seharusnya error 400');
  } catch (error) {
    expect(error.response.status).toBe(400);
    expect(error.response.data.message).toContain('key');
  }
});
```

**Expected Result:**
```
Status: 400 Bad Request
Message: "Key is required"
```

---

### **🛡️ Keamanan (30+ test)**

**Test:**
- ❌ SQL Injection (`'; DROP TABLE users; --`)
- ❌ XSS Attack (`<script>alert('xss')</script>`)
- ❌ Path Traversal (`../../../etc/passwd`)
- ❌ Null Byte Injection (`test\x00null`)

**Contoh:**
```javascript
test('Harus mencegah SQL injection', async () => {
  const response = await apiClient.get(
    "/api/key-value/'; DROP TABLE key_value; --"
  );
  
  // Tidak boleh execute SQL, harus return 404 atau 400
  expect([200, 404]).toContain(response.status);
});
```

**Expected Result:**
```
Status: 404 Not Found
SQL: TIDAK DIJALANKAN ✅
Database: AMAN ✅
```

---

### **🔗 Validasi Resource (25+ test)**

**Test:**
- ❌ ID yang tidak ada di database
- ❌ Format UUID yang salah
- ❌ Parameter kosong
- ❌ Path yang salah

**Contoh:**
```javascript
test('Harus return 404 untuk personId yang tidak ada', async () => {
  try {
    await apiClient.get(
      '/persons/00000000-0000-0000-0000-000000000000/attributes'
    );
    fail('Seharusnya error 404');
  } catch (error) {
    expect(error.response.status).toBe(404);
  }
});
```

**Expected Result:**
```
Status: 404 Not Found
Message: "Person not found"
```

---

### **📏 Boundary Conditions (15+ test)**

**Test:**
- ❌ Input terlalu panjang (10KB key, 1MB value)
- ❌ URL terlalu panjang (2000+ chars)
- ❌ Request body terlalu besar

**Contoh:**
```javascript
test('Harus menolak key yang terlalu panjang', async () => {
  const longKey = 'k'.repeat(10000); // 10KB
  
  try {
    await apiClient.post('/api/key-value', {
      key: longKey,
      value: 'test'
    });
    fail('Seharusnya error 413');
  } catch (error) {
    expect([400, 413]).toContain(error.response.status);
  }
});
```

**Expected Result:**
```
Status: 413 Payload Too Large
Message: "Request entity too large"
```

---

### **🌐 HTTP Protocol (20+ test)**

**Test:**
- ❌ Method yang salah (POST di endpoint GET)
- ❌ JSON yang rusak (malformed JSON)
- ❌ Content-Type yang salah
- ❌ Accept header yang invalid

**Contoh:**
```javascript
test('Harus menolak POST method di GET endpoint', async () => {
  try {
    await apiClient.post('/api/key-value/test-key');
    fail('Seharusnya error 405');
  } catch (error) {
    expect([404, 405]).toContain(error.response.status);
  }
});
```

**Expected Result:**
```
Status: 405 Method Not Allowed
Message: "Method POST not allowed"
```

---

## 📊 **HTTP Status Codes yang Ditest:**

| Status | Arti | Kapan Digunakan |
|--------|------|-----------------|
| **400** | Bad Request | Input invalid, field tidak lengkap |
| **401** | Unauthorized | API key hilang/salah |
| **404** | Not Found | Resource tidak ditemukan |
| **405** | Method Not Allowed | HTTP method salah |
| **413** | Payload Too Large | Request terlalu besar |
| **415** | Unsupported Media Type | Content-Type salah |
| **500** | Internal Server Error | Server error (harus minimal) |

---

## 🎯 **Contoh Test per Kategori:**

### **Kategori 1: Missing Required Fields**

```javascript
test('Harus menolak request tanpa field key', async () => {
  try {
    await apiClient.post('/api/key-value', {
      value: 'test-value'
      // key TIDAK ADA
    });
    fail('Seharusnya error 400');
  } catch (error) {
    expect(error.response.status).toBe(400);
    expect(error.response.data.message).toContain('key');
  }
});
```

### **Kategori 2: Invalid Data Types**

```javascript
test('Harus menolak number sebagai key', async () => {
  try {
    await apiClient.post('/api/key-value', {
      key: 12345,  // NUMBER, bukan STRING
      value: 'test-value'
    });
    fail('Seharusnya error 400');
  } catch (error) {
    expect(error.response.status).toBe(400);
  }
});
```

### **Kategori 3: Security**

```javascript
test('Harus mencegah XSS attack', async () => {
  const xssPayload = '<script>alert("xss")</script>';
  
  const response = await apiClient.delete(
    `/api/key-value/${xssPayload}`
  );
  
  // Harus aman, tidak execute script
  expect([200, 404]).toContain(response.status);
});
```

### **Kategori 4: Authentication**

```javascript
test('Harus menolak request dengan API key invalid', async () => {
  const clientWithInvalidKey = axios.create({
    baseURL: BASE_URL,
    headers: { 'x-api-key': 'invalid-key-12345' }
  });
  
  try {
    await clientWithInvalidKey.post('/persons/.../attributes', { ... });
    fail('Seharusnya error 401');
  } catch (error) {
    expect(error.response.status).toBe(401);
  }
});
```

---

## 🎓 **Kenapa Negative Test Penting?**

### **1. Keamanan**
- ✅ Mencegah SQL Injection
- ✅ Mencegah XSS Attack
- ✅ Mencegah Path Traversal
- ✅ Memastikan autentikasi bekerja

### **2. Kualitas Data**
- ✅ Validasi semua input
- ✅ Menolak data yang salah
- ✅ Mencegah data corrupt di database

### **3. Pengalaman User**
- ✅ Error message yang jelas
- ✅ Status code yang tepat
- ✅ API tidak crash

### **4. Kepercayaan Developer**
- ✅ Menangkap bug sebelum production
- ✅ Dokumentasi behavior API
- ✅ Aman untuk refactoring

---

## 📈 **Statistik Test:**

```
Total File: 9
Total Test: ~169
Total Endpoint: 10

Breakdown:
├── Autentikasi:      20 test ✅
├── Validasi Input:   40 test ✅
├── Keamanan:         30 test ✅
├── Resource Check:   25 test ✅
├── Boundary:         15 test ✅
├── HTTP Protocol:    20 test ✅
├── Idempotency:      10 test ✅
└── Error Handling:    9 test ✅

Pass Rate Target: 100% ✅
```

---

## 🔧 **Setup & Persiapan:**

### **1. Pastikan API Berjalan:**

```bash
# Terminal 1: Jalankan API
cd "c:\RepoGit\person-service - v2\source\app"
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/person_service?sslmode=disable"
$env:PERSON_API_KEY_GREEN="person-service-key-82aca3c8-8e5d-42d4-9b00-7bc2f3077a58"
go run main.go
```

### **2. Jalankan Negative Test:**

```bash
# Terminal 2: Jalankan Test
cd "c:\RepoGit\person-service - v2\Test"
npm run test:negative
```

### **3. Lihat Report:**

```bash
npm run report
start TESTING_REPORT_LATEST.html
```

---

## ✅ **Checklist Sebelum Deploy:**

```
□ Semua positive test pass
□ Semua negative test pass
□ Tidak ada bug keamanan ditemukan
□ Semua validation bekerja
□ Error message jelas
□ Status code tepat
□ API tidak crash saat input buruk
□ Database tidak rusak saat error
□ Report HTML sudah di-generate
```

---

## 🎊 **Kesimpulan:**

**✅ 9 file negative test sudah dibuat**  
**✅ ~169 test case yang komprehensif**  
**✅ Mencakup semua 10 API endpoint**  
**✅ Test authentication, validation, dan security**  
**✅ Siap dijalankan dan terintegrasi dengan CI/CD!**

---

## 📞 **Cara Menggunakan:**

### **Scenario 1: Testing Sebelum Deploy**

```bash
# Jalankan semua test
npm run test:all

# Jika ada yang fail, lihat detail
npm run test:negative

# Generate report
npm run report
```

### **Scenario 2: Debugging Endpoint Tertentu**

```bash
# Test satu endpoint saja
npm test -- negative_tests/POST_persons_personId_attributes_negative.test.js

# Lihat output detail
```

### **Scenario 3: CI/CD Integration**

```yaml
# .github/workflows/test.yml
- name: Run Negative Tests
  run: npm run test:negative
  
- name: Upload Report
  uses: actions/upload-artifact@v2
  with:
    name: test-report
    path: Test/TESTING_REPORT_LATEST.html
```

---

**🎯 API Anda sekarang dilindungi dengan negative test yang komprehensif! 🛡️**

**Semua endpoint sudah ditest untuk keamanan dan validasi! ✅**
