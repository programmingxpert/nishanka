const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUserPremiumTier } = require('../../utils/premiumPromo');
const PremiumUser = require('../../models/premiumUserSchema');

module.exports = {
    category: 'developer',
    devOnly: true,
    data: new SlashCommandBuilder()
        .setName('devpremium')
        .setDescription('View all premium users or check a user (Developer Only).')
        .addStringOption(option =>
            option.setName('action')
                .setDescription('The action to take')
                .setRequired(true)
                .addChoices(
                    { name: '📋 List Premium Users', value: 'list' },
                    { name: '🔍 Check User', value: 'check' }
                ))
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to check (required for Check action)')
                .setRequired(false)),

    async execute(interaction) {
        const action = interaction.options.getString('action');
        const user = interaction.options.getUser('user');

        if (action === 'check') {
            if (!user) {
                return interaction.reply({ content: '❌ You must specify a user to check.', ephemeral: true });
            }
            const tier = getUserPremiumTier(user.id);
            const dbPremium = await PremiumUser.findOne({ userId: user.id });
            const expires = dbPremium && dbPremium.expiresAt ? `<t:${Math.floor(dbPremium.expiresAt.getTime() / 1000)}:R>` : 'Never (Lifetime)';
            
            const embed = new EmbedBuilder()
                .setTitle(`Premium Check: ${user.username}`)
                .setColor(tier !== 'free' ? 0xf1c40f : 0x7c6cf0)
                .addFields(
                    { name: 'User', value: `${user} (${user.id})`, inline: true },
                    { name: 'Premium Tier', value: `**${tier.toUpperCase()}**`, inline: true },
                    { name: 'Expires', value: expires, inline: true }
                )
                .setTimestamp();
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // List action
        const dbUsers = await PremiumUser.find({});
        const envLite = (process.env.PREMIUM_USERS_LITE || "").split(",").map(id => id.trim()).filter(Boolean);
        const envPro = (process.env.PREMIUM_USERS_PRO || "").split(",").map(id => id.trim()).filter(Boolean);
        const envNetwork = (process.env.PREMIUM_USERS_NETWORK || "").split(",").map(id => id.trim()).filter(Boolean);
        const envLifetime = (process.env.PREMIUM_USERS_LIFETIME || "").split(",").map(id => id.trim()).filter(Boolean);

        const config = require('../../config.json');

        const list = [];
        dbUsers.forEach(u => {
            list.push(`• <@${u.userId}> (\`${u.userId}\`) - **${u.tier.toUpperCase()}** (DB)`);
        });
        envLite.forEach(id => list.push(`• <@${id}> (\`${id}\`) - **LITE** (ENV)`));
        envPro.forEach(id => list.push(`• <@${id}> (\`${id}\`) - **PRO** (ENV)`));
        envNetwork.forEach(id => list.push(`• <@${id}> (\`${id}\`) - **NETWORK** (ENV)`));
        envLifetime.forEach(id => list.push(`• <@${id}> (\`${id}\`) - **LIFETIME** (ENV)`));

        const hasDev = list.some(item => item.includes(config.devId));
        if (!hasDev) {
            list.unshift(`• <@${config.devId}> (\`${config.devId}\`) - **LIFETIME** (DEV CONFIG)`);
        }

        const embed = new EmbedBuilder()
            .setTitle('📋 Premium Users List')
            .setDescription(list.length > 0 ? list.join('\n') : 'No premium users found.')
            .setColor(0xf1c40f)
            .setTimestamp();

        return interaction.reply({ embeds: [embed], ephemeral: true });
    },

    async executePrefix(message, args) {
        const config = require('../../config.json');
        if (message.author.id !== config.devId) return;

        const action = args[0]?.toLowerCase();
        
        if (action === 'check') {
            const targetUser = message.mentions.users.first() || message.client.users.cache.get(args[1]) || message.author;
            const tier = getUserPremiumTier(targetUser.id);
            const dbPremium = await PremiumUser.findOne({ userId: targetUser.id });
            const expires = dbPremium && dbPremium.expiresAt ? `<t:${Math.floor(dbPremium.expiresAt.getTime() / 1000)}:R>` : 'Never (Lifetime)';

            const embed = new EmbedBuilder()
                .setTitle(`Premium Check: ${targetUser.username}`)
                .setColor(tier !== 'free' ? 0xf1c40f : 0x7c6cf0)
                .addFields(
                    { name: 'User', value: `${targetUser} (${targetUser.id})`, inline: true },
                    { name: 'Premium Tier', value: `**${tier.toUpperCase()}**`, inline: true },
                    { name: 'Expires', value: expires, inline: true }
                )
                .setTimestamp();
            return message.reply({ embeds: [embed] });
        }

        // List is default
        const dbUsers = await PremiumUser.find({});
        const envLite = (process.env.PREMIUM_USERS_LITE || "").split(",").map(id => id.trim()).filter(Boolean);
        const envPro = (process.env.PREMIUM_USERS_PRO || "").split(",").map(id => id.trim()).filter(Boolean);
        const envNetwork = (process.env.PREMIUM_USERS_NETWORK || "").split(",").map(id => id.trim()).filter(Boolean);
        const envLifetime = (process.env.PREMIUM_USERS_LIFETIME || "").split(",").map(id => id.trim()).filter(Boolean);

        const list = [];
        dbUsers.forEach(u => {
            list.push(`• <@${u.userId}> (\`${u.userId}\`) - **${u.tier.toUpperCase()}** (DB)`);
        });
        envLite.forEach(id => list.push(`• <@${id}> (\`${id}\`) - **LITE** (ENV)`));
        envPro.forEach(id => list.push(`• <@${id}> (\`${id}\`) - **PRO** (ENV)`));
        envNetwork.forEach(id => list.push(`• <@${id}> (\`${id}\`) - **NETWORK** (ENV)`));
        envLifetime.forEach(id => list.push(`• <@${id}> (\`${id}\`) - **LIFETIME** (ENV)`));

        const hasDev = list.some(item => item.includes(config.devId));
        if (!hasDev) {
            list.unshift(`• <@${config.devId}> (\`${config.devId}\`) - **LIFETIME** (DEV CONFIG)`);
        }

        const embed = new EmbedBuilder()
            .setTitle('📋 Premium Users List')
            .setDescription(list.length > 0 ? list.join('\n') : 'No premium users found.')
            .setColor(0xf1c40f)
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }
};
