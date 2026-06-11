/* eslint-disable */
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
	category: 'moderation',
	data: new SlashCommandBuilder()
		.setName('mkick')
		.setDescription('Kicks a member from the server.')
		.setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
		.addUserOption(option =>
			option.setName('user')
				.setDescription('The user to kick')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('reason')
				.setDescription('Reason for the kick')
				.setRequired(false)),
		
	async execute(interaction) {
		const targetUser = interaction.options.getUser('user');
		const reason = interaction.options.getString('reason') || 'No reason provided.';
		const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

		if (!member) {
			return interaction.reply({ content: '⚠️ Could not find that user in the guild.', ephemeral: true });
		}

		if (!member.kickable) {
			return interaction.reply({ content: '🚫 I cannot kick that user.', ephemeral: true });
		}

		const avatarURL = member.displayAvatarURL({ dynamic: true });
		await member.kick(reason);
		try {
			const { logServerEvent } = require('../../utils/serverLogger');
			await logServerEvent(interaction.guild.id, 'KICK', reason, interaction.user, targetUser);
		} catch (e) {
			console.error('[mkick] Logging failed:', e);
		}

		const embed = new EmbedBuilder()
			.setTitle('👢 Member Kicked')
			.setColor(0xff3c38)
			.addFields(
				{ name: 'User', value: `${targetUser.tag}`, inline: true },
				{ name: 'By', value: `${interaction.user.tag}`, inline: true },
				{ name: 'Reason', value: reason }
			)
			.setThumbnail(avatarURL)
			.setTimestamp();

		await interaction.reply({ embeds: [embed] });
	},

	async executePrefix(message, args) {
		if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) {
			return message.reply('❌ You don’t have permission to use this command.');
		}

		const user = message.mentions.users.first();
		if (!user) return message.reply('⚠️ Please mention a user to kick.');

		const reason = args.slice(1).join(' ') || 'No reason provided.';
		const member = message.guild.members.cache.get(user.id);

		if (!member) return message.reply('⚠️ User not found in the guild.');
		if (!member.kickable) return message.reply('🚫 I cannot kick that user.');

		const avatarURL = member.displayAvatarURL({ dynamic: true });
		await member.kick(reason);
		try {
			const { logServerEvent } = require('../../utils/serverLogger');
			await logServerEvent(message.guild.id, 'KICK', reason, message.author, user);
		} catch (e) {
			console.error('[mkick] Logging failed:', e);
		}

		const embed = new EmbedBuilder()
			.setTitle('👢 Member Kicked')
			.setColor(0xff3c38)
			.addFields(
				{ name: 'User', value: `${user.tag}`, inline: true },
				{ name: 'By', value: `${message.author.tag}`, inline: true },
				{ name: 'Reason', value: reason }
			)
			.setThumbnail(avatarURL)
			.setTimestamp();

		await message.channel.send({ embeds: [embed] });
	}
};
