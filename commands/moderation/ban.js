/* eslint-disable */
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');

module.exports = {
	category: 'moderation',
	data: new SlashCommandBuilder()
		.setName('ban')
		.setDescription('Bans a member from the server with message deletion selection.')
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

		// Send dropdown menu to specify message deletion
		const confirmEmbed = new EmbedBuilder()
			.setTitle('🔨 Ban Confirmation')
			.setColor(0xF39C12)
			.setDescription(`Are you sure you want to ban **${targetUser.tag}**?\nReason: \`${reason}\`\n\nChoose the message deletion history duration below. Selecting an option will execute the ban.`)
			.setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
			.setTimestamp();

		const selectMenu = new StringSelectMenuBuilder()
			.setCustomId('ban_delete_history')
			.setPlaceholder('Choose message deletion history...')
			.addOptions([
				{ label: 'Don\'t delete any messages', value: '0', description: 'Keep all messages' },
				{ label: 'Previous 1 hour', value: '3600', description: 'Delete messages from last hour' },
				{ label: 'Previous 6 hours', value: '21600', description: 'Delete messages from last 6 hours' },
				{ label: 'Previous 12 hours', value: '43200', description: 'Delete messages from last 12 hours' },
				{ label: 'Previous 24 hours', value: '86400', description: 'Delete messages from last 24 hours' },
				{ label: 'Previous 3 days', value: '259200', description: 'Delete messages from last 3 days' },
				{ label: 'Previous 7 days', value: '604800', description: 'Delete messages from last 7 days' },
				{ label: '❌ Cancel Ban', value: 'cancel', description: 'Abort ban process' }
			]);

		const row = new ActionRowBuilder().addComponents(selectMenu);

		const response = await interaction.reply({
			embeds: [confirmEmbed],
			components: [row],
			withResponse: true
		});

		const collector = response.createMessageComponentCollector({
			componentType: ComponentType.StringSelect,
			time: 30000
		});

		let resolved = false;

		collector.on('collect', async i => {
			if (i.user.id !== interaction.user.id) {
				return i.reply({ content: '❌ Only the moderator who ran this command can choose options.', ephemeral: true });
			}

			resolved = true;
			const selection = i.values[0];

			if (selection === 'cancel') {
				await i.update({
					content: '❌ Ban process has been cancelled.',
					embeds: [],
					components: []
				});
				collector.stop();
				return;
			}

			const deleteSeconds = parseInt(selection);

			// Try DM before banning
			try {
				await targetUser.send(`🔨 You have been **banned** from **${interaction.guild.name}**.\nReason: ${reason}`);
			} catch (err) {
				console.log(`Couldn't DM ${targetUser.tag}`);
			}

			await interaction.guild.members.ban(targetUser.id, {
				deleteMessageSeconds: deleteSeconds,
				reason: reason
			});

			const optionLabels = {
				'0': 'Don\'t delete any messages',
				'3600': 'Previous 1 hour',
				'21600': 'Previous 6 hours',
				'43200': 'Previous 12 hours',
				'86400': 'Previous 24 hours',
				'259200': 'Previous 3 days',
				'604800': 'Previous 7 days'
			};

			const successEmbed = new EmbedBuilder()
				.setTitle('👢 Member Banned')
				.setColor(0xff3c38)
				.addFields(
					{ name: 'User', value: `${targetUser.tag} (<@${targetUser.id}>)`, inline: true },
					{ name: 'By', value: `${interaction.user.tag}`, inline: true },
					{ name: 'Message Deletion', value: `\`${optionLabels[selection]}\``, inline: true },
					{ name: 'Reason', value: reason }
				)
				.setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
				.setTimestamp();

			await i.update({
				embeds: [successEmbed],
				components: []
			});

			collector.stop();
		});

		collector.on('end', async (_, reason) => {
			if (!resolved) {
				await interaction.editReply({
					content: '⚠️ Ban process timed out.',
					embeds: [],
					components: []
				}).catch(() => {});
			}
		});
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

		const confirmEmbed = new EmbedBuilder()
			.setTitle('🔨 Ban Confirmation')
			.setColor(0xF39C12)
			.setDescription(`Are you sure you want to ban **${user.tag}**?\nReason: \`${reason}\`\n\nChoose the message deletion history duration below. Selecting an option will execute the ban.`)
			.setThumbnail(user.displayAvatarURL({ dynamic: true }))
			.setTimestamp();

		const selectMenu = new StringSelectMenuBuilder()
			.setCustomId('ban_delete_history')
			.setPlaceholder('Choose message deletion history...')
			.addOptions([
				{ label: 'Don\'t delete any messages', value: '0', description: 'Keep all messages' },
				{ label: 'Previous 1 hour', value: '3600', description: 'Delete messages from last hour' },
				{ label: 'Previous 6 hours', value: '21600', description: 'Delete messages from last 6 hours' },
				{ label: 'Previous 12 hours', value: '43200', description: 'Delete messages from last 12 hours' },
				{ label: 'Previous 24 hours', value: '86400', description: 'Delete messages from last 24 hours' },
				{ label: 'Previous 3 days', value: '259200', description: 'Delete messages from last 3 days' },
				{ label: 'Previous 7 days', value: '604800', description: 'Delete messages from last 7 days' },
				{ label: '❌ Cancel Ban', value: 'cancel', description: 'Abort ban process' }
			]);

		const row = new ActionRowBuilder().addComponents(selectMenu);

		const response = await message.reply({
			embeds: [confirmEmbed],
			components: [row]
		});

		const collector = response.createMessageComponentCollector({
			componentType: ComponentType.StringSelect,
			time: 30000
		});

		let resolved = false;

		collector.on('collect', async i => {
			if (i.user.id !== message.author.id) {
				return i.reply({ content: '❌ Only the moderator who ran this command can choose options.', ephemeral: true });
			}

			resolved = true;
			const selection = i.values[0];

			if (selection === 'cancel') {
				await i.update({
					content: '❌ Ban process has been cancelled.',
					embeds: [],
					components: []
				});
				collector.stop();
				return;
			}

			const deleteSeconds = parseInt(selection);

			// Try DM before banning
			try {
				await user.send(`🔨 You have been **banned** from **${message.guild.name}**.\nReason: ${reason}`);
			} catch (err) {
				console.log(`Couldn't DM ${user.tag}`);
			}

			await message.guild.members.ban(user.id, {
				deleteMessageSeconds: deleteSeconds,
				reason: reason
			});

			const optionLabels = {
				'0': 'Don\'t delete any messages',
				'3600': 'Previous 1 hour',
				'21600': 'Previous 6 hours',
				'43200': 'Previous 12 hours',
				'86400': 'Previous 24 hours',
				'259200': 'Previous 3 days',
				'604800': 'Previous 7 days'
			};

			const successEmbed = new EmbedBuilder()
				.setTitle('👢 Member Banned')
				.setColor(0xff3c38)
				.addFields(
					{ name: 'User', value: `${user.tag} (<@${user.id}>)`, inline: true },
					{ name: 'By', value: `${message.author.tag}`, inline: true },
					{ name: 'Message Deletion', value: `\`${optionLabels[selection]}\``, inline: true },
					{ name: 'Reason', value: reason }
				)
				.setThumbnail(user.displayAvatarURL({ dynamic: true }))
				.setTimestamp();

			await i.update({
				embeds: [successEmbed],
				components: []
			});

			collector.stop();
		});

		collector.on('end', async (_, reason) => {
			if (!resolved) {
				await response.edit({
					content: '⚠️ Ban process timed out.',
					embeds: [],
					components: []
				}).catch(() => {});
			}
		});
	}
};
