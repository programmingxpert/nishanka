/* eslint-disable */
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
	category: 'moderation',
	data: new SlashCommandBuilder()
		.setName('ban')
		.setDescription('Bans a member from the server.')
		.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
		.addUserOption(option =>
			option.setName('user')
				.setDescription('The user to ban')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('reason')
				.setDescription('Reason for the ban')
				.setRequired(false)),

	async execute(interaction) {
		const targetUser = interaction.options.getUser('user');
		const reason = interaction.options.getString('reason') || 'No reason provided.';
		const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

		if (!member) {
			return interaction.reply({ content: '⚠️ Could not find that user in the guild.', ephemeral: true });
		}

		if (!member.bannable) {
			return interaction.reply({ content: '🚫 I cannot ban that user. Check my role position and permissions.', ephemeral: true });
		}

		// Try DM before banning
		try {
			await targetUser.send(`🔨 You have been **banned** from **${interaction.guild.name}**.\nReason: ${reason}`);
		} catch (err) {
			console.log(`Couldn't DM ${targetUser.tag}`);
		}

		const avatarURL = member.displayAvatarURL({ dynamic: true });
		await member.ban({ reason });

		const embed = new EmbedBuilder()
			.setTitle('👢 Member Banned')
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
		if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
			return message.reply('❌ You don’t have permission to use this command.');
		}

		const user = message.mentions.users.first();
		if (!user) return message.reply('⚠️ Please mention a user to ban.');

		const reason = args.slice(1).join(' ') || 'No reason provided.';
		const member = message.guild.members.cache.get(user.id);

		if (!member) return message.reply('⚠️ User not found in the guild.');
		if (!member.bannable) return message.reply('🚫 I cannot ban that user. Check my role position and permissions.');

		// Try DM before banning
		try {
			await user.send(`🔨 You have been **banned** from **${message.guild.name}**.\nReason: ${reason}`);
		} catch (err) {
			console.log(`Couldn't DM ${user.tag}`);
		}

		const avatarURL = member.displayAvatarURL({ dynamic: true });
		await member.ban({ reason });

		const embed = new EmbedBuilder()
			.setTitle('Limited Edition Banned')
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
