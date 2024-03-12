const fs = require('fs');
const args = fs.readFileSync('.vscode/debug-args.txt', 'utf-8').split('\n').filter(Boolean);
process.argv.push(...args);
