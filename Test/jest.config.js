/**
 * Jest Configuration for Person Service Tests
 */

export default {
  // Test environment
  testEnvironment: 'node',
  
  // Transform files to ESM
  transform: {},
  
  // Test match patterns
  testMatch: [
    '**/steps/**/*.steps.js',
    '**/steps/**/*.test.js',
    '**/API_Tests/tests/**/*.test.js',
    '**/API_Tests/comprehensive_tests/**/*.test.js',
    '**/API_Tests/specification_tests/**/*.test.js',
    '**/API_Tests/negative_tests/**/*.test.js'
  ],
  
  // Test timeout (30 seconds)
  testTimeout: 30000,
  
  // Verbose output
  verbose: true,
  
  // Custom reporters for automatic report generation
  reporters: [
    'default',
    '<rootDir>/custom-reporter.js'
  ],
  
  // Run tests in band (sequentially)
  maxWorkers: 1,
  
  // Module directories
  moduleDirectories: ['node_modules', '<rootDir>'],
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Setup files
  // setupFilesAfterEnv: ['<rootDir>/setup-tests.js'],
};
