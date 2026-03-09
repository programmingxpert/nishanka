// commands/moderation/clearwarn.js
/* eslint-disable */
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const WarnSchema = require('../../models/warnSchema');

module.exports = {
	category: 'moderation',
	data: new SlashCommandBuilder()
		.setName('clearwarn')
		.setDescription('Removes a specific warning by ID.')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
		.addStringOption(option =>
			option.setName('id')
				.setDescription('The ID of the warning to remove')
				.setRequired(true)),
	async execute(interaction) {
		const warnId = interaction.options.getString('id');
		const result = await WarnSchema.findByIdAndDelete(warnId);

		if (!result) {
			return interaction.reply({ content: '❌ Warning not found. Double-check the ID.', ephemeral: true });
		}

		await interaction.reply(`🗑️ Removed warning \`${warnId}\` from <@${result.userId}>.`);
	}
};
