const fs = require('fs');
const path = require('path');

try {
    const errorLogPath = path.join(__dirname, '..', 'error.log');
    if (fs.existsSync(errorLogPath)) {
        // Read file using utf16le encoding since it was generated with that encoding
        const logContent = fs.readFileSync(errorLogPath, 'utf16le');
        const lines = logContent.split('\n');
        
        console.log(`Total lines in error.log: ${lines.length}`);
        
        // Find lines containing economy-related terms
        const keywords = ['economy', 'multiplier', 'shop', 'bauble', 'engine', 'multiplier', 'mongoose', 'mongo'];
        const matched = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (keywords.some(kw => line.toLowerCase().includes(kw))) {
                matched.push({ lineNum: i + 1, content: line.trim() });
            }
        }
        
        console.log(`Found ${matched.length} matched lines:`);
        matched.slice(-30).forEach(m => {
            console.log(`Line ${m.lineNum}: ${m.content}`);
        });
    } else {
        console.log("No error.log found.");
    }
} catch (err) {
    console.error("Error reading log:", err);
}
