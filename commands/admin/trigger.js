const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const Trigger = require('../../models/triggerSchema');
const config = require('../../config.json');

module.exports = {
    category: 'admin',
    data: {
        name: 'trigger',
        description: 'Manage simple text triggers for the server.',
        options: [] // Prefix command only for now
    },
    aliases: ['triggers'],
    
    async executePrefix(message, args, client) {
        if (message.author.id !== config.devId) {
            return message.reply('❌ This command is restricted to the bot developer only.');
        }

        const subCommand = args[0]?.toLowerCase();

        if (subCommand === 'add') {
            const word = args[1]?.toLowerCase();
            const textResponse = args.slice(2).join(' ');

            if (!word || !textResponse) {
                return message.reply('Usage: `-trigger add <word> <response text...>`\n*For advanced embed triggers, please use the Dashboard!*');
            }

            try {
                await Trigger.findOneAndUpdate(
                    { guildId: message.guild.id, triggerWord: word },
                    { matchType: 'exact', response: { text: textResponse, embed: {} } },
                    { upsert: true, new: true }
                );

                if (client.triggerCache) client.triggerCache.delete(message.guild.id);
                return message.reply(`✅ Trigger \`${word}\` has been created successfully!`);
            } catch (err) {
                console.error(err);
                return message.reply('❌ Failed to save the trigger.');
            }
        }

        if (subCommand === 'remove' || subCommand === 'delete') {
            const word = args[1]?.toLowerCase();
            if (!word) {
                return message.reply('Usage: `-trigger remove <word>`');
            }

            try {
                const deleted = await Trigger.findOneAndDelete({ guildId: message.guild.id, triggerWord: word });
                if (deleted) {
                    if (client.triggerCache) client.triggerCache.delete(message.guild.id);
                    return message.reply(`🗑️ Trigger \`${word}\` has been deleted!`);
                } else {
                    return message.reply(`⚠️ No trigger found for \`${word}\`.`);
                }
            } catch (err) {
                console.error(err);
                return message.reply('❌ Failed to delete the trigger.');
            }
        }

        if (subCommand === 'list') {
            try {
                const triggers = await Trigger.find({ guildId: message.guild.id });
                if (!triggers || triggers.length === 0) {
                    return message.reply('No custom triggers found for this server.');
                }

                const list = triggers.map(t => `• **${t.triggerWord}** (${t.matchType})`).join('\n');
                
                const embed = new EmbedBuilder()
                    .setTitle('⚡ Server Triggers')
                    .setDescription(list)
                    .setColor('#5865F2')
                    .setFooter({ text: 'Manage advanced triggers on the Dashboard' });

                return message.reply({ embeds: [embed] });
            } catch (err) {
                console.error(err);
                return message.reply('❌ Failed to fetch triggers.');
            }
        }

        // Help menu
        const helpEmbed = new EmbedBuilder()
            .setTitle('⚡ Trigger Management')
            .setColor('#5865F2')
            .setDescription(`Use this command to manage simple text triggers. For advanced embed triggers, use the [Dashboard](${process.env.FRONTEND_URL || 'http://localhost:5173'})!`)
            .addFields(
                { name: 'Add Trigger', value: '`-trigger add <word> <response...>`\nCreates an exact match text trigger.' },
                { name: 'Remove Trigger', value: '`-trigger remove <word>`\nDeletes a trigger.' },
                { name: 'List Triggers', value: '`-trigger list`\nShows all active triggers.' }
            );

        return message.reply({ embeds: [helpEmbed] });
    }
};
