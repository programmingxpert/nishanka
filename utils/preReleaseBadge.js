/* eslint-disable */
const Profile = require('../models/profileSchema');
const Achievement = require('../models/achievementSchema');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

async function checkAndPromptPreReleaseBadge(client, user, channelOrInteraction) {
    try {
        if (!user || user.bot || !channelOrInteraction) return;

        // Fetch or create profile
        let profile = await Profile.findOne({ userId: user.id });
        if (!profile) {
            profile = new Profile({ userId: user.id });
        }

        // If already prompted, do nothing
        if (profile.preReleasePrompted) return;

        // Set prompted flag immediately to avoid duplicate triggers
        profile.preReleasePrompted = true;
        await profile.save();

        // Build the claim embed & button
        const embed = new EmbedBuilder()
            .setColor('#7c6cf0')
            .setTitle('🚀 Special Pre-Release Badge Available!')
            .setDescription(`Welcome to Nishanka! As a pre-release user, you are eligible to claim the exclusive **Pre-Release Supporter** badge for your profile.\n\nClick the button below to claim it now! *This offer is one-time only. If you ignore this message, it will not appear again.*`)
            .setThumbnail(client.user.displayAvatarURL({ extension: 'png', size: 128 }))
            .setTimestamp();

        const claimBtn = new ButtonBuilder()
            .setCustomId(`claim_pre_release_${user.id}`)
            .setLabel('Claim Badge 🚀')
            .setStyle(ButtonStyle.Success);

        const row = new ActionRowBuilder().addComponents(claimBtn);

        // Send payload
        const payload = { content: `<@${user.id}>`, embeds: [embed], components: [row] };
        
        const channel = channelOrInteraction.channel;
        if (channel) {
            await channel.send(payload).catch(() => {});
        }
    } catch (err) {
        console.error('[PreReleaseBadge] Error prompting user:', err);
    }
}

module.exports = { checkAndPromptPreReleaseBadge };
