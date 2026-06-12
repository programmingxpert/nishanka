const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Bauble = require('../../models/baubleSchema');
const PremiumUser = require('../../models/premiumUserSchema');
const Achievement = require('../../models/achievementSchema');
const UserRestriction = require('../../models/UserRestriction');
const Profile = require('../../models/profileSchema');
const { getUserPremiumTier } = require('../../utils/premiumPromo');

module.exports = {
    category: 'developer',
    devOnly: true,
    data: new SlashCommandBuilder()
        .setName('devprofile')
        .setDescription("View a user's absolute full database statistics (Developer Only).")
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to view the full profile of')
                .setRequired(true)),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user');
        await showDevProfile(interaction, targetUser);
    },

    async executePrefix(message, args) {
        const config = require('../../config.json');
        if (message.author.id !== config.devId) return;

        const targetUser = message.mentions.users.first() || message.client.users.cache.get(args[0]) || message.author;
        await showDevProfile(message, targetUser);
    }
};

async function showDevProfile(interactionOrMessage, targetUser) {
    const isSlash = !!interactionOrMessage.reply && !interactionOrMessage.author;
    const userId = targetUser.id;

    // Fetch all possible information
    const baubleData = await Bauble.findOne({ userId });
    const premiumData = await PremiumUser.findOne({ userId });
    const restrictionData = await UserRestriction.findOne({ userId });
    const achievements = await Achievement.find({ userId });

    const premiumTier = getUserPremiumTier(userId);

    const embed = new EmbedBuilder()
        .setTitle(`🛠️ Full Developer Profile: ${targetUser.username}`)
        .setDescription(`Database dump for user <@${userId}> (\`${userId}\`)`)
        .setColor(0x7c6cf0)
        .setThumbnail(targetUser.displayAvatarURL())
        .addFields(
            { 
                name: '👤 Identity & Premium', 
                value: `• **Premium Tier:** \`${premiumTier.toUpperCase()}\`\n` +
                       `• **Expires:** ${premiumData && premiumData.expiresAt ? `<t:${Math.floor(premiumData.expiresAt.getTime() / 1000)}:R>` : 'Never/None'}\n` +
                       `• **Activated:** ${premiumData && premiumData.activatedAt ? `<t:${Math.floor(premiumData.activatedAt.getTime() / 1000)}:f>` : 'N/A'}`,
                inline: false 
            },
            {
                name: '🪙 Economy & Streaks',
                value: `• **Baubles:** \`${(baubleData?.baubles ?? 0).toLocaleString()}\`\n` +
                       `• **Daily Streak:** \`${baubleData?.dailyStreak ?? 0}\` (Max: \`${baubleData?.dailyMaxStreak ?? 0}\`)\n` +
                       `• **Work Jobs:** \`${baubleData?.workJobsCompleted ?? 0}\`\n` +
                       `• **Expedition Status:** \`${baubleData?.activeExpedition?.status ?? 'idle'}\``,
                inline: true
            },
            {
                name: '🎮 Casino Stats',
                value: `• **Coinflip Wins/Played:** \`${baubleData?.coinflipWins ?? 0} / ${baubleData?.coinflipPlayed ?? 0}\` (Streak: \`${baubleData?.coinflipStreak ?? 0}\`)\n` +
                       `• **Blackjack Wins/Played:** \`${baubleData?.blackjackWins ?? 0} / ${baubleData?.blackjackPlayed ?? 0}\` (Streak: \`${baubleData?.blackjackStreak ?? 0}\`)\n` +
                       `• **Slots Played:** \`${baubleData?.slotsPlayed ?? 0}\` (Wins: \`${baubleData?.slotsWins ?? 0}\`, Jackpots: \`${baubleData?.slotsJackpots ?? 0}\`)\n` +
                       `• **Gamble Wins/Played:** \`${baubleData?.gambleWins ?? 0} / ${baubleData?.gamblePlayed ?? 0}\``,
                inline: true
            },
            {
                name: '🛡️ Safety & Restrictions',
                value: `• **Banned:** \`${restrictionData?.isBanned ? '🔴 Yes' : '🟢 No'}\`\n` +
                       `• **Ban Reason:** \`${restrictionData?.banReason || 'None'}\`\n` +
                       `• **Suspicion Score:** \`${restrictionData?.suspicionScore ?? 0}\`\n` +
                       `• **Warnings:** \`${restrictionData?.suspicionWarnings ?? 0}\` | **Macro Violations:** \`${restrictionData?.macroViolationsCount ?? 0}\``,
                inline: false
            },
            {
                name: '🎒 Inventory',
                value: baubleData?.inventory && baubleData.inventory.length > 0
                    ? baubleData.inventory.map(item => `• \`${item.itemId}\` x${item.quantity}`).join('\n')
                    : 'Inventory is empty.',
                inline: true
            },
            {
                name: '🏆 Achievements Unlocked',
                value: achievements && achievements.length > 0
                    ? achievements.map(a => `• \`${a.achievementId}\` (<t:${Math.floor(a.unlockedAt.getTime() / 1000)}:R>)`).join('\n')
                    : 'No achievements unlocked.',
                inline: true
            }
        )
        .setTimestamp();

    if (isSlash) {
        return interaction.reply({ embeds: [embed], ephemeral: true });
    } else {
        return interactionOrMessage.reply({ embeds: [embed] });
    }
}
