/* eslint-disable */
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
	category: 'moderation',
	data: new SlashCommandBuilder()
		.setName('unban')
		.setDescription('Unbans a user by their ID.')
		.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
		.addStringOption(option =>
			option.setName('userid')
				.setDescription('The ID of the user to unban')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('reason')
				.setDescription('Reason for unbanning')
				.setRequired(false)),

	async execute(interaction) {
		const userId = interaction.options.getString('userid');
		const reason = interaction.options.getString('reason') || 'No reason provided.';

		try {
			await interaction.guild.members.unban(userId, reason);

			const { logServerEvent } = require('../../utils/serverLogger');
			await logServerEvent(
				interaction.guild.id,
				'UNBAN',
				`Unbanned user ID ${userId}`,
				interaction.user,
				{ id: userId },
				{ reason }
			);

			const embed = new EmbedBuilder()
				.setTitle('🔓 User Unbanned')
				.setColor(0x00cc99)
				.addFields(
					{ name: 'User ID', value: userId, inline: true },
					{ name: 'By', value: `${interaction.user.tag}`, inline: true },
					{ name: 'Reason', value: reason }
				)
				.setTimestamp();

			await interaction.reply({ embeds: [embed] });
		} catch (err) {
			console.error(err);
			return interaction.reply({ content: `❌ Couldn't unban user: \`${userId}\`. Maybe they're not banned or ID is invalid.`, ephemeral: true });
		}
	},

	async executePrefix(message, args) {
		if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
			return message.reply('❌ You don’t have permission to unban members.');
		}

		const userId = args[0];
		const reason = args.slice(1).join(' ') || 'No reason provided.';
		if (!userId) return message.reply('⚠️ Provide a user ID.');

		try {
			await message.guild.members.unban(userId, reason);

			const { logServerEvent } = require('../../utils/serverLogger');
			await logServerEvent(
				message.guild.id,
				'UNBAN',
				`Unbanned user ID ${userId}`,
				message.author,
				{ id: userId },
				{ reason }
			);

			const embed = new EmbedBuilder()
				.setTitle('🔓 User Unbanned')
				.setColor(0x00cc99)
				.addFields(
					{ name: 'User ID', value: userId, inline: true },
					{ name: 'By', value: `${message.author.tag}`, inline: true },
					{ name: 'Reason', value: reason }
				)
				.setTimestamp();

			await message.channel.send({ embeds: [embed] });
		} catch (err) {
			console.error(err);
			message.reply(`❌ Couldn’t unban user: \`${userId}\`.`);
		}
	}
};
