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
      const toolCalls = obj.tool_calls;
      if (toolCalls && toolCalls.length > 0) {
        const argStr = toolCalls[0].args;
        // The args might be a string or an object depending on the serialization
        const args = typeof argStr === 'string' ? JSON.parse(argStr) : argStr;
        const chunks = typeof args.ReplacementChunks === 'string' ? JSON.parse(args.ReplacementChunks) : args.ReplacementChunks;
        
        console.log(`Number of chunks: ${chunks.length}`);
        chunks.forEach((chunk, index) => {
          console.log(`\n--- Chunk ${index} ---`);
          console.log(`StartLine: ${chunk.StartLine}, EndLine: ${chunk.EndLine}`);
          console.log(`TargetContent (first 100 chars): ${chunk.TargetContent.substring(0, 100)}`);
          console.log(`ReplacementContent (length: ${chunk.ReplacementContent.length})`);
          if (chunk.TargetContent.includes('Heatmap') || chunk.ReplacementContent.includes('Heatmap')) {
            console.log('MATCHED HEATMAP CHUNK!');
            fs.writeFileSync(`chunk_${index}_replacement.txt`, chunk.ReplacementContent);
            console.log(`Wrote replacement to chunk_${index}_replacement.txt`);
          }
        });
      }
    }
  } catch (err) {
    // Ignore JSON errors
  }
}
