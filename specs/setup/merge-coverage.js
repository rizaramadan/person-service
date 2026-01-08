#!/usr/bin/env node
/**
 * Merges multiple Go coverage files into a single coverage file.
 * Properly handles overlapping coverage data by combining hit counts.
 * 
 * Usage: node merge-coverage.js output.out file1.out file2.out [file3.out ...]
 */

import fs from 'fs';

const args = process.argv.slice(2);
if (args.length < 2) {
    console.error('Usage: node merge-coverage.js output.out file1.out file2.out [...]');
    process.exit(1);
}

const outputFile = args[0];
const inputFiles = args.slice(1);

// Map to store coverage data: key = "file:startLine.startCol,endLine.endCol numStatements"
// value = max hit count (we use max to represent "covered" from any source)
const coverageMap = new Map();
let mode = 'set';

for (const inputFile of inputFiles) {
    if (!fs.existsSync(inputFile)) {
        console.warn(`Warning: ${inputFile} not found, skipping`);
        continue;
    }

    const content = fs.readFileSync(inputFile, 'utf8');
    const lines = content.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Parse mode line
        if (trimmed.startsWith('mode:')) {
            mode = trimmed.split(':')[1].trim();
            continue;
        }

        // Parse coverage line format: file:startLine.startCol,endLine.endCol numStatements count
        // Example: person-service/main.go:25.39,27.23 2 1
        const match = trimmed.match(/^(.+:\d+\.\d+,\d+\.\d+)\s+(\d+)\s+(\d+)$/);
        if (match) {
            const key = `${match[1]} ${match[2]}`; // file:position numStatements
            const count = parseInt(match[3], 10);

            // Take the max count (if covered in any test, it's covered)
            const existing = coverageMap.get(key) || 0;
            coverageMap.set(key, Math.max(existing, count));
        }
    }
}

// Generate output
const outputLines = [`mode: ${mode}`];

// Sort keys for consistent output
const sortedKeys = Array.from(coverageMap.keys()).sort();

for (const key of sortedKeys) {
    const count = coverageMap.get(key);
    outputLines.push(`${key} ${count}`);
}

fs.writeFileSync(outputFile, outputLines.join('\n') + '\n');
console.log(`Merged coverage written to ${outputFile}`);
console.log(`Total entries: ${coverageMap.size}`);
