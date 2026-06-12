const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const PremiumUser = require('../../models/premiumUserSchema');
const { loadPremiumUsers } = require('../../utils/premiumPromo');
const ms = require('ms');

module.exports = {
    category: 'developer',
    devOnly: true,
    data: new SlashCommandBuilder()
        .setName('setpremium')
        .setDescription("Set or modify a user's premium status (Developer Only).")
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to modify')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('tier')
                .setDescription('The premium tier')
                .setRequired(true)
                .addChoices(
                    { name: 'Lite ($1.99/mo - 1.5x APU limits, Profile perks)', value: 'lite' },
                    { name: 'Pro ($4.99/mo - 3x APU limits, 24/7 music, Profile badges)', value: 'pro' },
                    { name: 'Network ($9.99/mo - Server-wide perks, Multi-server)', value: 'network' },
                    { name: 'Lifetime (Permanent Pro perks, Never expires)', value: 'lifetime' },
                    { name: 'Free (Remove Premium status)', value: 'free' }
                ))
        .addStringOption(option =>
            option.setName('duration')
                .setDescription('Duration of premium (e.g. 30d, 1y, 7d). Default: Permanent.')
                .setRequired(false)),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user');
        const tier = interaction.options.getString('tier');
        const duration = interaction.options.getString('duration');

        await handleSetPremium(interaction, targetUser, tier, duration);
    },

    async executePrefix(message, args) {
        const config = require('../../config.json');
        if (message.author.id !== config.devId) return;

        const targetUser = message.mentions.users.first() || message.client.users.cache.get(args[0]);
        if (!targetUser) {
            return message.reply('❌ Please specify a user (mention or ID).');
        }

        const tier = args[1]?.toLowerCase();
        if (!tier || !['lite', 'pro', 'network', 'lifetime', 'free'].includes(tier)) {
            return message.reply('❌ Invalid tier. Choose from: `lite`, `pro`, `network`, `lifetime`, `free`.');
        }

        const duration = args[2]; // e.g. 30d
        await handleSetPremium(message, targetUser, tier, duration);
    }
};

async function handleSetPremium(interactionOrMessage, targetUser, tier, durationStr) {
    const isSlash = !!interactionOrMessage.reply && !interactionOrMessage.author;
    const userId = targetUser.id;

    if (tier === 'free') {
        // Remove premium from database
        await PremiumUser.findOneAndDelete({ userId });
        
        // Reload premium cache in memory
        await loadPremiumUsers();

        const embed = new EmbedBuilder()
            .setTitle('🔴 Premium Removed')
            .setDescription(`Successfully removed all premium status from <@${userId}>.`)
            .setColor(0xff3c38)
            .setTimestamp();

        return isSlash
            ? interactionOrMessage.reply({ embeds: [embed], ephemeral: true })
            : interactionOrMessage.reply({ embeds: [embed] });
    }

    // Parse duration
    let expiresAt = null;
    if (durationStr && tier !== 'lifetime') {
        try {
            const timeMs = ms(durationStr);
            if (timeMs) {
                expiresAt = new Date(Date.now() + timeMs);
            } else {
                const replyText = '❌ Invalid duration format. Use formats like `30d`, `1y`, `7d`, `12h`.';
                return isSlash
                    ? interactionOrMessage.reply({ content: replyText, ephemeral: true })
                    : interactionOrMessage.reply(replyText);
            }
        } catch (err) {
            const replyText = '❌ Error parsing duration.';
            return isSlash
                ? interactionOrMessage.reply({ content: replyText, ephemeral: true })
                : interactionOrMessage.reply(replyText);
        }
    }

    // Update or insert premium
    await PremiumUser.findOneAndUpdate(
        { userId },
        {
            tier,
            expiresAt,
            activatedAt: new Date()
        },
        { upsert: true, new: true }
    );

    // Reload premium cache in memory
    await loadPremiumUsers();

    const expiresText = expiresAt ? `<t:${Math.floor(expiresAt.getTime() / 1000)}:f> (<t:${Math.floor(expiresAt.getTime() / 1000)}:R>)` : 'Never (Lifetime)';
    const embed = new EmbedBuilder()
        .setTitle('🎉 Premium Status Updated')
        .setDescription(`Successfully granted premium status to <@${userId}>.`)
        .setColor(0xf1c40f)
        .addFields(
            { name: 'User', value: `${targetUser} (${userId})`, inline: true },
            { name: 'Active Tier', value: `**${tier.toUpperCase()}**`, inline: true },
            { name: 'Expires', value: expiresText, inline: false }
        )
        .setTimestamp();

    return isSlash
        ? interactionOrMessage.reply({ embeds: [embed], ephemeral: true })
        : interactionOrMessage.reply({ embeds: [embed] });
}
