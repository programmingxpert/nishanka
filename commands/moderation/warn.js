/* eslint-disable */
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const Warn = require('../../models/warnSchema');
const WarnCounter = require('../../models/warnCounter');

module.exports = {
	category: 'moderation',
	data: new SlashCommandBuilder()
		.setName('warn')
		.setDescription('Warns a user.')
		.setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
		.addUserOption(option =>
			option.setName('user')
				.setDescription('User to warn')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('reason')
				.setDescription('Reason for the warning')
				.setRequired(false)),

	async execute(interaction) {
		const user = interaction.options.getUser('user');
		const reason = interaction.options.getString('reason') || 'No reason provided.';
		const guildId = interaction.guild.id;

		// Fetch or create counter
		let counter = await WarnCounter.findOne({ guildId });
		if (!counter) {
			counter = new WarnCounter({ guildId, count: 0 });
		}
		counter.count += 1;
		await counter.save();

		// Save to Warn DB
		const warning = new Warn({
			userId: user.id,
			guildId,
			warnId: counter.count,
			moderatorId: interaction.user.id,
			reason,
			timestamp: new Date()
		});
		await warning.save();

		const embed = new EmbedBuilder()
			.setTitle('⚠️ User Warned')
			.setColor(0xffa500)
			.addFields(
				{ name: 'User', value: user.tag, inline: true },
				{ name: 'Moderator', value: interaction.user.tag, inline: true },
				{ name: 'Reason', value: reason },
				{ name: 'Warn ID', value: counter.count.toString(), inline: true }
			)
			.setTimestamp();

		await interaction.reply({ embeds: [embed] });
	},

	async executePrefix(message, args) {
		if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
			return message.reply('❌ You don’t have permission to use this command.');
		}

		const user = message.mentions.users.first();
		if (!user) return message.reply('⚠️ Please mention a user to warn.');

		const reason = args.slice(1).join(' ') || 'No reason provided.';
		const guildId = message.guild.id;

		// Fetch or create counter
		let counter = await WarnCounter.findOne({ guildId });
		if (!counter) {
			counter = new WarnCounter({ guildId, count: 0 });
		}
		counter.count += 1;
		await counter.save();

		const warning = new Warn({
			userId: user.id,
			guildId,
			warnId: counter.count,
			moderatorId: message.author.id,
			reason,
			timestamp: new Date()
		});
		await warning.save();

		const embed = new EmbedBuilder()
			.setTitle('⚠️ User Warned')
			.setColor(0xffa500)
			.addFields(
				{ name: 'User', value: user.tag, inline: true },
				{ name: 'Moderator', value: message.author.tag, inline: true },
				{ name: 'Reason', value: reason },
				{ name: 'Warn ID', value: counter.count.toString(), inline: true }
			)
			.setTimestamp();

		await message.channel.send({ embeds: [embed] });
	}
};
