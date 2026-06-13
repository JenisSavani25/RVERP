const fs = require('fs');
const path = require('path');

const dir = 'e:/RV';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js') && f !== 'shared.js');

files.forEach(file => {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Regex to match DOMContentLoaded listener
    const targetPattern = /document\.addEventListener\s*\(\s*["']DOMContentLoaded["']\s*,\s*\(\s*\)\s*=>\s*\{/;
    if (content.match(targetPattern)) {
        content = content.replace(targetPattern, 'document.addEventListener("DOMContentLoaded", async () => {\n    await loadAllDataFromServer();');
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated DOMContentLoaded in ${file}`);
    } else {
        console.log(`Skipped (no match): ${file}`);
    }
});
