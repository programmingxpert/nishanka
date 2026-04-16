/* eslint-disable */
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
	category: 'moderation',
	data: new SlashCommandBuilder()
		.setName('unlock')
		.setDescription('Unlocks the channel for all citizens.')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
		.addStringOption(option =>
			option.setName('reason')
				.setDescription('Reason for unlocking the channel')
				.setRequired(false)),

	async execute(interaction) {
		const reason = interaction.options.getString('reason') || 'No reason provided.';
		const citizenRole = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === 'citizen' || r.name.toLowerCase() === 'citizens');
		const target = citizenRole || interaction.guild.roles.everyone;

		try {
			// Setting to null removes the override for this role/everyone
			await interaction.channel.permissionOverwrites.edit(target, {
				SendMessages: null
			}, { reason: `Unlocked by ${interaction.user.tag}: ${reason}` });

			const embed = new EmbedBuilder()
				.setTitle('🔓 Channel Unlocked')
				.setDescription(`This channel has been unlocked for **${target.name}**.`)
				.setColor(0x00cc66)
				.addFields(
					{ name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
					{ name: 'Reason', value: reason, inline: true }
				)
				.setTimestamp();

			await interaction.reply({ embeds: [embed] });
		} catch (error) {
			console.error(error);
			await interaction.reply({ content: '❌ Failed to unlock the channel. Make sure I have "Manage Channels" permission.', ephemeral: true });
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
				SendMessages: null
			}, { reason: `Unlocked by ${message.author.tag}: ${reason}` });

			const embed = new EmbedBuilder()
				.setTitle('🔓 Channel Unlocked')
				.setDescription(`This channel has been unlocked for **${target.name}**.`)
				.setColor(0x00cc66)
				.addFields(
					{ name: 'Moderator', value: `${message.author.tag}`, inline: true },
					{ name: 'Reason', value: reason, inline: true }
				)
				.setTimestamp();

			await message.channel.send({ embeds: [embed] });
		} catch (error) {
			console.error(error);
			await message.reply('❌ Failed to unlock the channel. Make sure I have "Manage Channels" permission.');
		}
	}
};
