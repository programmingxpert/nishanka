/* eslint-disable */
/**
 * deploy-commands.js
 * Run this ONCE to register slash commands with Discord:
 *   node deploy-commands.js
 *
 * To register globally (all servers), remove process.env.GUILD_ID from the route.
 * Global commands take up to 1 hour to propagate; guild commands are instant.
 */
require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs   = require('fs');
const path = require('path');

const commands = [];

// Recursively collect all command data
(function collectCommands(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            collectCommands(fullPath);
        } else if (entry.name.endsWith('.js') && !entry.name.endsWith('.example')) {
            try {
                const command = require(fullPath);
                if (command?.data?.toJSON) {
                    commands.push(command.data.toJSON());
                }
            } catch (err) {
                console.warn(`Skipping ${entry.name}: ${err.message}`);
            }
        }
    }
})(path.join(__dirname, 'commands'));

console.log(`📦 Found ${commands.length} command(s) to register`);

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
    try {
        const guildId = process.env.GUILD_ID;

        if (guildId) {
            // Guild-specific (instant — great for testing)
            await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId),
                { body: commands },
            );
            console.log(`✅ Successfully registered ${commands.length} command(s) to guild ${guildId}`);
        } else {
            // Global (takes up to 1 hour to propagate)
            await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID),
                { body: commands },
            );
            console.log(`✅ Successfully registered ${commands.length} command(s) globally`);
        }
    } catch (error) {
        console.error('❌ Failed to register commands:', error);
    }
})();
