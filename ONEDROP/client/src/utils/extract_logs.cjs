const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\jagad\\.gemini\\antigravity-ide\\brain\\76081e9a-dc9d-488b-84af-0d1c1c33be58\\.system_generated\\logs\\transcript.jsonl';

const lines = fs.readFileSync(logPath, 'utf8').split('\n');

for (let line of lines) {
  if (!line.trim()) continue;
  try {
    const obj = JSON.parse(line);
    if (obj.step_index === 1527) {
      console.log('Found Step 1527!');
      const tc = obj.tool_calls[0];
      const chunksStr = tc.args.ReplacementChunks;
      console.log('Writing raw ReplacementChunks string to raw_chunks.txt');
      fs.writeFileSync(path.join(__dirname, 'raw_chunks.txt'), chunksStr);
      
      // Let's write a simple regex or parser to find target/replacement
      // Let's replace the escape sequences so that it can be parsed as JSON safely
      // A common issue is unescaped newlines inside strings in JSON
      const sanitized = chunksStr
        .replace(/[\n\r]/g, '\\n') // replace real newlines with \n
        .replace(/\t/g, '\\t');
      
      try {
        const chunks = JSON.parse(sanitized);
        console.log('Successfully parsed sanitized chunks! Count:', chunks.length);
        chunks.forEach((chunk, index) => {
          fs.writeFileSync(path.join(__dirname, `chunk_${index}_replacement.txt`), chunk.ReplacementContent);
          fs.writeFileSync(path.join(__dirname, `chunk_${index}_target.txt`), chunk.TargetContent);
          console.log(`Wrote chunk_${index}_replacement.txt and chunk_${index}_target.txt`);
        });
      } catch (innerErr) {
        console.log('Sanitized parsing also failed:', innerErr.message);
      }
    }
  } catch (err) {
    // ignore
  }
}
