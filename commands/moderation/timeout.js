/* eslint-disable */
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const ms = require('ms');

module.exports = {
    category: 'moderation',
    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Temporarily time out a user from interacting in the server.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to timeout')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('duration')
                .setDescription('Duration (e.g., 1m, 10m, 1h, 1d)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for timeout')
                .setRequired(false)),

    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        const duration = interaction.options.getString('duration');
        const reason = interaction.options.getString('reason') || 'No reason provided.';

        if (!member) return interaction.reply({ content: '❌ Could not find that user.', ephemeral: true });
        if (user.id === interaction.guild.ownerId) return interaction.reply({content: "🚫 I cannot timeout the server owner.", ephemeral: true});
        if (!member.moderatable) return interaction.reply({ content: '🚫 I cannot timeout that user.', ephemeral: true });

        const msDuration = ms(duration);

        if (!msDuration || msDuration < 5000 || msDuration > 2.419e9) {
            return interaction.reply({ content: '⏰ Invalid duration. Must be between 5s and 28d.', ephemeral: true });
        }

        // Try to DM the user
        try {
            await user.send(`⏱️ You have been **timed out** in **${interaction.guild.name}** for ${ms(msDuration, { long: true })}.\n**Reason:** ${reason}`);
        } catch (err) {
            console.log(`⚠️ Could not DM ${user.tag}.`);
        }

        try {
            await member.timeout(msDuration, reason);
        } catch (error) {
            console.error("Timeout failed:", error);
            return interaction.reply({ content: `❌ Timeout failed: ${error.message}`, ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setTitle('⏱️ User Timed Out')
            .setColor(0xff9900)
            .addFields(
                { name: 'User', value: `${user.tag}`, inline: true },
                { name: 'By', value: `${interaction.user.tag}`, inline: true },
                { name: 'Duration', value: ms(msDuration, { long: true }), inline: true },
                { name: 'Reason', value: reason }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },

    async executePrefix(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return message.reply('❌ You don’t have permission to timeout members.');
        }

        const user = message.mentions.users.first();
        const duration = args[1]; // Get the duration argument
        const reason = args.slice(2).join(' ') || 'No reason provided.';

        if (!user) return message.reply('⚠️ Mention a user. Usage: `-timeout <user> <duration> [reason]`');
        if (!duration) return message.reply('⚠️ Please provide a duration. Usage: `-timeout <user> <duration> [reason]`'); // Added check for duration

        const msDuration = ms(duration);

        if (!msDuration || msDuration < 5000 || msDuration > 2.419e9) {
            return message.reply('⏰ Invalid duration. Use values like `10m`, `2h`, `1d`.  Usage: `-timeout <user> <duration> [reason]`');
        }

        const member = message.guild.members.cache.get(user.id);

        if (!member) return message.reply('❌ User not found.');
        if (user.id === message.guild.ownerId) return message.reply("🚫 I cannot timeout the server owner.");

        // Check if the bot can moderate the target member.  This is CRITICAL.
        if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return message.reply("❌ I do not have permission to timeout members in this server.");
        }

          // Check if the Nishanka role is high enough in the hierarchy
        const nishankaRole = message.guild.roles.cache.find(role => role.name === 'Nishanka');
        if (nishankaRole && message.guild.members.me.roles.highest.position < member.roles.highest.position) {
            return message.reply("🚫 Nishanka's role is not high enough to timeout this user.  Make sure the 'Nishanka' role is higher than the target user's highest role.");
        }

        // START DEBUGGING - ADD THESE LINES
        const botMember = message.guild.members.me;
        const targetMember = message.guild.members.cache.get(user.id);

        console.log(`Bot isModeratable: ${botMember.moderatable}`);
        console.log(`Target isModeratable: ${targetMember.moderatable}`);
        console.log(`Target highest role position: ${targetMember.roles.highest.position}`);
        console.log(`Bot highest role position: ${botMember.roles.highest.position}`);

        if (!member.moderatable) {
             return message.reply("🚫 I cannot timeout that user. They might have higher permissions than me.");
        }

        // Try to DM the user
        try {
            await user.send(`⏱️ You have been **timed out** in **${message.guild.name}** for ${ms(msDuration, { long: true })}.\n**Reason:** ${reason}`);
        } catch (err) {
            console.log(`⚠️ Could not DM ${user.tag}.`);
        }

        try {
            await member.timeout(msDuration, reason);
        } catch (error) {
            console.error("Timeout failed:", error);
            return message.reply(`❌ Timeout failed: ${error.message}`);
        }

        const embed = new EmbedBuilder()
            .setTitle('⏱️ User Timed Out')
            .setColor(0xff9900)
            .addFields(
                { name: 'User', value: `${user.tag}`, inline: true },
                { name: 'By', value: `${message.author.tag}`, inline: true },
                { name: 'Duration', value: ms(msDuration, { long: true }), inline: true },
                { name: 'Reason', value: reason }
            )
            .setTimestamp();

        await message.channel.send({ embeds: [embed] });
    }
};