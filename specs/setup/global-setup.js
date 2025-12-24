import TestEnvironment from './test-environment.js';

/**
 * Global Setup - I/O Layer
 *
 * Jest's globalSetup hook runs once before all test suites.
 * This orchestrates the test environment initialization and stores
 * it in global variables for access by tests and globalTeardown.
 */
export default async function globalSetup() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Initializing Test Environment');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Initialize test environment
    const testEnv = new TestEnvironment();
    await testEnv.initialize();

    // Store in global for access by tests and globalTeardown
    global.__TEST_ENV__ = testEnv;

    return async () => {
      // Cleanup function returned to Jest
      await testEnv.cleanup();
    };
  } catch (error) {
    console.error('\n✗ Global setup failed:', error);
    process.exit(1);
  }
}
