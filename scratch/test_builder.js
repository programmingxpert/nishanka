const fs = require('fs');
const path = require('path');

const commandsDir = path.join(__dirname, '..', 'commands');
const categoryCommands = {};

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
                    const category = cmd.category || 'none';
                    if (!categoryCommands[category]) {
                        categoryCommands[category] = [];
                    }
                    categoryCommands[category].push(cmd);
                }
            } catch (err) {
                console.error(`Error loading ${entry.name}:`, err.message);
            }
        }
    }
}

scanDir(commandsDir);

// Define categories to group and their names/descriptions
const GROUP_CONFIGS = {
    moderation: { name: 'moderation', description: 'Server moderation and administration commands' },
    economy: { name: 'economy', description: 'Economy, balance, shop, and games commands' },
    fun: { name: 'fun', description: 'Fun, games, and relationship commands' },
    giveaway: { name: 'giveaway', description: 'Create and manage giveaways' },
    music: { name: 'music', description: 'Music playback and queue controls' },
    profile: { name: 'profile', description: 'View and customize your user profile' },
    utility: { name: 'utility', description: 'Utility and informational commands' },
    admin: { name: 'admin', description: 'Bot administrator settings' }
};

const finalJSON = [];

// Helper to convert command JSON to subcommand (type 1) or subcommand group (type 2)
function toSubcommandOrGroup(cmdJson) {
    const hasSubcommands = cmdJson.options && cmdJson.options.some(opt => opt.type === 1 || opt.type === 2);
    
    // Subcommand: type 1, Subcommand Group: type 2
    const target = {
        name: cmdJson.name,
        description: cmdJson.description,
        type: hasSubcommands ? 2 : 1
    };
    
    if (cmdJson.options) {
        target.options = cmdJson.options;
    }
    
    return target;
}

for (const [category, config] of Object.entries(GROUP_CONFIGS)) {
    const cmds = categoryCommands[category] || [];
    if (cmds.length === 0) continue;
    
    const topLevelCmd = {
        name: config.name,
        description: config.description,
        options: []
    };
    
    // Perform category-specific transformations
    if (category === 'giveaway') {
        // giveawayCreate has subcommands (like create).
        // giveawayEnd (giveawayend) has options.
        // We merge them as subcommands of /giveaway directly
        for (const cmd of cmds) {
            const cmdJson = cmd.data.toJSON();
            if (cmdJson.name === 'giveaway') {
                // Extract options which are subcommands
                if (cmdJson.options) {
                    for (const opt of cmdJson.options) {
                        if (opt.type === 1) {
                            topLevelCmd.options.push(opt);
                        }
                    }
                }
            } else if (cmdJson.name === 'giveawayend') {
                // Convert giveawayend into a subcommand named "end"
                const sub = toSubcommandOrGroup(cmdJson);
                sub.name = 'end';
                topLevelCmd.options.push(sub);
            }
        }
    } else if (category === 'economy') {
        for (const cmd of cmds) {
            const cmdJson = cmd.data.toJSON();
            const sub = toSubcommandOrGroup(cmdJson);
            
            // Override clashing name
            if (sub.name === 'economy') {
                sub.name = 'status';
            }
            topLevelCmd.options.push(sub);
        }
    } else if (category === 'profile') {
        for (const cmd of cmds) {
            const cmdJson = cmd.data.toJSON();
            const sub = toSubcommandOrGroup(cmdJson);
            
            if (sub.name === 'profile') {
                sub.name = 'view';
            } else if (sub.name === 'profile-edit') {
                sub.name = 'edit';
            } else if (sub.name === 'profile-reset') {
                sub.name = 'reset';
            }
            topLevelCmd.options.push(sub);
        }
    } else if (category === 'fun') {
        // Since fun has 29 commands, we must group them.
        // Let's group relationship commands under subcommand group "relationship"
        // and game commands under subcommand group "game"
        const RELATIONSHIP_CMDS = ['adopt', 'divorce', 'family', 'familytree', 'marry', 'proposals', 'ship'];
        const GAME_CMDS = ['blackjack', 'geoguesser', 'hangman', 'scramble', 'wordbomb', 'emojidecode', 'guesstheflag', 'truthordare'];
        
        const relationshipGroup = {
            name: 'relationship',
            description: 'Relationship and marriage commands',
            type: 2, // Subcommand Group
            options: []
        };
        
        const gameGroup = {
            name: 'game',
            description: 'Fun games and activities',
            type: 2, // Subcommand Group
            options: []
        };
        
        for (const cmd of cmds) {
            const cmdJson = cmd.data.toJSON();
            const sub = toSubcommandOrGroup(cmdJson);
            
            if (RELATIONSHIP_CMDS.includes(sub.name)) {
                relationshipGroup.options.push(sub);
            } else if (GAME_CMDS.includes(sub.name)) {
                gameGroup.options.push(sub);
            } else {
                topLevelCmd.options.push(sub);
            }
        }
        
        if (relationshipGroup.options.length > 0) {
            topLevelCmd.options.push(relationshipGroup);
        }
        if (gameGroup.options.length > 0) {
            topLevelCmd.options.push(gameGroup);
        }
    } else {
        // Flat mapping for moderation, music, utility, admin
        for (const cmd of cmds) {
            const cmdJson = cmd.data.toJSON();
            const sub = toSubcommandOrGroup(cmdJson);
            topLevelCmd.options.push(sub);
        }
    }
    
    finalJSON.push(topLevelCmd);
}

// Add the ungrouped actions (action.js) registered as /actions
const actionsCmds = categoryCommands['actions'] || [];
const actionCmd = actionsCmds.find(c => c.data.name === 'action');
if (actionCmd) {
    const actionJson = actionCmd.data.toJSON();
    actionJson.name = 'actions'; // Rename to /actions
    finalJSON.push(actionJson);
}

console.log(`Generated ${finalJSON.length} top-level slash commands.`);
finalJSON.forEach(cmd => {
    console.log(`- /${cmd.name}: ${cmd.options ? cmd.options.length : 0} options`);
    if (cmd.options) {
        cmd.options.forEach(opt => {
            console.log(`  - ${opt.name} (type: ${opt.type})`);
        });
    }
});
