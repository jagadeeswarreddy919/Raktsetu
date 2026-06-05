const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, 'raw_chunks.txt'), 'utf8');

const blocks = content.split('{"AllowMultiple"');
console.log('Block 2 length:', blocks[2] ? blocks[2].length : 'none');
if (blocks[2]) {
  console.log('Block 2 first 2000 chars:');
  console.log(blocks[2].substring(0, 2000));
}
