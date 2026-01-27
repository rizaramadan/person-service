# 🚀 Quick Start - Cara Cepat Run Tests

**5 Menit Setup & Test Person Service API!**

---

## 🎯 Langkah Cepat

### 1️⃣ Masuk ke folder Test

```bash
cd Test
```

### 2️⃣ Install dependencies

```bash
npm install
```

### 3️⃣ Pastikan .env sudah terisi

File `.env` sudah ada dengan config:
```env
BASE_URL=https://stagingintegro.talentlytic.com
AUTH_TOKEN=person-service-key-82aca3c8-8e5d-42d4-9b00-7bc2f3077a58cd
DB_NAME=person_service
DB_PASSWORD=postgres
```

### 4️⃣ Run simple test

```bash
npm run test:simple
```

---

## ✅ Kalau Berhasil

Kamu akan lihat:

```
PASS steps/simple_api_test.steps.js
✓ Service health check returns OK
  ✓ the API service is running
  ✓ I send a GET request to "/health"
  ✓ the response status code should be 200
  ✓ the response body should contain status "ok"

Test Suites: 1 passed, 1 total
Tests: 1 passed, 1 total
```

---

## ❌ Kalau Error

### "Cannot find module"
```bash
npm install
```

### "Database connection failed"
```bash
# Check PostgreSQL running
pg_isready
```

### "API 401"
Cek `AUTH_TOKEN` di `.env` sudah benar

---

## 📚 Dokumentasi Lengkap

Baca: **HOW_TO_RUN_TESTS.md**

---

**Selamat Testing!** 🎉
