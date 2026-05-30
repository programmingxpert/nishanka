const fs = require('fs');
const path = require('path');

const commandsDir = path.join(__dirname, '..', 'commands');
const commandInfo = [];

function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            scanDir(fullPath);
        } else if (entry.name.endsWith('.js') && !entry.name.endsWith('.example')) {
            try {
                const cmd = require(fullPath);
                commandInfo.push({
                    name: cmd.data?.name || 'unknown',
                    file: entry.name,
                    category: cmd.category || 'none',
                    hasSlash: !!(cmd.data && typeof cmd.data.toJSON === 'function'),
                    hasOptions: !!(cmd.data?.options?.length),
                    hasSubcommands: !!(cmd.data?.options?.some(o => o.type === 1 || o.type === 2))
                });
            } catch (err) {
                console.error(`Error loading ${entry.name}:`, err.message);
            }
        }
    }
}

scanDir(commandsDir);
const filtered = commandInfo.filter(c => c.category === 'admin' || c.category === 'actions');
console.log(JSON.stringify(filtered, null, 2));
