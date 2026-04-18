/* eslint-disable */
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
	category: 'moderation',
	data: new SlashCommandBuilder()
		.setName('fakeban')
		.setDescription('Fakes a ban for a member.')
		.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
		.addUserOption(option =>
			option.setName('user')
				.setDescription('The user to fake ban')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('reason')
				.setDescription('Reason for the fake ban')
				.setRequired(false)),

	async execute(interaction) {
		// Check for permission (though setDefaultMemberPermissions handles most cases)
		if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
			// Do nothing for normal users as requested
			return;
		}

		const targetUser = interaction.options.getUser('user');
		const reason = interaction.options.getString('reason') || 'No reason provided.';
		const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

		const avatarURL = member ? member.displayAvatarURL({ dynamic: true }) : targetUser.displayAvatarURL({ dynamic: true });

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

		// For slash commands, we must reply. We can't "delete" the command in the same way as prefix.
		await interaction.reply({ embeds: [embed] });
	},

	async executePrefix(message, args) {
		// Permission check: only for mods (BanMembers permission)
		if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
			// Do nothing for normal users as requested
			return;
		}

		// Delete the command message immediately
		try {
			await message.delete();
		} catch (err) {
			console.log('Failed to delete message in fakeban:', err);
		}

		const user = message.mentions.users.first() || (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null);
		if (!user) return; // Or silently fail

		const reason = args.slice(1).join(' ') || 'No reason provided.';
		const member = message.guild.members.cache.get(user.id);

		const avatarURL = member ? member.displayAvatarURL({ dynamic: true }) : user.displayAvatarURL({ dynamic: true });

		const embed = new EmbedBuilder()
			.setTitle('👢 Member Banned')
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
