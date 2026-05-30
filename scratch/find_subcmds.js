const fs = require('fs');
const path = require('path');

const commandsDir = path.join(__dirname, '..', 'commands');

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
                    const json = cmd.data.toJSON();
                    const subcommands = json.options ? json.options.filter(o => o.type === 1) : [];
                    const subcommandGroups = json.options ? json.options.filter(o => o.type === 2) : [];
                    if (subcommands.length > 0 || subcommandGroups.length > 0) {
                        console.log(`Command /${json.name} has ${subcommands.length} subcommands and ${subcommandGroups.length} subcommand groups.`);
                        subcommands.forEach(s => console.log(`  - Subcommand: ${s.name}`));
                        subcommandGroups.forEach(g => console.log(`  - Group: ${g.name}`));
                    }
                }
            } catch (err) {
                console.error(`Error loading ${entry.name}:`, err.message);
            }
        }
    }
}

scanDir(commandsDir);
