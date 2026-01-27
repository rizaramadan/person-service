/**
 * Custom Jest Reporter
 * Captures test results and saves to JSON for report generation
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class CustomReporter {
  constructor(globalConfig, options) {
    this._globalConfig = globalConfig;
    this._options = options;
  }

  onRunComplete(contexts, results) {
    const outputPath = path.join(__dirname, 'test-results.json');
    
    // Save test results
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf8');
    
    console.log('\n📊 Test results saved to: test-results.json');
  }
}

export default CustomReporter;
