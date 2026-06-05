const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const UserRestriction = require('../../models/UserRestriction');
const config = require('../../config.json');

module.exports = {
    category: 'developer',
    devOnly: true,
    data: new SlashCommandBuilder()
        .setName('devban')
        .setDescription('Manage player bans and anti-exploit metrics (Developer Only).')
        .addSubcommand(sub => sub
            .setName('ban')
            .setDescription('Globally ban a player from all bot commands')
            .addStringOption(opt => opt.setName('userid').setDescription('The Discord User ID to ban').setRequired(true))
            .addStringOption(opt => opt.setName('reason').setDescription('Reason for the global ban').setRequired(false)))
        .addSubcommand(sub => sub
            .setName('unban')
            .setDescription('Globally unban a player')
            .addStringOption(opt => opt.setName('userid').setDescription('The Discord User ID to unban').setRequired(true)))
        .addSubcommand(sub => sub
            .setName('list')
            .setDescription('List globally banned and suspicious/flagged users'))
        .addSubcommand(sub => sub
            .setName('clear')
            .setDescription('Clear suspicion metrics and soft-ban lockout for a player')
            .addStringOption(opt => opt.setName('userid').setDescription('The Discord User ID to clear').setRequired(true))),

    async execute(interaction) {
        if (interaction.user.id !== config.devId) {
            return interaction.reply({ content: '❌ You are not authorized to use this command.', ephemeral: true });
        }

        const sub = interaction.options.getSubcommand();
        const userId = interaction.options.getString('userid');

        if (sub === 'ban') {
            const reason = interaction.options.getString('reason') || 'Violation of bot terms.';
            let restriction = await UserRestriction.findOne({ userId });
            if (!restriction) {
                restriction = new UserRestriction({ userId });
            }

            restriction.isBanned = true;
            restriction.banReason = reason;
            restriction.bannedAt = new Date();
            restriction.bannedBy = interaction.user.id;
            await restriction.save();

            return interaction.reply({ content: `✅ User <@${userId}> (${userId}) has been **globally banned**. Reason: *${reason}*`, ephemeral: true });
        }

        if (sub === 'unban') {
            let restriction = await UserRestriction.findOne({ userId });
            if (!restriction || !restriction.isBanned) {
                return interaction.reply({ content: '❌ User is not globally banned.', ephemeral: true });
            }

            restriction.isBanned = false;
            restriction.banReason = null;
            restriction.bannedAt = null;
            restriction.bannedBy = null;
            await restriction.save();

            return interaction.reply({ content: `✅ User <@${userId}> (${userId}) has been **globally unbanned**.`, ephemeral: true });
        }

        if (sub === 'clear') {
            let restriction = await UserRestriction.findOne({ userId });
            if (!restriction) {
                return interaction.reply({ content: '❌ User has no restrictions or flags.', ephemeral: true });
            }

            restriction.suspicionScore = 0;
            restriction.suspicionWarnings = 0;
            restriction.isSoftBanned = false;
            restriction.lockoutExpiresAt = null;
            await restriction.save();

            return interaction.reply({ content: `✅ Cleared suspicion score, warnings, and soft-ban for <@${userId}> (${userId}).`, ephemeral: true });
        }

        if (sub === 'list') {
            const bannedList = await UserRestriction.find({ isBanned: true }).lean();
            const flaggedList = await UserRestriction.find({
                $or: [
                    { suspicionScore: { $gt: 0 } },
                    { suspicionWarnings: { $gt: 0 } },
                    { isSoftBanned: true }
                ],
                isBanned: false
            }).lean();

            const embed = new EmbedBuilder()
                .setColor(0x2c3e50)
                .setTitle('⚖️ Bot Bans & Suspicion Database')
                .addFields(
                    {
                        name: '🚫 Globally Banned Users',
                        value: bannedList.length > 0 
                            ? bannedList.map(u => `• <@${u.userId}> (${u.userId}) - *${u.banReason || 'No reason'}*`).join('\n').substring(0, 1024)
                            : 'None'
                    },
                    {
                        name: '⚠️ Flagged / Soft-Banned Users',
                        value: flaggedList.length > 0
                            ? flaggedList.map(u => `• <@${u.userId}> (${u.userId}): Score **${u.suspicionScore}**/100, Warns **${u.suspicionWarnings}**${u.isSoftBanned ? ` (Soft-Banned until <t:${Math.floor(new Date(u.lockoutExpiresAt).getTime() / 1000)}:R>)` : ''}`).join('\n').substring(0, 1024)
                            : 'None'
                    }
                )
                .setTimestamp();

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
    },

    async executePrefix(message, args) {
        if (message.author.id !== config.devId) {
            return message.reply('❌ You are not authorized to use this command.');
        }

        const sub = args[0]?.toLowerCase();
        if (!sub) {
            return message.reply('❌ Usage: `-devban <ban|unban|clear|list> [userId] [reason]`');
        }

        if (sub === 'list') {
            const bannedList = await UserRestriction.find({ isBanned: true }).lean();
            const flaggedList = await UserRestriction.find({
                $or: [
                    { suspicionScore: { $gt: 0 } },
                    { suspicionWarnings: { $gt: 0 } },
                    { isSoftBanned: true }
                ],
                isBanned: false
            }).lean();

            let desc = `**🚫 Globally Banned Users:**\n`;
            if (bannedList.length > 0) {
                desc += bannedList.map(u => `• <@${u.userId}> (${u.userId}) - *${u.banReason || 'No reason'}*`).join('\n') + '\n\n';
            } else {
                desc += '*None*\n\n';
            }

            desc += `**⚠️ Flagged / Soft-Banned Users:**\n`;
            if (flaggedList.length > 0) {
                desc += flaggedList.map(u => `• <@${u.userId}> (${u.userId}): Score **${u.suspicionScore}**, Warns **${u.suspicionWarnings}**${u.isSoftBanned ? ` (Soft-Banned until <t:${Math.floor(new Date(u.lockoutExpiresAt).getTime() / 1000)}:R>)` : ''}`).join('\n') + '\n';
            } else {
                desc += '*None*\n';
            }

            const embed = new EmbedBuilder()
                .setColor(0x2c3e50)
                .setTitle('⚖️ Bot Bans & Suspicion Database')
                .setDescription(desc.substring(0, 4000))
                .setTimestamp();

            return message.reply({ embeds: [embed] });
        }

        const userId = args[1];
        if (!userId) return message.reply('❌ Please specify a user ID.');

        if (sub === 'ban') {
            const reason = args.slice(2).join(' ') || 'Violation of bot terms.';
            let restriction = await UserRestriction.findOne({ userId });
            if (!restriction) {
                restriction = new UserRestriction({ userId });
            }

            restriction.isBanned = true;
            restriction.banReason = reason;
            restriction.bannedAt = new Date();
            restriction.bannedBy = message.author.id;
            await restriction.save();

            return message.reply(`✅ User <@${userId}> (${userId}) has been **globally banned**. Reason: *${reason}*`);
        }

        if (sub === 'unban') {
            let restriction = await UserRestriction.findOne({ userId });
            if (!restriction || !restriction.isBanned) {
                return message.reply('❌ User is not globally banned.');
            }

            restriction.isBanned = false;
            restriction.banReason = null;
            restriction.bannedAt = null;
            restriction.bannedBy = null;
            await restriction.save();

            return message.reply(`✅ User <@${userId}> (${userId}) has been **globally unbanned**.`);
        }

        if (sub === 'clear') {
            let restriction = await UserRestriction.findOne({ userId });
            if (!restriction) {
                return message.reply('❌ User has no restrictions or flags.');
            }

            restriction.suspicionScore = 0;
            restriction.suspicionWarnings = 0;
            restriction.isSoftBanned = false;
            restriction.lockoutExpiresAt = null;
            await restriction.save();

            return message.reply(`✅ Cleared suspicion score, warnings, and soft-ban for <@${userId}> (${userId}).`);
        }

        return message.reply('❌ Unknown subcommand. Options: `ban`, `unban`, `clear`, `list`');
    }
};
