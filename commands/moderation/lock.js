/* eslint-disable */
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
	category: 'moderation',
	data: new SlashCommandBuilder()
		.setName('lock')
		.setDescription('Locks the channel for all citizens.')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
		.addStringOption(option =>
			option.setName('reason')
				.setDescription('Reason for locking the channel')
				.setRequired(false)),

	async execute(interaction) {
		const reason = interaction.options.getString('reason') || 'No reason provided.';
		const citizenRole = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === 'citizen' || r.name.toLowerCase() === 'citizens');
		const target = citizenRole || interaction.guild.roles.everyone;

		try {
			await interaction.channel.permissionOverwrites.edit(target, {
				SendMessages: false
			}, { reason: `Locked by ${interaction.user.tag}: ${reason}` });
			try {
				const { logServerEvent } = require('../../utils/serverLogger');
				await logServerEvent(interaction.guild.id, 'LOCK', `Locked channel #${interaction.channel.name} for ${target.name}. Reason: ${reason}`, interaction.user, interaction.channel);
			} catch (e) {
				console.error('[lock] Logging failed:', e);
			}

			const embed = new EmbedBuilder()
				.setTitle('🔒 Channel Locked')
				.setDescription(`This channel has been locked for **${target.name}**.`)
				.setColor(0xff3c38)
				.addFields(
					{ name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
					{ name: 'Reason', value: reason, inline: true }
				)
				.setTimestamp();

			await interaction.reply({ embeds: [embed] });
		} catch (error) {
			console.error(error);
			await interaction.reply({ content: '❌ Failed to lock the channel. Make sure I have "Manage Channels" permission.', ephemeral: true });
		}
	},

	async executePrefix(message, args) {
		if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
			return message.reply('❌ You don’t have permission to use this command.');
		}

		const reason = args.join(' ') || 'No reason provided.';
		const citizenRole = message.guild.roles.cache.find(r => r.name.toLowerCase() === 'citizen' || r.name.toLowerCase() === 'citizens');
		const target = citizenRole || message.guild.roles.everyone;

		try {
			await message.channel.permissionOverwrites.edit(target, {
				SendMessages: false
			}, { reason: `Locked by ${message.author.tag}: ${reason}` });
			try {
				const { logServerEvent } = require('../../utils/serverLogger');
				await logServerEvent(message.guild.id, 'LOCK', `Locked channel #${message.channel.name} for ${target.name}. Reason: ${reason}`, message.author, message.channel);
			} catch (e) {
				console.error('[lock] Logging failed:', e);
			}

			const embed = new EmbedBuilder()
				.setTitle('🔒 Channel Locked')
				.setDescription(`This channel has been locked for **${target.name}**.`)
				.setColor(0xff3c38)
				.addFields(
					{ name: 'Moderator', value: `${message.author.tag}`, inline: true },
					{ name: 'Reason', value: reason, inline: true }
				)
				.setTimestamp();

			await message.channel.send({ embeds: [embed] });
		} catch (error) {
			console.error(error);
			await message.reply('❌ Failed to lock the channel. Make sure I have "Manage Channels" permission.');
		}
	}
};
