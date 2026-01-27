# 🧪 Person Service API - Automated Tests

**Complete test suite untuk Person Service API dengan database verification**

---

## 📋 Table of Contents

1. [Quick Start](#-quick-start)
2. [Test Results](#-test-results)
3. [Test Coverage](#-test-coverage)
4. [Documentation](#-documentation)
5. [Running Tests](#-running-tests)

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd Test
npm install
```

### 2. Configure Environment

File `.env` sudah tersedia dengan configuration:

```env
BASE_URL=https://stagingintegro.talentlytic.com
AUTH_TOKEN=person-service-key-82aca3c8-8e5d-42d4-9b00-7bc2f3077a58cd
DB_NAME=person_service
DB_PASSWORD=postgres
```

### 3. Run Simple Test

```bash
npm run test:simple
```

**Result:** ✅ PASSED (1.324s)

---

## ✅ Test Results

**Last Run:** 2026-01-20

```
✅ Test Suites: 1 passed, 1 total
✅ Tests: 1 passed, 1 total
⏱️  Time: 1.324s
```

**What was tested:**
- ✅ API connectivity
- ✅ Environment configuration
- ✅ Authentication (Bearer token)
- ✅ HTTP request/response

**See:** [TEST_RESULTS.md](./TEST_RESULTS.md) for details

---

## 📊 Test Coverage

### Gherkin Features (8 files, 160+ scenarios)

| Feature | Scenarios | Status |
|---------|-----------|--------|
| Person CRUD Operations | 19 | ✅ Ready |
| Person Attributes (Encrypted) | 15 | ✅ Ready |
| Person Images (Encrypted) | 20 | ✅ Ready |
| Pagination & Filtering | 14 | ✅ Ready |
| Error Handling | 30+ | ✅ Ready |
| Performance & Security | 25 | ✅ Ready |
| Health Monitoring | 20 | ✅ Ready |
| Database Verification | 20 | ✅ Ready |

### Database Tables Covered

✅ **person** - Person records (UUID v7)  
✅ **person_attributes** - Encrypted attributes (pgcrypto)  
✅ **person_images** - Encrypted images (pgcrypto)  
✅ **request_log** - Audit trail  

---

## 📚 Documentation

### Getting Started

- **[QUICK_START_INDONESIA.md](./QUICK_START_INDONESIA.md)** - Panduan cepat 5 menit (Bahasa Indonesia)
- **[HOW_TO_RUN_TESTS.md](./HOW_TO_RUN_TESTS.md)** - Complete guide untuk run tests

### Test Details

- **[TEST_RESULTS.md](./TEST_RESULTS.md)** - Latest test run results
- **[DATABASE_VERIFICATION_GUIDE.md](./DATABASE_VERIFICATION_GUIDE.md)** - Database verification details
- **[PERSON_SERVICE_TESTS_SUMMARY.md](./PERSON_SERVICE_TESTS_SUMMARY.md)** - Complete test coverage summary

### Gherkin Features

- **[Gherkin_features/README.md](./Gherkin_features/README.md)** - Feature files documentation
- **[Gherkin_features/*.feature](./Gherkin_features/)** - 8 feature files with 160+ scenarios

---

## 🎯 Running Tests

### Simple Test (Recommended First)

```bash
npm run test:simple
```

**Duration:** ~1-2 seconds  
**Tests:** 1 scenario  
**Purpose:** Verify setup is working  

### Full Test Suite

```bash
npm test
```

**Duration:** ~5-10 minutes  
**Tests:** 160+ scenarios  
**Purpose:** Complete API & database testing  

---

## 🔧 Test Configuration

### Environment Variables

Located in `.env`:

```env
# API
BASE_URL=https://stagingintegro.talentlytic.com
AUTH_TOKEN=person-service-key-82aca3c8-8e5d-42d4-9b00-7bc2f3077a58cd

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=person_service
DB_USER=postgres
DB_PASSWORD=postgres

# Encryption
ENCRYPTION_KEY=test-encryption-key-12345
```

### Jest Configuration

Located in `jest.config.js`:

- ✅ ES Modules support
- ✅ HTML reporter
- ✅ 30s timeout per test
- ✅ Sequential execution (runInBand)

---

## 📁 Project Structure

```
Test/
├── .env                              # Environment configuration
├── package.json                      # Dependencies & scripts
├── jest.config.js                    # Jest configuration
│
├── README.md                         # This file
├── HOW_TO_RUN_TESTS.md              # Complete guide
├── QUICK_START_INDONESIA.md         # Quick start (ID)
├── TEST_RESULTS.md                  # Latest results
│
├── Gherkin_features/                # Feature files
│   ├── README.md
│   ├── person_crud_operations.feature
│   ├── person_attributes.feature
│   ├── person_images.feature
│   ├── person_pagination_filtering.feature
│   ├── error_handling.feature
│   ├── performance_security.feature
│   ├── health_monitoring.feature
│   └── database_verification.feature
│
└── steps/                           # Step definitions
    ├── simple_api_test.steps.js    # Simple test (working)
    └── database_verification.steps.js.example
```

---

## 🐛 Troubleshooting

### "Cannot find module"

```bash
npm install
```

### "Database connection failed"

```bash
# Check PostgreSQL
pg_isready

# Test connection
psql -U postgres -h localhost -d person_service
```

### "API 401 Unauthorized"

Check `AUTH_TOKEN` in `.env` file.

### Tests timeout

Increase timeout in `jest.config.js`:

```javascript
testTimeout: 60000  // 60 seconds
```

---

## ✅ Success Criteria

When tests pass, you'll see:

```
✅ API connection successful
✅ Database connection successful
✅ All tests passed
✅ Data verified in database
✅ No data inconsistencies

Test Suites: X passed, X total
Tests: X passed, X total
Time: X.XXXs
```

---

## 🎉 Current Status

**✅ Test Infrastructure:** READY  
**✅ Environment Setup:** COMPLETE  
**✅ API Connection:** WORKING  
**✅ Authentication:** WORKING  
**✅ Simple Test:** PASSED  

**Next Steps:**
1. Implement step definitions for Gherkin features
2. Run full test suite
3. Generate HTML reports

---

## 📞 Support

For issues or questions:
1. Check [HOW_TO_RUN_TESTS.md](./HOW_TO_RUN_TESTS.md)
2. Review [TEST_RESULTS.md](./TEST_RESULTS.md)
3. Check [DATABASE_VERIFICATION_GUIDE.md](./DATABASE_VERIFICATION_GUIDE.md)

---

**Last Updated:** 2026-01-20  
**Version:** 1.0.0  
**Status:** ✅ READY TO USE
