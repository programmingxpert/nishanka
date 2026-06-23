/* eslint-disable */
const {
	SlashCommandBuilder,
	EmbedBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	PermissionFlagsBits,
} = require('discord.js');
const WarnSchema = require('../../models/warnSchema');

module.exports = {
	category: 'moderation',
	data: new SlashCommandBuilder()
		.setName('warnings')
		.setDescription('Displays the warnings for a user.')
		.addUserOption(option =>
			option.setName('user')
				.setDescription('The user to check warnings for')
				.setRequired(true)
		)
		.setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

	// ------------------ Slash command ------------------
	async execute(interaction) {
		const user = interaction.options.getUser('user');
		const guildId = interaction.guild.id;

		const warnings = await WarnSchema.find({ userId: user.id, guildId }).sort({ warnId: 1 });
		if (warnings.length === 0) {
			return interaction.reply({ content: `✅ ${user.tag} has no warnings.`, ephemeral: true });
		}

		let currentPage = 0;
		const perPage = 5;
		const totalPages = Math.ceil(warnings.length / perPage);

		const generateEmbed = (page) => {
			const member = interaction.guild.members.cache.get(user.id);
			const avatarURL = member ? member.displayAvatarURL({ dynamic: true }) : user.displayAvatarURL({ dynamic: true });
			const embed = new EmbedBuilder()
				.setTitle(`⚠️ Warnings for ${user.tag}`)
				.setColor(0xffcc00)
				.setThumbnail(avatarURL)
				.setFooter({ text: `Page ${page + 1} of ${totalPages}` })
				.setTimestamp();

			const slice = warnings.slice(page * perPage, (page + 1) * perPage);
			slice.forEach(w => {
				embed.addFields({
					name: `#${w.warnId}`,
					value: `**Reason:** ${w.reason}\n**By:** <@${w.moderatorId}>\n**Date:** ${new Date(w.timestamp).toLocaleString()}`
				});
			});
			return embed;
		};

		const row = new ActionRowBuilder().addComponents(
			new ButtonBuilder().setCustomId('prev').setLabel('⬅️').setStyle(ButtonStyle.Secondary),
			new ButtonBuilder().setCustomId('next').setLabel('➡️').setStyle(ButtonStyle.Secondary)
		);

		const msg = await interaction.reply({ embeds: [generateEmbed(currentPage)], components: totalPages > 1 ? [row] : [], ephemeral: false, withResponse: true });

		if (totalPages <= 1) return;

		const collector = msg.createMessageComponentCollector({ time: 60_000 });

		collector.on('collect', i => {
			if (i.user.id !== interaction.user.id) return i.reply({ content: 'Only you can use these buttons.', ephemeral: true });

			if (i.customId === 'prev' && currentPage > 0) currentPage--;
			else if (i.customId === 'next' && currentPage < totalPages - 1) currentPage++;

			i.update({ embeds: [generateEmbed(currentPage)], components: [row] });
		});
	},

	// ------------------ Prefix command ------------------
	async executePrefix(message, args) {
		if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
			return message.reply('❌ You don’t have permission to use this command.');
		}

		const user = message.mentions.users.first() || message.guild.members.cache.get(args[0])?.user;

		if (!user) {
			return message.reply('⚠️ Please mention a user or provide a valid user ID.');
		}

		const guildId = message.guild.id;
		const warnings = await WarnSchema.find({ userId: user.id, guildId }).sort({ warnId: 1 });

		if (warnings.length === 0) {
			return message.reply(`✅ ${user.tag} has no warnings.`);
		}

		let currentPage = 0;
		const perPage = 5;
		const totalPages = Math.ceil(warnings.length / perPage);

		const generateEmbed = (page) => {
			const member = message.guild.members.cache.get(user.id);
			const avatarURL = member ? member.displayAvatarURL({ dynamic: true }) : user.displayAvatarURL({ dynamic: true });
			const embed = new EmbedBuilder()
				.setTitle(`⚠️ Warnings for ${user.tag}`)
				.setColor(0xffcc00)
				.setThumbnail(avatarURL)
				.setFooter({ text: `Page ${page + 1} of ${totalPages}` })
				.setTimestamp();

			const slice = warnings.slice(page * perPage, (page + 1) * perPage);
			slice.forEach(w => {
				embed.addFields({
					name: `#${w.warnId}`,
					value: `**Reason:** ${w.reason}\n**By:** <@${w.moderatorId}>\n**Date:** ${new Date(w.timestamp).toLocaleString()}`
				});
			});
			return embed;
		};

		const sent = await message.channel.send({ embeds: [generateEmbed(currentPage)] });

		if (totalPages <= 1) return;

		await sent.react('⬅️');
		await sent.react('➡️');

		const filter = (reaction, userReacted) =>
			['⬅️', '➡️'].includes(reaction.emoji.name) && userReacted.id === message.author.id;

		const collector = sent.createReactionCollector({ filter, time: 60_000 });

		collector.on('collect', async (reaction, userReacted) => {
			await reaction.users.remove(userReacted.id).catch(() => {});
			if (reaction.emoji.name === '⬅️' && currentPage > 0) currentPage--;
			if (reaction.emoji.name === '➡️' && currentPage < totalPages - 1) currentPage++;

			sent.edit({ embeds: [generateEmbed(currentPage)] });
		});
	}
};
