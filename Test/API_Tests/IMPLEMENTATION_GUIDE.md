# 🚀 Implementation Guide - API_Tests

**How to implement step definitions for API_Tests**

---

## 📁 **Current Structure**

```
Test/API_Tests/
├── README.md                          📖 Documentation
├── IMPLEMENTATION_GUIDE.md            📖 This file
│
├── GET_health.feature                 ✅ Ready for implementation
├── POST_api_key-value.feature         ✅ Ready for implementation
├── GET_api_key-value_key.feature      ✅ Ready for implementation
├── DELETE_api_key-value_key.feature   ✅ Ready for implementation
│
├── POST_persons_personId_attributes.feature    ✅ Ready
├── PUT_persons_personId_attributes.feature     ✅ Ready
├── GET_persons_personId_attributes.feature     ✅ Ready
├── GET_persons_personId_attributes_attributeId.feature  ✅ Ready
├── PUT_persons_personId_attributes_attributeId.feature  ✅ Ready
└── DELETE_persons_personId_attributes_attributeId.feature ✅ Ready
```

**Total: 10 feature files, 90+ scenarios**

---

## 🎯 **Implementation Options**

### **Option 1: Use Jest (Recommended for now)** ✅

**Pros:**
- ✅ Already configured (`Test/jest.config.js`)
- ✅ Database verification working
- ✅ Direct database access
- ✅ Fast execution

**Cons:**
- ❌ Not pure Gherkin (but can reference features)

**Example:**
```javascript
// Test/API_Tests/steps/GET_health.test.js
describe('GET /health - Health Check API', () => {
  test('Health endpoint returns 200 OK', async () => {
    const response = await axios.get(`${BASE_URL}/health`);
    expect(response.status).toBe(200);
  });
});
```

---

### **Option 2: Use Jest-Cucumber** 🔄

**Pros:**
- ✅ True Gherkin implementation
- ✅ Can use feature files directly
- ✅ BDD style

**Cons:**
- ⚠️ Needs additional setup
- ⚠️ More configuration

**Example:**
```javascript
// Test/API_Tests/steps/GET_health.steps.js
import { defineFeature, loadFeature } from 'jest-cucumber';

const feature = loadFeature('./API_Tests/GET_health.feature');

defineFeature(feature, (test) => {
  test('Health endpoint returns 200 OK', ({ given, when, then }) => {
    // implementation
  });
});
```

---

### **Option 3: Keep `specs/` Cucumber Setup** ⏳

**Pros:**
- ✅ Already working
- ✅ Full Cucumber support

**Cons:**
- ⚠️ Need to move features to `specs/`
- ⚠️ Different folder structure

---

## 📝 **Recommended Approach**

### **Phase 1: Start with Jest (Quick Win)** ✅

Create test files that REFERENCE the feature files:

```
Test/API_Tests/
├── features/                    ← Gherkin features (reference)
│   ├── GET_health.feature
│   └── ...
│
└── tests/                       ← Jest tests (implementation)
    ├── GET_health.test.js
    └── ...
```

**Why?**
- ✅ Quick to implement
- ✅ Database verification already working
- ✅ Can reference Gherkin for documentation

---

## 🛠️ **Implementation Steps**

### **Step 1: Create Test Files**

For each feature, create a Jest test:

```bash
Test/API_Tests/tests/
├── GET_health.test.js
├── GET_api_key-value_key.test.js
└── ... (one for each API)
```

### **Step 2: Use Existing Pattern**

Base on working test: `Test/steps/person_attributes_with_db.test.js`

```javascript
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import axios from 'axios';
import pg from 'pg';
import { config } from 'dotenv';

config();

describe('GET /health - Health Check API', () => {
  let apiClient;
  
  beforeAll(() => {
    apiClient = axios.create({
      baseURL: process.env.BASE_URL,
      timeout: 10000
    });
  });
  
  test('Health endpoint returns 200 OK', async () => {
    const response = await apiClient.get('/health');
    expect(response.status).toBe(200);
  });
  
  test('Health response contains status field', async () => {
    const response = await apiClient.get('/health');
    expect(response.data).toHaveProperty('status');
  });
});
```

### **Step 3: Add Database Verification**

For APIs that modify data:

```javascript
test('Create attribute and verify in database', async () => {
  // 1. Call API
  const response = await apiClient.post(...);
  expect(response.status).toBe(201);
  
  // 2. Verify in database
  const dbResult = await dbClient.query(
    'SELECT * FROM person_attributes WHERE id = $1',
    [response.data.id]
  );
  expect(dbResult.rows.length).toBe(1);
  expect(dbResult.rows[0].attribute_key).toBe('email');
});
```

### **Step 4: Update Jest Config**

```javascript
// Test/jest.config.js
testMatch: [
  '**/API_Tests/tests/**/*.test.js',  // Add this
  '**/steps/**/*.test.js'
],
```

---

## 📊 **Priority Order**

### **High Priority:** (Implement First)

1. ✅ `GET_health.test.js` - Simple, no auth, no DB
2. ✅ `GET_api_key-value_key.test.js` - Simple, no auth
3. ✅ `POST_api_key-value.test.js` - Simple, no auth

### **Medium Priority:**

4. ✅ `GET_persons_personId_attributes.test.js` - Auth required
5. ✅ `POST_persons_personId_attributes.test.js` - Auth + DB

### **Low Priority:** (Can reuse from existing)

6. ⏳ Other Person Attributes endpoints
   - Already tested in `person_attributes_with_db.test.js`
   - Can refactor later

---

## 🎯 **Quick Start**

### **1. Create first test:**

```bash
cd Test/API_Tests
mkdir tests
```

### **2. Copy template:**

```javascript
// tests/GET_health.test.js
import { describe, test, expect, beforeAll } from '@jest/globals';
import axios from 'axios';
import { config } from 'dotenv';

config();

describe('GET /health - Health Check API', () => {
  let apiClient;
  
  beforeAll(() => {
    apiClient = axios.create({
      baseURL: process.env.BASE_URL || 'http://localhost:3000',
      timeout: 10000
    });
  });
  
  // Copy scenarios from GET_health.feature and implement
  
  test('Health endpoint returns 200 OK', async () => {
    const response = await apiClient.get('/health');
    expect(response.status).toBe(200);
  });
  
  // Add more tests...
});
```

### **3. Run test:**

```bash
npm test tests/GET_health.test.js
```

---

## 📚 **Reference Existing Tests**

Use these as templates:

| Test File | Good For |
|-----------|----------|
| `steps/simple_api_test.steps.js` | Simple API calls |
| `steps/person_attributes_with_db.test.js` | API + Database verification |
| `specs/steps/health.steps.js` | Cucumber pattern |

---

## ✅ **Success Criteria**

For each API, implement tests that:
1. ✅ Test all scenarios from feature file
2. ✅ Verify API responses
3. ✅ Verify database changes (if applicable)
4. ✅ Test error cases
5. ✅ Test authentication (if applicable)

---

## 🎉 **Benefits of This Structure**

1. **Clear Organization** - One file per API endpoint
2. **Easy to Find** - Want to test GET /health? Open GET_health.feature!
3. **Self-Documenting** - Feature files are documentation
4. **Flexible** - Can use Jest OR Cucumber
5. **Scalable** - Easy to add more tests

---

## 📝 **Next Steps**

1. ✅ Read this guide
2. ✅ Decide: Jest or Jest-Cucumber?
3. ✅ Create `Test/API_Tests/tests/` folder
4. ✅ Implement first test (GET_health)
5. ✅ Run and verify
6. ✅ Repeat for other APIs

---

**Ready to implement!** 🚀

**Start with:** `GET_health.test.js` (simplest)

---

**Last Updated:** 2026-01-20  
**Status:** Ready for implementation  
**Priority:** Start with Health Check API
