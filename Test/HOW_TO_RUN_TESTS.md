# 🧪 How to Run Person Service Tests

Complete guide untuk menjalankan automated tests Person Service API dengan database verification.

---

## 📋 Prerequisites

✅ **Node.js** >= 18.x  
✅ **PostgreSQL** running  
✅ **Database** `person_service` exists  
✅ **API access** ke staging server  

---

## 🚀 Quick Start (5 Menit)

### 1. Navigate ke Test folder

```bash
cd Test
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create .env file

```bash
# Copy template
cp env.example .env

# Or create manually
notepad .env
```

### 4. Edit .env dengan credentials:

```env
# API Configuration
BASE_URL=https://stagingintegro.talentlytic.com
AUTH_TOKEN=person-service-key-82aca3c8-8e5d-42d4-9b00-7bc2f3077a58cd

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=person_service
DB_USER=postgres
DB_PASSWORD=postgres

# Encryption (for encrypted attributes/images)
ENCRYPTION_KEY=test-encryption-key-12345
```

### 5. Run simple test

```bash
npm run test:simple
```

---

## 🎯 Run Tests

### Run 1 Simple Test

```bash
npm run test:simple
```

**What it does:**
- ✅ Tests API connectivity
- ✅ Verifies environment setup
- ✅ Quick validation (< 10 seconds)

### Run All Tests

```bash
npm test
```

**What it tests:**
- ✅ Person CRUD operations
- ✅ Encrypted attributes
- ✅ Encrypted images
- ✅ Database verification
- ✅ All 160+ scenarios

---

## 📊 Test Structure

### Gherkin Features (8 files)

```
Gherkin_features/
├── person_crud_operations.feature        ✅ 19 scenarios
├── person_attributes.feature             ✅ 15 scenarios (encrypted)
├── person_images.feature                 ✅ 20 scenarios (encrypted)
├── person_pagination_filtering.feature   ✅ 14 scenarios
├── error_handling.feature                ✅ 30+ scenarios
├── performance_security.feature          ✅ 25 scenarios
├── health_monitoring.feature             ✅ 20 scenarios
└── database_verification.feature         ✅ 20 scenarios
```

### Database Tables Tested

✅ **person** - Person records dengan UUID v7  
✅ **person_attributes** - Encrypted attributes (pgcrypto)  
✅ **person_images** - Encrypted images (pgcrypto)  
✅ **request_log** - Audit trail  

---

## 🔍 Database Verification

**Every test verifies data in PostgreSQL:**

```
1️⃣ Send API Request
   POST /api/person { "client_id": "test" }
   
2️⃣ Validate API Response
   ✅ Status 201
   ✅ Response contains ID
   
3️⃣ Query Database Directly
   SELECT * FROM person WHERE id = {id}
   
4️⃣ Verify Data Stored
   ✅ Record exists in DB
   ✅ client_id = "test"
   ✅ Timestamps valid
   
5️⃣ Compare API === Database
   ✅ All fields match
```

---

## 📝 Test Reports

After running tests, check:

```
Test/reports/
├── html/
│   └── test-report.html      👈 Open in browser
└── json/
    └── test-results.json
```

---

## 🐛 Troubleshooting

### Problem: "Cannot find module"

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Problem: "Database connection failed"

```bash
# Check PostgreSQL is running
pg_isready

# Test connection
psql -U postgres -h localhost -d person_service
```

### Problem: "API 401 Unauthorized"

Check AUTH_TOKEN in `.env`:
```bash
cat .env | grep AUTH_TOKEN
```

Update with correct token:
```env
AUTH_TOKEN=person-service-key-82aca3c8-8e5d-42d4-9b00-7bc2f3077a58cd
```

### Problem: Tests timeout

Increase timeout in `jest.config.js`:
```javascript
testTimeout: 60000  // 60 seconds
```

---

## 📖 Documentation Files

| File | Description |
|------|-------------|
| `HOW_TO_RUN_TESTS.md` | This file - how to run tests |
| `DATABASE_VERIFICATION_GUIDE.md` | Database verification details |
| `PERSON_SERVICE_TESTS_SUMMARY.md` | Complete test coverage summary |
| `Gherkin_features/README.md` | Feature files documentation |

---

## 💡 Tips

1. **Start simple** - Run `npm run test:simple` first
2. **Check .env** - Verify all credentials are correct
3. **One test at a time** - Debug issues easier
4. **Read reports** - HTML report shows detailed results

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

**Ready to test!** 🎉

Run: `npm run test:simple`

---

**Last Updated:** 2026-01-20  
**Version:** 1.0.0
