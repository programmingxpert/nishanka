/* eslint-disable */
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const Warn = require('../../models/warnSchema');

module.exports = {
	category: 'moderation',
	data: new SlashCommandBuilder()
		.setName('clearwarnings')
		.setDescription('Clears all warnings for a user.')
		.setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
		.addUserOption(option =>
			option.setName('user')
				.setDescription('User to clear warnings for')
				.setRequired(true)
		),

	async execute(interaction) {
		const user = interaction.options.getUser('user');
		const guildId = interaction.guild.id;

		const result = await Warn.deleteMany({ userId: user.id, guildId });

		const embed = new EmbedBuilder()
			.setTitle('🧹 Warnings Cleared')
			.setColor(0x00ff99)
			.setDescription(`Cleared \`${result.deletedCount}\` warning(s) for ${user.tag}.`)
			.setTimestamp();

		await interaction.reply({ embeds: [embed] });
	},

	async executePrefix(message, args) {
		if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
			return message.reply('❌ You don’t have permission to use this command.');
		}

		const user = message.mentions.users.first();
		if (!user) return message.reply('⚠️ Please mention a user to clear warnings.');

		const result = await Warn.deleteMany({ userId: user.id, guildId: message.guild.id });

		const embed = new EmbedBuilder()
			.setTitle('🧹 Warnings Cleared')
			.setColor(0x00ff99)
			.setDescription(`Cleared \`${result.deletedCount}\` warning(s) for ${user.tag}.`)
			.setTimestamp();

		await message.channel.send({ embeds: [embed] });
	}
};
