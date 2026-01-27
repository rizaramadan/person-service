# 🚀 **Cara Menjalankan Test API**

## 📋 **Daftar Test yang Tersedia**

### **Total: 10 API Endpoints**

| No | API Endpoint | Test File | Jumlah Skenario |
|----|--------------|-----------|-----------------|
| 1  | `GET /health` | `GET_health.test.js` | 6 tests |
| 2  | `POST /api/key-value` | `POST_api_key-value.test.js` | 8 tests |
| 3  | `GET /api/key-value/:key` | `GET_api_key-value_key.test.js` | 6 tests |
| 4  | `DELETE /api/key-value/:key` | `DELETE_api_key-value_key.test.js` | 6 tests |
| 5  | `POST /persons/:personId/attributes` | `POST_persons_personId_attributes.test.js` | 5 tests |
| 6  | `GET /persons/:personId/attributes` | `GET_persons_personId_attributes.test.js` | 3 tests |
| 7  | `GET /persons/:personId/attributes/:attributeId` | `GET_persons_personId_attributes_attributeId.test.js` | 5 tests |
| 8  | `PUT /persons/:personId/attributes/:attributeId` | `PUT_persons_personId_attributes_attributeId.test.js` | 4 tests |
| 9  | `DELETE /persons/:personId/attributes/:attributeId` | `DELETE_persons_personId_attributes_attributeId.test.js` | 5 tests |
| 10 | `PUT /persons/:personId/attributes` | `PUT_persons_personId_attributes.test.js` | 6 tests |

**Total Tests:** ~54 skenario test

---

## ⚙️ **PERSIAPAN SEBELUM MENJALANKAN TEST**

### **1. Pastikan API Server Berjalan**

```powershell
# Terminal 1 - Jalankan API Server
cd "c:\RepoGit\person-service - v2\source\app"

$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/person_service?sslmode=disable"
$env:PERSON_API_KEY_GREEN="person-service-key-82aca3c8-8e5d-42d4-9b00-7bc2f3077a58"

go run main.go
```

✅ **Server harus menampilkan:** `Server starting on port 3000`

---

### **2. Pastikan PostgreSQL Berjalan**

```powershell
# Cek PostgreSQL service
Get-Service postgresql*

# Jika tidak jalan, start service
Start-Service postgresql-x64-14
```

---

### **3. Verifikasi Environment Variables**

File `.env` harus berisi:

```env
BASE_URL=http://localhost:3000
AUTH_TOKEN=person-service-key-82aca3c8-8e5d-42d4-9b00-7bc2f3077a58
DB_HOST=localhost
DB_PORT=5432
DB_NAME=person_service
DB_USER=postgres
DB_PASSWORD=postgres
ENCRYPTION_KEY=test-encryption-key-12345
```

---

## 🎯 **CARA MENJALANKAN TEST**

### **Terminal Baru - Jalankan Test**

```powershell
cd "c:\RepoGit\person-service - v2\Test"
```

---

### **1️⃣ Test SEMUA API (54 tests)**

```powershell
npm test
```

atau untuk API tests saja:

```powershell
npm run test:api
```

---

### **2️⃣ Test per Kategori**

#### **Test Health Endpoint (6 tests)**
```powershell
npm run test:health
```

#### **Test Key-Value API (20 tests)**
```powershell
npm run test:keyvalue
```

#### **Test Person Attributes API (28 tests)**
```powershell
npm run test:attributes
```

---

### **3️⃣ Test per File Individual**

```powershell
# Health check
npm run test:health

# Key-Value - Create/Update
node --experimental-vm-modules node_modules/jest/bin/jest.js API_Tests/tests/POST_api_key-value.test.js --runInBand

# Key-Value - Get
node --experimental-vm-modules node_modules/jest/bin/jest.js API_Tests/tests/GET_api_key-value_key.test.js --runInBand

# Key-Value - Delete
node --experimental-vm-modules node_modules/jest/bin/jest.js API_Tests/tests/DELETE_api_key-value_key.test.js --runInBand

# Person Attributes - Create
node --experimental-vm-modules node_modules/jest/bin/jest.js API_Tests/tests/POST_persons_personId_attributes.test.js --runInBand

# Person Attributes - Get All
node --experimental-vm-modules node_modules/jest/bin/jest.js API_Tests/tests/GET_persons_personId_attributes.test.js --runInBand

# Person Attributes - Get One
node --experimental-vm-modules node_modules/jest/bin/jest.js API_Tests/tests/GET_persons_personId_attributes_attributeId.test.js --runInBand

# Person Attributes - Update
node --experimental-vm-modules node_modules/jest/bin/jest.js API_Tests/tests/PUT_persons_personId_attributes_attributeId.test.js --runInBand

# Person Attributes - Delete
node --experimental-vm-modules node_modules/jest/bin/jest.js API_Tests/tests/DELETE_persons_personId_attributes_attributeId.test.js --runInBand

# Person Attributes - Bulk Update
node --experimental-vm-modules node_modules/jest/bin/jest.js API_Tests/tests/PUT_persons_personId_attributes.test.js --runInBand
```

---

## 📊 **CONTOH OUTPUT TEST**

### **✅ Sukses:**

```
PASS  API_Tests/tests/GET_health.test.js
  GET /health - Health Check API
    ✓ Health endpoint returns 200 OK (45 ms)
    ✓ Health response contains status field (12 ms)
    ✓ Health response is valid JSON (10 ms)
    ✓ Health check responds within acceptable time (15 ms)
    ✓ Multiple health checks are consistent (67 ms)
    ✓ Health check does not timeout (11 ms)

Test Suites: 1 passed, 1 total
Tests:       6 passed, 6 total
Snapshots:   0 total
Time:        2.156 s
```

### **❌ Error:**

```
FAIL  API_Tests/tests/GET_health.test.js
  ● GET /health - Health Check API › Health endpoint returns 200 OK

    AxiosError: connect ECONNREFUSED ::1:3000
      
    Caused by:
    - API server tidak jalan
    - BASE_URL salah
    - Port salah
```

---

## 🔍 **TROUBLESHOOTING**

### **❌ Error: connect ECONNREFUSED**

**Penyebab:** API server tidak jalan

**Solusi:**
```powershell
# Jalankan API server di terminal lain
cd "c:\RepoGit\person-service - v2\source\app"
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/person_service?sslmode=disable"
$env:PERSON_API_KEY_GREEN="person-service-key-82aca3c8-8e5d-42d4-9b00-7bc2f3077a58"
go run main.go
```

---

### **❌ Error: 401 Unauthorized**

**Penyebab:** API key salah atau tidak ada

**Solusi:**
```powershell
# Cek .env file
cat .env | Select-String "AUTH_TOKEN"

# Harus sama dengan:
AUTH_TOKEN=person-service-key-82aca3c8-8e5d-42d4-9b00-7bc2f3077a58

# Pastikan server dijalankan dengan env var:
$env:PERSON_API_KEY_GREEN="person-service-key-82aca3c8-8e5d-42d4-9b00-7bc2f3077a58"
```

---

### **❌ Error: database connection failed**

**Penyebab:** PostgreSQL tidak jalan atau credentials salah

**Solusi:**
```powershell
# Cek PostgreSQL
Get-Service postgresql*

# Start jika belum jalan
Start-Service postgresql-x64-14

# Verifikasi connection
npm run verify-db
```

---

## 📝 **COVERAGE TEST PER API**

### **Key-Value API Tests:**

| Test Case | POST | GET | DELETE |
|-----------|------|-----|--------|
| Basic CRUD | ✅ | ✅ | ✅ |
| Error handling | ✅ | ✅ | ✅ |
| Special characters | ✅ | ✅ | - |
| Non-existent data | - | ✅ | ✅ |
| Multiple operations | ✅ | ✅ | ✅ |
| Full CRUD lifecycle | - | - | ✅ |

### **Person Attributes API Tests:**

| Test Case | POST | GET All | GET One | PUT | DELETE | Bulk PUT |
|-----------|------|---------|---------|-----|--------|----------|
| Authentication | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Basic CRUD | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Validation | ✅ | - | - | ✅ | - | ✅ |
| Error handling | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Database verification | - | - | ✅ | - | ✅ | - |
| Decryption check | - | ✅ | ✅ | - | - | - |
| Full CRUD lifecycle | - | - | - | - | ✅ | - |

---

## 🎯 **Quick Commands**

```powershell
# Check koneksi dulu
npm run check

# Test cepat - Health only
npm run test:health

# Test semua Key-Value API
npm run test:keyvalue

# Test semua Person Attributes
npm run test:attributes

# Test SEMUA API
npm run test:api

# Test dengan output detail
npm test -- --verbose
```

---

## 📂 **Struktur Folder**

```
Test/
├── API_Tests/
│   ├── tests/                          ← TEST FILES DI SINI
│   │   ├── GET_health.test.js
│   │   ├── POST_api_key-value.test.js
│   │   ├── GET_api_key-value_key.test.js
│   │   └── ... (7 more files)
│   ├── *.feature                       ← Gherkin (documentation)
│   └── HOW_TO_RUN_TESTS.md             ← Dokumentasi ini
├── .env                                 ← Environment config
├── package.json                         ← NPM scripts
└── jest.config.js                       ← Jest configuration
```

---

## ✅ **Checklist Sebelum Test**

- [ ] PostgreSQL service running
- [ ] API server running (port 3000)
- [ ] File `.env` sudah diisi dengan benar
- [ ] `npm install` sudah dijalankan
- [ ] API server menggunakan `PERSON_API_KEY_GREEN`

---

## 🎉 **Success!**

Jika semua test passing, Anda akan melihat:

```
Test Suites: 10 passed, 10 total
Tests:       54 passed, 54 total
Snapshots:   0 total
Time:        XX.XXX s

Ran all test suites matching /API_Tests\/tests/i.
```

---

**Happy Testing! 🚀**
