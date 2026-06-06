/* eslint-disable */
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const ms = require('ms');
const TempRole = require('../../models/tempRoleSchema');

module.exports = {
    category: 'moderation',
    data: new SlashCommandBuilder()
        .setName('temprole')
        .setDescription('Temporarily assign a role to a user.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to give the role to')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('The role to temporarily assign')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('duration')
                .setDescription('Duration of the role (e.g., 10m, 2h, 1d)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for giving the temporary role')
                .setRequired(false)),

    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const role = interaction.options.getRole('role');
        const duration = interaction.options.getString('duration');
        const reason = interaction.options.getString('reason') || 'No reason provided.';

        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (!member) return interaction.reply({ content: '❌ Could not find that user.', ephemeral: true });

        // Check bot permissions
        const botMember = interaction.guild.members.me;
        if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return interaction.reply({ content: '❌ I do not have permission to manage roles in this server.', ephemeral: true });
        }

        // Check executor permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return interaction.reply({ content: '❌ You do not have permission to manage roles.', ephemeral: true });
        }

        // Check role hierarchy relative to bot
        if (role.position >= botMember.roles.highest.position) {
            return interaction.reply({
                content: `🚫 I cannot manage that role because it is higher than or equal to my highest role (${botMember.roles.highest.name}).`,
                ephemeral: true
            });
        }

        // Check role hierarchy relative to command executor
        if (role.position >= interaction.member.roles.highest.position && interaction.user.id !== interaction.guild.ownerId) {
            return interaction.reply({
                content: `🚫 You cannot assign a role that is higher than or equal to your highest role.`,
                ephemeral: true
            });
        }

        // Check if role is managed by an integration
        if (role.managed) {
            return interaction.reply({ content: '🚫 That role is managed by an integration and cannot be manually assigned.', ephemeral: true });
        }

        // Parse duration
        const msDuration = ms(duration);
        if (!msDuration || msDuration < 5000) {
            return interaction.reply({ content: '⏰ Invalid duration. Must be at least `5s` (e.g., `10m`, `2h`, `1d`).', ephemeral: true });
        }

        // Check if user has it permanently
        if (member.roles.cache.has(role.id)) {
            const existingTemp = await TempRole.findOne({ guildId: interaction.guild.id, userId: member.id, roleId: role.id });
            if (!existingTemp) {
                return interaction.reply({ content: `⚠️ This user already has that role permanently.`, ephemeral: true });
            }
        }

        const expiresAt = new Date(Date.now() + msDuration);

        try {
            // Add role if not already present
            if (!member.roles.cache.has(role.id)) {
                await member.roles.add(role, `Temporary role assigned by ${interaction.user.tag}: ${reason}`);
            }

            // Save to database
            await TempRole.findOneAndUpdate(
                { guildId: interaction.guild.id, userId: member.id, roleId: role.id },
                { expiresAt },
                { upsert: true, new: true }
            );

            const { logServerEvent } = require('../../utils/serverLogger');
            await logServerEvent(
                interaction.guild.id,
                'TEMPROLE_ADD',
                `Assigned temporary role @${role.name} to ${user.username} for ${duration}`,
                interaction.user,
                user,
                { roleId: role.id, roleName: role.name, duration, expiresAt, reason }
            );
        } catch (error) {
            console.error("Temporary role assignment failed:", error);
            return interaction.reply({ content: `❌ Failed to assign role: ${error.message}`, ephemeral: true });
        }

        // Try to DM user
        try {
            await user.send(`🎭 You have been temporarily given the role **${role.name}** in **${interaction.guild.name}** for **${ms(msDuration, { long: true })}**.\n**Reason:** ${reason}`);
        } catch (err) {
            console.log(`⚠️ Could not DM ${user.tag}.`);
        }

        const embed = new EmbedBuilder()
            .setTitle('🎭 Temporary Role Assigned')
            .setColor(0x7c6cf0)
            .addFields(
                { name: 'User', value: `${user.tag}`, inline: true },
                { name: 'Role', value: `${role.name}`, inline: true },
                { name: 'By', value: `${interaction.user.tag}`, inline: true },
                { name: 'Duration', value: ms(msDuration, { long: true }), inline: true },
                { name: 'Expires At', value: `<t:${Math.floor(expiresAt.getTime() / 1000)}:F>`, inline: true },
                { name: 'Reason', value: reason }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },

    async executePrefix(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return message.reply('❌ You don’t have permission to manage roles.');
        }

        // Check user
        const userMention = message.mentions.users.first();
        const userId = userMention ? userMention.id : args[0];
        if (!userId) {
            return message.reply('⚠️ Mention a user or provide an ID. Usage: `-temprole <user> <role> <duration> [reason]`');
        }

        const member = await message.guild.members.fetch(userId).catch(() => null);
        if (!member) return message.reply('❌ User not found.');

        // Check role argument
        const roleArg = args[1];
        if (!roleArg) {
            return message.reply('⚠️ Please provide a role. Usage: `-temprole <user> <role> <duration> [reason]`');
        }

        // Try role mention first, then ID, then name (case-insensitive)
        let role = message.mentions.roles.first();
        if (!role) {
            const cleanRoleId = roleArg.replace(/[^0-9]/g, '');
            role = message.guild.roles.cache.get(cleanRoleId) || 
                   message.guild.roles.cache.find(r => r.name.toLowerCase() === roleArg.toLowerCase());
        }

        if (!role) {
            return message.reply('❌ Role not found. Please mention the role, provide the Role ID, or use the single-word role name.');
        }

        // Check duration
        const duration = args[2];
        if (!duration) {
            return message.reply('⚠️ Please provide a duration (e.g. `10m`, `2h`, `1d`). Usage: `-temprole <user> <role> <duration> [reason]`');
        }

        const msDuration = ms(duration);
        if (!msDuration || msDuration < 5000) {
            return message.reply('⏰ Invalid duration. Must be at least `5s` (e.g., `10m`, `2h`, `1d`).');
        }

        const reason = args.slice(3).join(' ') || 'No reason provided.';

        // Check bot permissions
        const botMember = message.guild.members.me;
        if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return message.reply('❌ I do not have permission to manage roles in this server.');
        }

        // Check role hierarchy relative to bot
        if (role.position >= botMember.roles.highest.position) {
            return message.reply(`🚫 I cannot manage that role because it is higher than or equal to my highest role (${botMember.roles.highest.name}).`);
        }

        // Check role hierarchy relative to command executor
        if (role.position >= message.member.roles.highest.position && message.author.id !== message.guild.ownerId) {
            return message.reply(`🚫 You cannot assign a role that is higher than or equal to your highest role.`);
        }

        // Check if role is managed
        if (role.managed) {
            return message.reply('🚫 That role is managed by an integration and cannot be manually assigned.');
        }

        // Check if user has it permanently
        if (member.roles.cache.has(role.id)) {
            const existingTemp = await TempRole.findOne({ guildId: message.guild.id, userId: member.id, roleId: role.id });
            if (!existingTemp) {
                return message.reply(`⚠️ This user already has that role permanently.`);
            }
        }

        const expiresAt = new Date(Date.now() + msDuration);

        try {
            // Add role if not already present
            if (!member.roles.cache.has(role.id)) {
                await member.roles.add(role, `Temporary role assigned by ${message.author.tag}: ${reason}`);
            }

            // Save to database
            await TempRole.findOneAndUpdate(
                { guildId: message.guild.id, userId: member.id, roleId: role.id },
                { expiresAt },
                { upsert: true, new: true }
            );

            const { logServerEvent } = require('../../utils/serverLogger');
            await logServerEvent(
                message.guild.id,
                'TEMPROLE_ADD',
                `Assigned temporary role @${role.name} to ${member.user.username} for ${duration}`,
                message.author,
                member.user,
                { roleId: role.id, roleName: role.name, duration, expiresAt, reason }
            );
        } catch (error) {
            console.error("Temporary role assignment failed:", error);
            return message.reply(`❌ Failed to assign role: ${error.message}`);
        }

        // Try to DM user
        try {
            await member.user.send(`🎭 You have been temporarily given the role **${role.name}** in **${message.guild.name}** for **${ms(msDuration, { long: true })}**.\n**Reason:** ${reason}`);
        } catch (err) {
            console.log(`⚠️ Could not DM ${member.user.tag}.`);
        }

        const embed = new EmbedBuilder()
            .setTitle('🎭 Temporary Role Assigned')
            .setColor(0x7c6cf0)
            .addFields(
                { name: 'User', value: `${member.user.tag}`, inline: true },
                { name: 'Role', value: `${role.name}`, inline: true },
                { name: 'By', value: `${message.author.tag}`, inline: true },
                { name: 'Duration', value: ms(msDuration, { long: true }), inline: true },
                { name: 'Expires At', value: `<t:${Math.floor(expiresAt.getTime() / 1000)}:F>`, inline: true },
                { name: 'Reason', value: reason }
            )
            .setTimestamp();

        await message.channel.send({ embeds: [embed] });
    }
};
