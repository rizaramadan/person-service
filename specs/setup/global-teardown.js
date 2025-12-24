/**
 * Global Teardown - I/O Layer
 *
 * Jest's globalTeardown hook runs once after all test suites.
 * This ensures proper cleanup of the test environment.
 */
export default async function globalTeardown() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Tearing Down Test Environment');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    if (global.__TEST_ENV__) {
      await global.__TEST_ENV__.cleanup();
    }
  } catch (error) {
    console.error('✗ Global teardown failed:', error);
    process.exit(1);
  }
}
