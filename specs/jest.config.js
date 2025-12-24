export default {
  testEnvironment: 'node',
  testTimeout: 120000,
  transform: {},
  globalSetup: '<rootDir>/setup/global-setup.js',
  globalTeardown: '<rootDir>/setup/global-teardown.js',
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/steps/**/*.steps.js'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/steps/common.steps.js'
  ],
  collectCoverageFrom: [
    'tests/**/*.js',
    '!tests/**/*.test.js'
  ]
};
