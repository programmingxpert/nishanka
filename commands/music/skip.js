/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const skipVotes = new Map(); // key: guildId, value: Set of user IDs who voted
const GuildSettings = require('../../models/guildSettingsSchema');

module.exports = {
    category: 'music',
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skips the currently playing song (votes if multiple users in VC).'),

    async execute(interaction) {
        await this.skipSong(interaction, interaction.client, interaction.guild.id, true);
    },

    async executePrefix(message) {
        await this.skipSong(message, message.client, message.guild.id, false);
    },

    async checkMember(member) {
        // Check if the member is a bot
        if (member.user.bot) return false;

        // Check if the member is deafened (either server or self)
        if (member.voice.deaf || member.voice.serverDeaf) return false;

        // Check if the member is muted (either server or self)
        if (member.voice.mute || member.voice.serverMute) return false;

        // If none of the above conditions are met, consider the member valid
        return true;
    },

    async skipSong(interactionOrMessage, client, guildId, isSlash) {
        const player = client.activePlayers.get(guildId);

        const user = isSlash ? interactionOrMessage.user : interactionOrMessage.author;
        const member = isSlash ? interactionOrMessage.member : interactionOrMessage.member;
        const channel = member?.voice?.channel;

        if (!channel) {
            const msg = '❌ You must be in a voice channel.';
            return isSlash
                ? interactionOrMessage.reply({ content: msg, ephemeral: true })
                : interactionOrMessage.reply(msg);
        }

        const settings = await GuildSettings.findOne({ guildId });
        if (settings?.music?.djRoleId) {
            if (!member.roles.cache.has(settings.music.djRoleId)) {
                const msg = '❌ Only members with the DJ role can use this command.';
                return isSlash
                    ? interactionOrMessage.reply({ content: msg, ephemeral: true })
                    : interactionOrMessage.reply(msg);
            }
        }

        if (!player) {
            const msg = '❌ Not playing in this server.';
            return isSlash
                ? interactionOrMessage.reply({ content: msg, ephemeral: true })
                : interactionOrMessage.reply(msg);
        }

        if (!player.playing) {
            const msg = '❌ Nothing is currently playing.';
            return isSlash
                ? interactionOrMessage.reply({ content: msg, ephemeral: true })
                : interactionOrMessage.reply(msg);
        }

        // const usersInVC = channel.members.filter(m => !m.user.bot);
        const usersInVC = channel.members.filter(member => this.checkMember(member));
        const requiredVotes = Math.ceil(usersInVC.size / 2);

        // Single user? Skip instantly
        if (usersInVC.size <= 1) {
            player.stop();
            skipVotes.delete(guildId);

            const embed = new EmbedBuilder()
                .setColor('#FF7A00')
                .setDescription('⏩ Skipped');

            return isSlash
                ? interactionOrMessage.reply({ embeds: [embed] })
                : interactionOrMessage.reply({ embeds: [embed] });
        }

        // Handle voting
        if (!skipVotes.has(guildId)) skipVotes.set(guildId, new Set());
        const userVotes = skipVotes.get(guildId);

        if (userVotes.has(user.id)) {
            const msg = `⚠️ You have already voted to skip this song. (${userVotes.size}/${requiredVotes} votes)`;
            return isSlash
                ? interactionOrMessage.reply({ content: msg, ephemeral: true })
                : interactionOrMessage.reply(msg);
        }

        userVotes.add(user.id);

        if (userVotes.size >= requiredVotes) {
            player.stop();
            skipVotes.delete(guildId);

            const embed = new EmbedBuilder()
                .setColor('#FF7A00')
                .setDescription(`⏩ Skipped the song with ${userVotes.size}/${requiredVotes} votes.`);

            return isSlash
                ? interactionOrMessage.reply({ embeds: [embed] })
                : interactionOrMessage.reply({ embeds: [embed] });
        } else {
            const msg = `🗳️ ${user.username} voted to skip. **(${userVotes.size}/${requiredVotes} votes)**`;
            return isSlash
                ? interactionOrMessage.reply({ content: msg })
                : interactionOrMessage.reply(msg);
        }
    }
};