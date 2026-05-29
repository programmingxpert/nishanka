/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const MemberStats = require('../../models/MemberStats');

module.exports = {
    category: 'fun',
    cooldown: 3,
    data: new SlashCommandBuilder()
        .setName('rep')
        .setDescription('Give reputation to another member, or check reputation details.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to give reputation to')
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option.setName('leaderboard')
                .setDescription('Show the server reputation leaderboard instead')
                .setRequired(false)
        ),

    async execute(interaction) {
        const userOption = interaction.options.getUser('user');
        const showLeaderboard = interaction.options.getBoolean('leaderboard') || false;
        const guildId = interaction.guild.id;

        if (showLeaderboard) {
            return await displayLeaderboard(interaction, guildId, interaction.user);
        }

        if (!userOption) {
            // Show self stats
            return await showRepStats(interaction, guildId, interaction.user, interaction.user);
        }

        // Give rep to someone
        return await giveReputation(interaction, guildId, interaction.user, userOption);
    },

    async executePrefix(message, args) {
        const guildId = message.guild.id;
        const firstArg = args[0]?.toLowerCase();

        if (firstArg === 'leaderboard' || firstArg === 'lb') {
            return await displayLeaderboard(message, guildId, message.author, true);
        }

        const target = message.mentions.users.first()
            || (args[0] ? await message.client.users.fetch(args[0].replace(/[<@!>]/g, '')).catch(() => null) : null);

        if (!target) {
            // Check own reps
            return await showRepStats(message, guildId, message.author, message.author, true);
        }

        // Check if user is checking someone else's stats or giving rep.
        return await giveReputation(message, guildId, message.author, target, true);
    }
};

async function showRepStats(context, guildId, author, target, isPrefix = false) {
    const isSelf = author.id === target.id;
    try {
        let stats = await MemberStats.findOne({ guildId, userId: target.id });
        if (!stats) {
            stats = new MemberStats({ guildId, userId: target.id });
            await stats.save();
        }

        const rep = stats.reputation || 0;
        const lastGiven = stats.lastRepGivenAt;
        const now = Date.now();
        const cooldown = 24 * 60 * 60 * 1000; // 24 hours
        let cooldownText = '✅ Available to give rep now!';

        if (lastGiven && (now - new Date(lastGiven).getTime() < cooldown)) {
            const nextAvailable = new Date(lastGiven).getTime() + cooldown;
            const nextTimestamp = Math.floor(nextAvailable / 1000);
            cooldownText = `⏳ Available to give rep again <t:${nextTimestamp}:R>.`;
        }

        const embed = new EmbedBuilder()
            .setColor(0x7c6cf0)
            .setTitle(isSelf ? '🌟 Your Reputation Stats' : `🌟 ${target.username}'s Reputation Stats`)
            .setDescription(isSelf 
                ? `You have **${rep}** reputation in this server.\n\n${cooldownText}`
                : `**${target.username}** has **${rep}** reputation in this server.`)
            .setTimestamp()
            .setFooter({ text: `Requested by ${author.tag}` });

        if (isPrefix) {
            return context.reply({ embeds: [embed] });
        } else {
            return context.reply({ embeds: [embed], ephemeral: true });
        }
    } catch (err) {
        console.error(err);
        const errStr = '❌ Failed to fetch reputation stats.';
        if (isPrefix) return context.reply(errStr);
        return context.reply({ content: errStr, ephemeral: true });
    }
}

async function giveReputation(context, guildId, sender, target, isPrefix = false) {
    if (sender.id === target.id) {
        const errStr = '❌ You cannot give reputation to yourself!';
        if (isPrefix) return context.reply(errStr);
        return context.reply({ content: errStr, ephemeral: true });
    }

    if (target.bot) {
        const errStr = '❌ You cannot give reputation to bots!';
        if (isPrefix) return context.reply(errStr);
        return context.reply({ content: errStr, ephemeral: true });
    }

    try {
        let senderStats = await MemberStats.findOne({ guildId, userId: sender.id });
        if (!senderStats) {
            senderStats = new MemberStats({ guildId, userId: sender.id });
            await senderStats.save();
        }

        const now = Date.now();
        const cooldown = 24 * 60 * 60 * 1000; // 24 hours

        if (senderStats.lastRepGivenAt && (now - new Date(senderStats.lastRepGivenAt).getTime() < cooldown)) {
            const nextAvailable = new Date(senderStats.lastRepGivenAt).getTime() + cooldown;
            const nextTimestamp = Math.floor(nextAvailable / 1000);
            const errStr = `⏳ You can give reputation again <t:${nextTimestamp}:R>.`;
            if (isPrefix) return context.reply(errStr);
            return context.reply({ content: errStr, ephemeral: true });
        }

        // Increment target reputation
        let targetStats = await MemberStats.findOne({ guildId, userId: target.id });
        if (!targetStats) {
            targetStats = new MemberStats({ guildId, userId: target.id });
        }
        targetStats.reputation = (targetStats.reputation || 0) + 1;
        await targetStats.save();

        // Update sender cooldown
        senderStats.lastRepGivenAt = new Date();
        await senderStats.save();

        const embed = new EmbedBuilder()
            .setColor(0x4ade80)
            .setTitle('🌟 Reputation Commendation!')
            .setDescription(`🎉 **${sender.username}** has given a reputation point to **${target.username}**!\n\n**${target.username}** now has **${targetStats.reputation}** reputation! 🚀`)
            .setTimestamp()
            .setFooter({ text: 'Spread the positive vibes! ✨' });

        if (isPrefix) {
            return context.reply({ embeds: [embed] });
        } else {
            return context.reply({ embeds: [embed] });
        }
    } catch (err) {
        console.error(err);
        const errStr = '❌ Failed to give reputation.';
        if (isPrefix) return context.reply(errStr);
        return context.reply({ content: errStr, ephemeral: true });
    }
}

async function displayLeaderboard(context, guildId, author, isPrefix = false) {
    try {
        const guild = context.guild;
        const membersMap = await guild.members.fetch();
        const memberIds = Array.from(membersMap.keys());

        // Fetch top 10 members with the most reputation in this server
        const topReps = await MemberStats.find({ guildId, userId: { $in: memberIds }, reputation: { $gt: 0 } })
            .sort({ reputation: -1 })
            .limit(10)
            .exec();

        if (!topReps || topReps.length === 0) {
            const emptyStr = '❌ No users in this server have any reputation points yet!';
            if (isPrefix) return context.reply(emptyStr);
            return context.reply({ content: emptyStr, ephemeral: true });
        }

        const leaderboardString = topReps.map((entry, index) => {
            const member = membersMap.get(entry.userId);
            const nameStr = member 
                ? `**${member.user.username}** (${member.displayName})` 
                : `**Unknown User** (${entry.userId})`;
            return `${index + 1}. ${nameStr}: **${entry.reputation}** rep`;
        }).join('\n');

        const embed = new EmbedBuilder()
            .setColor(0x7c6cf0)
            .setTitle('🏆 Server Reputation Leaderboard')
            .setDescription(leaderboardString)
            .setTimestamp()
            .setFooter({ 
                text: `Requested by ${author.tag}`, 
                iconURL: context.member?.displayAvatarURL({ dynamic: true }) || author.displayAvatarURL({ dynamic: true }) 
            });

        if (isPrefix) {
            return context.channel.send({ embeds: [embed] });
        } else {
            return context.reply({ embeds: [embed] });
        }
    } catch (error) {
        console.error('Error in rep leaderboard:', error);
        const errStr = '❌ An error occurred while fetching the leaderboard.';
        if (isPrefix) return context.reply(errStr);
        return context.reply({ content: errStr, ephemeral: true });
    }
}
