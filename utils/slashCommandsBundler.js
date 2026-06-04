/* eslint-disable */
const fs = require('fs');
const path = require('path');

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

// Helpers to identify relationship and game commands for the /fun category grouping
const RELATIONSHIP_CMDS = ['adopt', 'divorce', 'family', 'familytree', 'marry', 'proposals', 'ship'];
const GAME_CMDS = ['blackjack', 'geoguesser', 'hangman', 'scramble', 'wordbomb', 'emojidecode', 'guesstheflag', 'truthordare', 'animebattle', 'battle', 'deathbattle'];

function scanDir(dir, commandList = []) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            scanDir(fullPath, commandList);
        } else if (entry.name.endsWith('.js') && !entry.name.endsWith('.example')) {
            try {
                // Delete cache to ensure fresh require if run in reload contexts
                delete require.cache[require.resolve(fullPath)];
                const cmd = require(fullPath);
                if (cmd.data && typeof cmd.data.toJSON === 'function') {
                    commandList.push(cmd);
                }
            } catch (err) {
                console.error(`[slashCommandsBundler] Skipping ${entry.name}:`, err.message);
            }
        }
    }
    return commandList;
}

function toSubcommandOrGroup(cmdJson) {
    const hasSubcommands = cmdJson.options && cmdJson.options.some(opt => opt.type === 1 || opt.type === 2);
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

function bundleSlashCommands() {
    const commandsDir = path.join(__dirname, '..', 'commands');
    const allCommands = scanDir(commandsDir);
    const categoryCommands = {};

    for (const cmd of allCommands) {
        const category = cmd.category || 'none';
        if (!categoryCommands[category]) {
            categoryCommands[category] = [];
        }
        categoryCommands[category].push(cmd);
    }

    const finalJSON = [];

    for (const [category, config] of Object.entries(GROUP_CONFIGS)) {
        let cmds = categoryCommands[category] || [];
        if (category === 'fun') {
            cmds = [
                ...cmds,
                ...(categoryCommands['minigames'] || []),
                ...(categoryCommands['casino'] || [])
            ];
        }
        if (cmds.length === 0) continue;

        const topLevelCmd = {
            name: config.name,
            description: config.description,
            options: []
        };

        if (category === 'giveaway') {
            for (const cmd of cmds) {
                const cmdJson = cmd.data.toJSON();
                if (cmdJson.name === 'giveaway') {
                    if (cmdJson.options) {
                        for (const opt of cmdJson.options) {
                            if (opt.type === 1) {
                                topLevelCmd.options.push(opt);
                            }
                        }
                    }
                } else if (cmdJson.name === 'giveawayend') {
                    const sub = toSubcommandOrGroup(cmdJson);
                    sub.name = 'end';
                    topLevelCmd.options.push(sub);
                }
            }
        } else if (category === 'economy') {
            const ECONOMY_GAMES = ['slots', 'coinflip', 'gamble', 'buckshot', 'mines'];
            const ECONOMY_EARN = ['crime', 'daily', 'dig', 'dumpster', 'expedition', 'fish', 'grab', 'hourly', 'memehunt', 'monthly', 'scavenge', 'weekly', 'work'];

            const gamesGroup = {
                name: 'game',
                description: 'Play economy minigames to win or lose baubles',
                type: 2,
                options: []
            };

            const earnGroup = {
                name: 'action',
                description: 'Earning baubles and related activities',
                type: 2,
                options: []
            };

            for (const cmd of cmds) {
                const cmdJson = cmd.data.toJSON();
                const sub = toSubcommandOrGroup(cmdJson);
                if (sub.name === 'economy') {
                    sub.name = 'status';
                }

                if (ECONOMY_GAMES.includes(sub.name)) {
                    gamesGroup.options.push(sub);
                } else if (ECONOMY_EARN.includes(sub.name)) {
                    earnGroup.options.push(sub);
                } else {
                    topLevelCmd.options.push(sub);
                }
            }

            if (gamesGroup.options.length > 0) {
                topLevelCmd.options.push(gamesGroup);
            }
            if (earnGroup.options.length > 0) {
                topLevelCmd.options.push(earnGroup);
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
            const relationshipGroup = {
                name: 'relationship',
                description: 'Relationship and marriage commands',
                type: 2,
                options: []
            };

            const gameGroup = {
                name: 'game',
                description: 'Fun games and activities',
                type: 2,
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
            for (const cmd of cmds) {
                const cmdJson = cmd.data.toJSON();
                const sub = toSubcommandOrGroup(cmdJson);
                topLevelCmd.options.push(sub);
            }
        }

        finalJSON.push(topLevelCmd);
    }

    // Add ungrouped actions (action.js) registered under the name "/actions"
    const actionsCmds = categoryCommands['actions'] || [];
    const actionCmd = actionsCmds.find(c => c.data.name === 'action');
    if (actionCmd) {
        const actionJson = actionCmd.data.toJSON();
        actionJson.name = 'actions';
        finalJSON.push(actionJson);
    }

    // Add standalone top-level commands from category 'ai'
    const aiCmds = categoryCommands['ai'] || [];
    for (const cmd of aiCmds) {
        if (cmd.data && typeof cmd.data.toJSON === 'function') {
            finalJSON.push(cmd.data.toJSON());
        }
    }

    return finalJSON;
}

function resolveGroupedCommand(interaction, client) {
    const topLevel = interaction.commandName;
    let resolvedName = topLevel;

    if (topLevel === 'moderation') {
        const subGroup = interaction.options.getSubcommandGroup(false);
        const subCmd = interaction.options.getSubcommand(false);
        if (subGroup) {
            resolvedName = subGroup;
        } else if (subCmd) {
            resolvedName = subCmd;
        }
    } else if (topLevel === 'economy') {
        const subGroup = interaction.options.getSubcommandGroup(false);
        const subCmd = interaction.options.getSubcommand(false);
        if (subGroup === 'game' || subGroup === 'action') {
            resolvedName = subCmd;
        } else if (subCmd === 'status') {
            resolvedName = 'economy';
        } else if (subCmd) {
            resolvedName = subCmd;
        }
    } else if (topLevel === 'fun') {
        const subGroup = interaction.options.getSubcommandGroup(false);
        const subCmd = interaction.options.getSubcommand(false);
        if (subGroup === 'disown') {
            resolvedName = 'disown';
        } else if (subGroup === 'relationship' || subGroup === 'game') {
            resolvedName = subCmd;
        } else if (subCmd) {
            resolvedName = subCmd;
        }
    } else if (topLevel === 'giveaway') {
        const subCmd = interaction.options.getSubcommand(false);
        if (subCmd === 'create') {
            resolvedName = 'giveaway';
        } else if (subCmd === 'end') {
            resolvedName = 'giveawayend';
        }
    } else if (topLevel === 'music') {
        const subCmd = interaction.options.getSubcommand(false);
        if (subCmd) {
            resolvedName = subCmd;
        }
    } else if (topLevel === 'profile') {
        const subCmd = interaction.options.getSubcommand(false);
        if (subCmd === 'view') {
            resolvedName = 'profile';
        } else if (subCmd === 'edit') {
            resolvedName = 'profile-edit';
        } else if (subCmd === 'reset') {
            resolvedName = 'profile-reset';
        } else if (subCmd === 'title') {
            resolvedName = 'title';
        } else if (subCmd === 'achievements') {
            resolvedName = 'achievements';
        } else if (subCmd === 'achievements-list') {
            resolvedName = 'achievements-list';
        }
    } else if (topLevel === 'utility') {
        const subCmd = interaction.options.getSubcommand(false);
        if (subCmd) {
            resolvedName = subCmd;
        }
    } else if (topLevel === 'admin') {
        const subCmd = interaction.options.getSubcommand(false);
        if (subCmd) {
            resolvedName = subCmd;
        }
    } else if (topLevel === 'actions') {
        resolvedName = 'action';
    }

    return client.commands.get(resolvedName);
}

module.exports = {
    bundleSlashCommands,
    resolveGroupedCommand
};
