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
		if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) return;

		const targetUser = interaction.options.getUser('user');
		const reason = interaction.options.getString('reason') || 'No reason provided.';
		const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

		const prefix = process.env.PREFIX ?? '-';

		// Create a webhook to simulate the user typing the command
		try {
			const webhook = await interaction.channel.createWebhook({
				name: interaction.member.displayName,
				avatar: interaction.user.displayAvatarURL({ dynamic: true }),
			});

			await webhook.send({
				content: `${prefix}ban <@${targetUser.id}> ${reason}`,
			});

			await webhook.delete();
		} catch (err) {
			console.error('Webhook simulation failed in fakeban slash:', err);
		}

		const avatarURL = member ? member.displayAvatarURL({ dynamic: true }) : targetUser.displayAvatarURL({ dynamic: true });

		const embed = new EmbedBuilder()
			.setTitle('Limited Edition Banned')
			.setColor(0xff3c38)
			.addFields(
				{ name: 'User', value: `${targetUser.tag}`, inline: true },
				{ name: 'By', value: `${interaction.user.tag}`, inline: true },
				{ name: 'Reason', value: reason }
			)
			.setThumbnail(avatarURL)
			.setTimestamp();

		// Use followup because we might have taken too long with the webhook or we want to wait for the webhook message to appear first
		await interaction.reply({ embeds: [embed] });
	},

	async executePrefix(message, args) {
		if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) return;

		const user = message.mentions.users.first() || (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null);
		if (!user) return;

		const reason = args.slice(1).join(' ') || 'No reason provided.';
		const prefix = process.env.PREFIX ?? '-';

		// 1. Delete the moderator's real message
		try {
			await message.delete();
		} catch (err) {
			console.log('Failed to delete message in fakeban:', err);
		}

		// 2. Create a webhook to impersonate the moderator
		try {
			const webhook = await message.channel.createWebhook({
				name: message.member.displayName,
				avatar: message.author.displayAvatarURL({ dynamic: true }),
			});

			// 3. Send the fake command message
			await webhook.send({
				content: `${prefix}ban <@${user.id}> ${reason}`,
			});

			// 4. Cleanup
			await webhook.delete();
		} catch (err) {
			console.error('Webhook simulation failed in fakeban prefix:', err);
			// Fallback: if webhook fails, we still show the embed
		}

		const member = message.guild.members.cache.get(user.id);
		const avatarURL = member ? member.displayAvatarURL({ dynamic: true }) : user.displayAvatarURL({ dynamic: true });

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
