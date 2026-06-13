const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\HP\\.gemini\\antigravity\\brain\\63e86084-8b73-41a0-ace7-52a7f0000ee5\\.system_generated\\logs\\transcript.jsonl', 'utf8');
const lines = content.split('\n');

lines.forEach((line, index) => {
    if (line.includes('BoxItems') || line.includes('BoxSales')) {
        console.log(`Line ${index}:`);
        try {
            const obj = JSON.parse(line);
            console.log(`- type: ${obj.type}, source: ${obj.source}`);
            if (obj.content) {
                // Find occurrences of BoxItems/BoxSales
                const linesOfContent = obj.content.split('\n');
                linesOfContent.forEach((cLine, cIdx) => {
                    if (cLine.includes('BoxItems') || cLine.includes('BoxSales')) {
                        console.log(`  Content L${cIdx}: ${cLine}`);
                    }
                });
            }
        } catch(e) {
            console.log("  Parse error or truncated block");
        }
    }
});
