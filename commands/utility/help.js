/* eslint-disable */
const {
	ActionRowBuilder,
	StringSelectMenuBuilder,
	EmbedBuilder,
	SlashCommandBuilder,
	ComponentType,
} = require('discord.js');
const config = require('../../config.json');

module.exports = {
	category: 'utility',
	data: new SlashCommandBuilder()
		.setName('help')
		.setDescription('Displays all commands grouped by category.'),

	async execute(context) {
		const commands = context.client.commands;
		const grouped = {};
		const isOwner = context.user?.id === config.devId;

		// Group commands by category
		for (const [, cmd] of commands) {
			if (cmd.hidden && !isOwner) continue;

			const category = cmd.category || 'Uncategorized';
			if (!grouped[category]) grouped[category] = [];
			const showDescription = category !== 'actions';
			const nameLine = showDescription
				? `\`${cmd.data.name}\` - ${cmd.data.description}`
				: `\`${cmd.data.name}\``;

			grouped[category].push(nameLine);
		}

		const categories = Object.keys(grouped);

		const embed = new EmbedBuilder()
			.setTitle('📘 Help Menu')
			.setDescription('Select a category from the dropdown to see commands.')
			.setColor(0x1abc9c)
			.setFooter({ text: 'Use /help or -help | Nishanka ©️' });

		const selectMenu = new StringSelectMenuBuilder()
			.setCustomId('help-category-select')
			.setPlaceholder('📂 Choose a category')
			.addOptions(
				categories.map((cat) => ({
					label: cat.charAt(0).toUpperCase() + cat.slice(1),
					value: cat,
				}))
			);

		const row = new ActionRowBuilder().addComponents(selectMenu);

		const reply = await context.reply({
			embeds: [embed],
			components: [row],
			ephemeral: context.isPrefix ? false : true,
		});

		// Create a collector to listen to the dropdown selection
		const collector = reply.createMessageComponentCollector({
			componentType: ComponentType.StringSelect,
			time: 300000, // 5 minutes
		});

		collector.on('collect', async (interaction) => {
			try {
				await interaction.deferUpdate(); // inside try so expired interactions don't crash

				const selected = interaction.values[0];
				const cmds = grouped[selected];

				const showDescriptions = selected !== 'actions';
				const content = showDescriptions
					? cmds.join('\n')
					: cmds.join(' '); // inline for actions

				const selectedEmbed = new EmbedBuilder()
					.setTitle(`📂 ${selected} Commands`)
					.setDescription(content || 'No commands found.')
					.setColor(0x3498db)
					.setFooter({ text: 'Use /help or -help | Nishanka ©️' });


				await interaction.editReply({ // Use editReply for all updates AFTER deferUpdate
					embeds: [selectedEmbed],
					components: [row],
				});

			} catch (error) {
				if (error.code === 10062) {
					// Interaction expired — silently ignore, don't crash
					return;
				}
				console.error("Error updating help message:", error);
				await interaction.followUp({ content: "❌ An error occurred while updating the help message.", ephemeral: true }).catch(() => {});
			}
		});

		collector.on('end', (collected, reason) => {
			if (reply.edit) {
				if (reason === 'time') { //Interaction timeout
					const embed = new EmbedBuilder()
						.setTitle('📘 Help Menu')
						.setDescription('This help menu has expired due to inactivity. Run the command again to use it.')
						.setColor(0x95a5a6)
						.setFooter({ text: 'Use /help or -help | Nishanka ©️' });

					reply.edit({ embeds: [embed], components: [] }).catch(console.error);
				} else {
					reply.edit({ components: [] }).catch(console.error);
				}
			}
		});
	},

	async executePrefix(message) {
		await module.exports.execute({
			client: message.client,
			user: message.author,
			member: message.member,
			channel: message.channel,
			reply: (...args) => message.channel.send(...args),
			isPrefix: true,
		});
	},
};