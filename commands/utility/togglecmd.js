/* eslint-disable */
const { SlashCommandBuilder } = require('discord.js');
const DisabledCommand = require('../../models/disabledCommandSchema');

module.exports = {
    category: 'utility',
    data: new SlashCommandBuilder()
        .setName('togglecmd')
        .setDescription('[ADMIN ONLY] Disable or enable a command globally.')
        .addStringOption(option =>
            option.setName('command')
                .setDescription('The command to toggle')
                .setRequired(true)
                .setAutocomplete(true)
        ),
    
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        
        // Get all loaded commands
        const commands = Array.from(interaction.client.commands.values());
        // Map to just names, excluding togglecmd itself
        let choices = commands
            .map(cmd => cmd.data.name)
            .filter(name => name !== 'togglecmd');
            
        // Filter by user input
        const filtered = choices.filter(choice => choice.toLowerCase().includes(focusedValue)).slice(0, 25);
        
        // Add emoji indicators
        const displayChoices = filtered.map(choice => {
            const isDisabled = interaction.client.disabledCommands && interaction.client.disabledCommands.has(choice);
            return {
                name: `${isDisabled ? '🔴 (Disabled)' : '🟢 (Enabled)'} ${choice}`,
                value: choice
            };
        });

        await interaction.respond(displayChoices);
    },

    async execute(interaction) {
        const adminId = "805007574193405952"; // Hardcoded admin ID
        
        if (interaction.user.id !== adminId) {
            return interaction.reply({ content: '❌ You are not authorized to use this command.', ephemeral: true });
        }

        const cmdName = interaction.options.getString('command').toLowerCase();
        
        // Check if command exists
        if (!interaction.client.commands.has(cmdName)) {
            return interaction.reply({ content: `❌ Command \`${cmdName}\` does not exist.`, ephemeral: true });
        }

        if (cmdName === 'togglecmd') {
            return interaction.reply({ content: `❌ You cannot disable the toggle command itself!`, ephemeral: true });
        }

        // Initialize set if somehow not there
        if (!interaction.client.disabledCommands) {
            interaction.client.disabledCommands = new Set();
        }

        const isCurrentlyDisabled = interaction.client.disabledCommands.has(cmdName);

        try {
            if (isCurrentlyDisabled) {
                // Enable it
                await DisabledCommand.findOneAndDelete({ commandName: cmdName });
                interaction.client.disabledCommands.delete(cmdName);
                await interaction.reply({ content: `✅ The \`${cmdName}\` command has been **enabled**. It will now appear in help menus and execute normally.`, ephemeral: true });
            } else {
                // Disable it
                await DisabledCommand.create({ commandName: cmdName });
                interaction.client.disabledCommands.add(cmdName);
                await interaction.reply({ content: `🚫 The \`${cmdName}\` command has been **disabled**. It is now hidden and cannot be used.`, ephemeral: true });
            }
        } catch (error) {
            console.error('Error toggling command:', error);
            await interaction.reply({ content: '❌ A database error occurred while toggling the command.', ephemeral: true });
        }
    },
    
    async executePrefix(message, args) {
        const adminId = "805007574193405952"; 
        
        if (message.author.id !== adminId) {
            return message.reply('❌ You are not authorized to use this command.');
        }

        const cmdName = args[0]?.toLowerCase();
        if (!cmdName) {
            return message.reply('⚠️ Please provide a command name to toggle. Usage: `-togglecmd <command>`');
        }

        if (!message.client.commands.has(cmdName)) {
            return message.reply(`❌ Command \`${cmdName}\` does not exist.`);
        }

        if (cmdName === 'togglecmd') {
            return message.reply(`❌ You cannot disable the toggle command itself!`);
        }

        if (!message.client.disabledCommands) {
            message.client.disabledCommands = new Set();
        }

        const isCurrentlyDisabled = message.client.disabledCommands.has(cmdName);

        try {
            if (isCurrentlyDisabled) {
                await DisabledCommand.findOneAndDelete({ commandName: cmdName });
                message.client.disabledCommands.delete(cmdName);
                await message.reply(`✅ The \`${cmdName}\` command has been **enabled**.`);
            } else {
                await DisabledCommand.create({ commandName: cmdName });
                message.client.disabledCommands.add(cmdName);
                await message.reply(`🚫 The \`${cmdName}\` command has been **disabled**.`);
            }
        } catch (error) {
            console.error('Error toggling command:', error);
            await message.reply('❌ A database error occurred while toggling the command.');
        }
    }
};
