/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const MemberStats = require('../../models/MemberStats');

module.exports = {
    category: 'utility',
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('Check your current level, XP, and rank in this server.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user whose rank you want to check')
                .setRequired(false)
        ),

    async execute(interaction) {
        const target = interaction.options.getUser('user') || interaction.user;
        await showRankEmbed(interaction, target);
    },

    async executePrefix(message, args) {
        const target = message.mentions.users.first()
            || (args[0] ? await message.client.users.fetch(args[0].replace(/[<@!>]/g, '')).catch(() => null) : null)
            || message.author;
        
        await showRankEmbed(message, target, true);
    }
};

async function showRankEmbed(context, target, isPrefix = false) {
    if (target.bot) {
        const errStr = '❌ Bots do not have XP or levels!';
        if (isPrefix) return context.reply(errStr);
        return context.reply({ content: errStr, ephemeral: true });
    }

    const guildId = context.guild.id;

    try {
        const allStats = await MemberStats.find({ guildId }).sort({ xp: -1 }).lean();
        let stats = allStats.find(s => s.userId === target.id);
        const rank = stats ? allStats.indexOf(stats) + 1 : allStats.length + 1;

        if (!stats) {
            stats = new MemberStats({ guildId, userId: target.id });
            await stats.save();
        }

        const currentLevel = stats.level || 0;
        const totalXp = stats.xp || 0;
        const currentLevelBaseXp = 100 * currentLevel * currentLevel;
        const nextLevelXp = 100 * (currentLevel + 1) * (currentLevel + 1);
        const currentXpInLevel = totalXp - currentLevelBaseXp;
        const neededXpForNextLevel = nextLevelXp - currentLevelBaseXp;

        const percentage = Math.min(1, Math.max(0, currentXpInLevel / neededXpForNextLevel));
        const progress = Math.round(10 * percentage);
        const emptyProgress = 10 - progress;
        const progressBar = '🟩'.repeat(progress) + '⬜'.repeat(emptyProgress) + ` **${Math.round(percentage * 100)}%**`;

        const embed = new EmbedBuilder()
            .setColor(0x7c6cf0)
            .setTitle(`📊 Rank Card - ${target.username}`)
            .setDescription(`Here is the leveling progress for **${target.username}** in this server.`)
            .addFields(
                { name: '🆙 Level', value: `\`Level ${currentLevel}\``, inline: true },
                { name: '🏆 Server Rank', value: `\`#${rank}\``, inline: true },
                { name: '✨ Total XP', value: `\`${totalXp.toLocaleString()} XP\``, inline: true },
                { name: '📈 Level Progress', value: `${progressBar}\n*(Progress: \`${currentXpInLevel.toLocaleString()} / ${neededXpForNextLevel.toLocaleString()} XP\`)*` }
            )
            .setTimestamp()
            .setFooter({ text: `Requested by ${isPrefix ? context.author.tag : context.user.tag}` });

        if (isPrefix) {
            return context.reply({ embeds: [embed] });
        } else {
            return context.reply({ embeds: [embed] });
        }
    } catch (err) {
        console.error('Error in rank command:', err);
        const errStr = '❌ An error occurred while fetching the rank card.';
        if (isPrefix) return context.reply(errStr);
        return context.reply({ content: errStr, ephemeral: true });
    }
}
