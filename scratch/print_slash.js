const fs = require('fs');
const path = require('path');

const commandsDir = path.join(__dirname, '..', 'commands');
const slashCommands = [];

function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            scanDir(fullPath);
        } else if (entry.name.endsWith('.js') && !entry.name.endsWith('.example')) {
            try {
                const cmd = require(fullPath);
                if (cmd.data && typeof cmd.data.toJSON === 'function') {
                    slashCommands.push({
                        name: cmd.data.name,
                        file: entry.name,
                        category: cmd.category || 'none'
                    });
                }
            } catch (err) {
                console.error(`Error loading ${entry.name}:`, err.message);
            }
        }
    }
}

scanDir(commandsDir);
console.log(`Found ${slashCommands.length} slash commands:`);
console.log(slashCommands);
