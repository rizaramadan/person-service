import fs from 'fs';
import path from 'path';

const inputFile = process.argv[2] || 'coverage/func.txt';
const outputFile = process.argv[3] || 'coverage/coverage.json';

try {
    const content = fs.readFileSync(inputFile, 'utf8');
    const lines = content.split('\n');

    const results = {
        files: [],
        total: '0%'
    };

    for (const line of lines) {
        if (!line.trim()) continue;

        // Go cover -func format: 
        // person-service/main.go:25:	setupDb			0.0%
        // total:			(statements)		28.4%

        if (line.startsWith('total:')) {
            const parts = line.split(/\s+/);
            results.total = parts[parts.length - 1];
            continue;
        }

        const parts = line.split(/\s+/);
        if (parts.length >= 3) {
            const filePath = parts[0].split(':')[0];
            const functionName = parts[1];
            const coverage = parts[2];

            let fileEntry = results.files.find(f => f.file === filePath);
            if (!fileEntry) {
                fileEntry = { file: filePath, functions: [], coverage: '' };
                results.files.push(fileEntry);
            }

            fileEntry.functions.push({
                name: functionName,
                coverage: coverage
            });
        }
    }

    // Calculate file-level coverage (simplified: just use the last entry if it's the file total, 
    // but go -func lists functions. Standard go cover -func doesn't give per-file totals easily 
    // without more parsing, but we can aggregate).

    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
    console.log(`JSON coverage summary generated at ${outputFile}`);
} catch (err) {
    console.error(`Error parsing coverage: ${err.message}`);
    process.exit(1);
}
