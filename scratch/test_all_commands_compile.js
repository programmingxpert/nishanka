const fs = require('fs');
const path = require('path');

const commandsDir = path.join(__dirname, '..', 'commands');
let failed = false;

function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            scanDir(fullPath);
        } else if (entry.name.endsWith('.js') && !entry.name.endsWith('.example')) {
            try {
                require(fullPath);
            } catch (err) {
                console.error(`❌ Failed to compile ${entry.name}:`, err);
                failed = true;
            }
        }
    }
}

console.log("Loading all command files to test compile...");
scanDir(commandsDir);

if (failed) {
    console.error("❌ Some command files failed to compile.");
    process.exit(1);
} else {
    console.log("✅ All command files compiled successfully!");
}
