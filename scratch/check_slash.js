const fs = require('fs');
const path = require('path');

function scanDir(dir, files = []) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            scanDir(fullPath, files);
        } else if (entry.name.endsWith('.js') && !entry.name.endsWith('.example')) {
            files.push(fullPath);
        }
    }
    return files;
}

const commands = scanDir(path.join(__dirname, '..', 'commands'));
const missingSlash = [];

for (const file of commands) {
    try {
        const cmd = require(file);
        if (!cmd.data) {
            missingSlash.push(path.relative(path.join(__dirname, '..'), file));
        }
    } catch (err) {
        console.error(`Error loading ${file}:`, err.message);
    }
}

if (missingSlash.length > 0) {
    console.log("Commands missing slash data:", missingSlash);
} else {
    console.log("All commands have slash data!");
}
