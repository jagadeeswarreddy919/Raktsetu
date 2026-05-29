const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, 'raw_chunks.txt'), 'utf8');
console.log('Length:', content.length);
console.log('Beginning (first 1000 chars):');
console.log(content.substring(0, 1000));
console.log('\nEnding (last 500 chars):');
console.log(content.substring(content.length - 500));
