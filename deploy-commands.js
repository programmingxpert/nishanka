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
const { bundleSlashCommands } = require('./utils/slashCommandsBundler');

const commands = bundleSlashCommands();

console.log(`📦 Found ${commands.length} top-level category command(s) to register`);

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
    try {
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );
        console.log(`✅ Successfully registered ${commands.length} top-level command(s) globally`);
    } catch (error) {
        console.error('❌ Failed to register commands:', error);
    }
})();

