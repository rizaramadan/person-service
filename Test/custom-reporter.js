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
    const outputPath = path.join(__dirname, '_archive', 'artifacts', 'test-results.json');
    const seen = new WeakSet();
    const replacer = (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) return undefined;
        seen.add(value);
      }
      if (key === 'req' || key === 'res' || key === 'request' || key === 'response') return undefined;
      return value;
    };
    try {
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, JSON.stringify(results, replacer, 2), 'utf8');
      console.log('\n📊 Test results saved to: _archive/artifacts/test-results.json');
    } catch (err) {
      console.warn('\n⚠️ Could not save _archive/artifacts/test-results.json:', err.message);
    }
  }
}

export default CustomReporter;
