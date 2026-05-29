const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, 'raw_chunks.txt'), 'utf8');

try {
  const chunks = JSON.parse(content);
  console.log('Successfully parsed JSON directly! Count:', chunks.length);
  chunks.forEach((chunk, index) => {
    fs.writeFileSync(path.join(__dirname, `chunk_${index}_replacement.txt`), chunk.ReplacementContent);
    fs.writeFileSync(path.join(__dirname, `chunk_${index}_target.txt`), chunk.TargetContent);
    console.log(`Wrote chunk_${index}_replacement.txt (len: ${chunk.ReplacementContent.length})`);
  });
} catch (err) {
  console.log('Direct JSON parse failed:', err.message);
  
  // Custom parser that doesn't care about order
  // Let's split by {"AllowMultiple" to get each chunk
  const chunkBlocks = content.split('{"AllowMultiple"');
  console.log('Split into blocks:', chunkBlocks.length);
  
  chunkBlocks.forEach((block, index) => {
    if (index === 0) return; // prelude
    
    // Find TargetContent
    let targetContent = '';
    let targetMatch = block.match(/"TargetContent"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    if (targetMatch) {
      targetContent = targetMatch[1];
    }
    
    // Find ReplacementContent
    let replacementContent = '';
    let replMatch = block.match(/"ReplacementContent"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    if (replMatch) {
      replacementContent = replMatch[1];
    }
    
    const unescapeStr = (str) => {
      return str
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');
    };
    
    const finalTarget = unescapeStr(targetContent);
    const finalRepl = unescapeStr(replacementContent);
    
    fs.writeFileSync(path.join(__dirname, `chunk_${index}_target.txt`), finalTarget);
    fs.writeFileSync(path.join(__dirname, `chunk_${index}_replacement.txt`), finalRepl);
    console.log(`Block ${index}: Extracted Target (len: ${finalTarget.length}), Replacement (len: ${finalRepl.length})`);
  });
}
