/* eslint-disable */
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
	category: 'moderation',
	data: new SlashCommandBuilder()
		.setName('removetimeout')
		.setDescription('Remove a timeout from a user.')
		.setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
		.addUserOption(option =>
			option.setName('user')
				.setDescription('The user to remove timeout from')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('reason')
				.setDescription('Reason for removing the timeout')
				.setRequired(false)),

	async execute(interaction) {
		const user = interaction.options.getUser('user');
		const member = await interaction.guild.members.fetch(user.id).catch(() => null);
		const reason = interaction.options.getString('reason') || 'No reason provided.';

		if (!member) return interaction.reply({ content: '❌ Could not find that user.', ephemeral: true });
		if (!member.moderatable) return interaction.reply({ content: '🚫 I cannot remove timeout from that user.', ephemeral: true });

		await member.timeout(null, reason);

		// Try to DM the user
		try {
			await user.send(`✅ Your **timeout has been removed** in **${interaction.guild.name}**.\n**Reason:** ${reason}`);
		} catch (err) {
			console.log(`⚠️ Could not DM ${user.tag}.`);
		}

		const embed = new EmbedBuilder()
			.setTitle('✅ Timeout Removed')
			.setColor(0x00cc66)
			.addFields(
				{ name: 'User', value: `${user.tag}`, inline: true },
				{ name: 'By', value: `${interaction.user.tag}`, inline: true },
				{ name: 'Reason', value: reason }
			)
			.setTimestamp();

		await interaction.reply({ embeds: [embed] });
	},

	async executePrefix(message, args) {
		if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
			return message.reply('❌ You don’t have permission to remove timeouts.');
		}

		const user = message.mentions.users.first();
		const reason = args.slice(1).join(' ') || 'No reason provided.';

		if (!user) return message.reply('⚠️ Mention a user.');

		const member = message.guild.members.cache.get(user.id);
		if (!member) return message.reply('❌ User not found.');
		if (!member.moderatable) return message.reply('🚫 I cannot remove timeout from that user.');

		await member.timeout(null, reason);

		// Try to DM the user
		try {
			await user.send(`✅ Your **timeout has been removed** in **${message.guild.name}**.\n**Reason:** ${reason}`);
		} catch (err) {
			console.log(`⚠️ Could not DM ${user.tag}.`);
		}

		const embed = new EmbedBuilder()
			.setTitle('✅ Timeout Removed')
			.setColor(0x00cc66)
			.addFields(
				{ name: 'User', value: `${user.tag}`, inline: true },
				{ name: 'By', value: `${message.author.tag}`, inline: true },
				{ name: 'Reason', value: reason }
			)
			.setTimestamp();

		await message.channel.send({ embeds: [embed] });
	}
};
