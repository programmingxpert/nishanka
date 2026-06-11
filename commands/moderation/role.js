/* eslint-disable */
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
	category: 'moderation',
	data: new SlashCommandBuilder()
		.setName('role')
		.setDescription('Manage roles for server members.')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
		.addSubcommand(subcommand =>
			subcommand
				.setName('add')
				.setDescription('Give a role to a member')
				.addUserOption(option =>
					option.setName('user')
						.setDescription('The member to receive the role')
						.setRequired(true))
				.addRoleOption(option =>
					option.setName('role')
						.setDescription('The role to give')
						.setRequired(true)))
		.addSubcommand(subcommand =>
			subcommand
				.setName('remove')
				.setDescription('Remove a role from a member')
				.addUserOption(option =>
					option.setName('user')
						.setDescription('The member to lose the role')
						.setRequired(true))
				.addRoleOption(option =>
					option.setName('role')
						.setDescription('The role to remove')
						.setRequired(true))),

	async execute(interaction) {
		const subcommand = interaction.options.getSubcommand();
		const targetUser = interaction.options.getUser('user');
		const role = interaction.options.getRole('role');
		const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

		if (!member) {
			return interaction.reply({ content: '⚠️ Member not found in the server.', ephemeral: true });
		}

		const botMember = await interaction.guild.members.fetch(interaction.client.user.id);

		// Check Bot permissions
		if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
			return interaction.reply({ content: '🚫 I do not have the **Manage Roles** permission.', ephemeral: true });
		}

		// Role hierarchy check for Bot
		if (role.position >= botMember.roles.highest.position) {
			return interaction.reply({ 
				content: `🚫 I cannot manage the role **${role.name}** because it is positioned higher than or equal to my highest role.`, 
				ephemeral: true 
			});
		}

		// Role hierarchy check for Moderator (except if they are the guild owner)
		const isOwner = interaction.user.id === interaction.guild.ownerId;
		if (!isOwner && role.position >= interaction.member.roles.highest.position) {
			return interaction.reply({ 
				content: `🚫 You cannot manage the role **${role.name}** because it is positioned higher than or equal to your highest role.`, 
				ephemeral: true 
			});
		}

		if (subcommand === 'add') {
			if (member.roles.cache.has(role.id)) {
				return interaction.reply({ content: `⚠️ **${member.user.username}** already has the role **${role.name}**.`, ephemeral: true });
			}

			await member.roles.add(role, `Assigned by ${interaction.user.tag}`);

			const embed = new EmbedBuilder()
				.setTitle('✅ Role Added')
				.setDescription(`Successfully gave the role **${role.name}** to **${member.user.username}**.`)
				.setColor(0x2ecc71)
				.addFields(
					{ name: 'Target User', value: `<@${member.user.id}> (${member.user.tag})`, inline: true },
					{ name: 'Role', value: `<@&${role.id}> (\`${role.name}\`)`, inline: true },
					{ name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true }
				)
				.setTimestamp();

			const { logServerEvent } = require('../../utils/serverLogger');
			await logServerEvent(
				interaction.guild.id,
				'ROLE_ADD',
				`Gave role ${role.name} to ${member.user.username}`,
				interaction.user,
				member.user,
				{ roleName: role.name, roleId: role.id }
			);

			return interaction.reply({ embeds: [embed] });
		} else if (subcommand === 'remove') {
			if (!member.roles.cache.has(role.id)) {
				return interaction.reply({ content: `⚠️ **${member.user.username}** does not have the role **${role.name}**.`, ephemeral: true });
			}

			await member.roles.remove(role, `Removed by ${interaction.user.tag}`);

			const embed = new EmbedBuilder()
				.setTitle('❌ Role Removed')
				.setDescription(`Successfully removed the role **${role.name}** from **${member.user.username}**.`)
				.setColor(0xe74c3c)
				.addFields(
					{ name: 'Target User', value: `<@${member.user.id}> (${member.user.tag})`, inline: true },
					{ name: 'Role', value: `<@&${role.id}> (\`${role.name}\`)`, inline: true },
					{ name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true }
				)
				.setTimestamp();

			const { logServerEvent } = require('../../utils/serverLogger');
			await logServerEvent(
				interaction.guild.id,
				'ROLE_REMOVE',
				`Removed role ${role.name} from ${member.user.username}`,
				interaction.user,
				member.user,
				{ roleName: role.name, roleId: role.id }
			);

			return interaction.reply({ embeds: [embed] });
		}
	},

	async executePrefix(message, args) {
		if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
			return message.reply('❌ You don’t have permission to use this command.');
		}

		const action = args[0]?.toLowerCase();
		if (action !== 'add' && action !== 'remove') {
			return message.reply('⚠️ Invalid usage. Syntax: `_role add <user> <role>` or `_role remove <user> <role>`');
		}

		// Find target member
		const userMention = message.mentions.users.first();
		const userId = userMention ? userMention.id : args[1];
		if (!userId) {
			return message.reply('⚠️ Please specify a user to manage (mention or ID).');
		}

		const member = await message.guild.members.fetch(userId).catch(() => null);
		if (!member) {
			return message.reply('⚠️ Member not found in this server.');
		}

		// Find target role (remaining arguments resolved as ID, mention, or name)
		const roleArg = args.slice(2).join(' ');
		if (!roleArg) {
			return message.reply('⚠️ Please specify a role to manage (mention, ID, or name).');
		}

		let role = message.mentions.roles.first();
		if (!role) {
			// Try by ID
			role = message.guild.roles.cache.get(roleArg);
		}
		if (!role) {
			// Try by name (case-insensitive)
			role = message.guild.roles.cache.find(r => r.name.toLowerCase() === roleArg.toLowerCase());
		}

		if (!role) {
			return message.reply('⚠️ Role not found in this server.');
		}

		const botMember = await message.guild.members.fetch(message.client.user.id);

		// Check Bot permissions
		if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
			return message.reply('🚫 I do not have the **Manage Roles** permission.');
		}

		// Role hierarchy check for Bot
		if (role.position >= botMember.roles.highest.position) {
			return message.reply(`🚫 I cannot manage the role **${role.name}** because it is positioned higher than or equal to my highest role.`);
		}

		// Role hierarchy check for Moderator
		const isOwner = message.author.id === message.guild.ownerId;
		if (!isOwner && role.position >= message.member.roles.highest.position) {
			return message.reply(`🚫 You cannot manage the role **${role.name}** because it is positioned higher than or equal to your highest role.`);
		}

		if (action === 'add') {
			if (member.roles.cache.has(role.id)) {
				return message.reply(`⚠️ **${member.user.username}** already has the role **${role.name}**.`);
			}

			await member.roles.add(role, `Assigned by ${message.author.tag}`);

			const embed = new EmbedBuilder()
				.setTitle('✅ Role Added')
				.setDescription(`Successfully gave the role **${role.name}** to **${member.user.username}**.`)
				.setColor(0x2ecc71)
				.addFields(
					{ name: 'Target User', value: `<@${member.user.id}> (${member.user.tag})`, inline: true },
					{ name: 'Role', value: `<@&${role.id}> (\`${role.name}\`)`, inline: true },
					{ name: 'Moderator', value: `<@${message.author.id}>`, inline: true }
				)
				.setTimestamp();

			const { logServerEvent } = require('../../utils/serverLogger');
			await logServerEvent(
				message.guild.id,
				'ROLE_ADD',
				`Gave role ${role.name} to ${member.user.username}`,
				message.author,
				member.user,
				{ roleName: role.name, roleId: role.id }
			);

			return message.reply({ embeds: [embed] });
		} else if (action === 'remove') {
			if (!member.roles.cache.has(role.id)) {
				return message.reply(`⚠️ **${member.user.username}** does not have the role **${role.name}**.`);
			}

			await member.roles.remove(role, `Removed by ${message.author.tag}`);

			const embed = new EmbedBuilder()
				.setTitle('❌ Role Removed')
				.setDescription(`Successfully removed the role **${role.name}** from **${member.user.username}**.`)
				.setColor(0xe74c3c)
				.addFields(
					{ name: 'Target User', value: `<@${member.user.id}> (${member.user.tag})`, inline: true },
					{ name: 'Role', value: `<@&${role.id}> (\`${role.name}\`)`, inline: true },
					{ name: 'Moderator', value: `<@${message.author.id}>`, inline: true }
				)
				.setTimestamp();

			const { logServerEvent } = require('../../utils/serverLogger');
			await logServerEvent(
				message.guild.id,
				'ROLE_REMOVE',
				`Removed role ${role.name} from ${member.user.username}`,
				message.author,
				member.user,
				{ roleName: role.name, roleId: role.id }
			);

			return message.reply({ embeds: [embed] });
		}
	}
};
