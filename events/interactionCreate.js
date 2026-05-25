/* eslint-disable */
const { Collection, MessageFlags } = require('discord.js');

module.exports = {
    name: 'interactionCreate',

    async execute(interaction, client) {
        // Handle autocomplete interactions
        if (interaction.isAutocomplete()) {
            const command = client.commands.get(interaction.commandName);
            if (command && typeof command.autocomplete === 'function') {
                try {
                    await command.autocomplete(interaction);
                } catch (error) {
                    console.error(`[interactionCreate] Error in autocomplete for /${interaction.commandName}:`, error);
                }
            }
            return;
        }

        // Only handle slash/chat-input commands
        if (!interaction.isChatInputCommand()) return;

        const command = client.commands.get(interaction.commandName);
        if (!command) {
            return interaction.reply({ content: '❌ Unknown command.', ephemeral: true });
        }

        // --- Cooldown logic ---
        const { cooldowns } = client;
        if (!cooldowns.has(command.data.name)) {
            cooldowns.set(command.data.name, new Collection());
        }

        const now         = Date.now();
        const timestamps  = cooldowns.get(command.data.name);
        let cooldownMs  = (command.cooldown ?? 3) * 1000;

        if (command.data.name === 'work' || command.data.name === 'scavenge') {
            const Bauble = require('../models/baubleSchema');
            const baubleData = await Bauble.findOne({ userId: interaction.user.id }).lean();
            if (baubleData && baubleData.coffeeExpiresAt && now < new Date(baubleData.coffeeExpiresAt).getTime()) {
                cooldownMs /= 2;
            }
        }

        if (timestamps.has(interaction.user.id)) {
            const expiry = timestamps.get(interaction.user.id) + cooldownMs;
            if (now < expiry) {
                const timestampId = Math.floor(expiry / 1000);
                return interaction.reply({
                    content: `⏳ Please wait, you can use \`/${command.data.name}\` again <t:${timestampId}:R>.`,
                    flags: MessageFlags.Ephemeral,
                });
            }
        }

        timestamps.set(interaction.user.id, now);
        setTimeout(() => timestamps.delete(interaction.user.id), cooldownMs);

        // --- Execute command ---
        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(`[interactionCreate] Error in /${interaction.commandName}:`, error);
            const msg = { content: '❌ An error occurred while executing that command.', flags: MessageFlags.Ephemeral };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(msg).catch(() => {});
            } else {
                await interaction.reply(msg).catch(() => {});
            }
        }
    },
};
