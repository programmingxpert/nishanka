/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
	category: 'utility',
	cooldown: 10,
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Shows the bot and API latency.'),
	async execute(interaction) {
		// For slash command
		const sent = await interaction.reply({ content: 'Yokoso! 🌀', fetchReply: true });

		const embed = new EmbedBuilder()
			.setColor(0x2f3136)
			.setTitle('🏓 Pong Report')
			.setDescription('Here’s the latency snapshot.')
			.addFields(
				{ name: '📡 Bot Latency', value: `${sent.createdTimestamp - interaction.createdTimestamp}ms`, inline: true },
				{ name: '🧠 API Latency', value: `${interaction.client.ws.ping}ms`, inline: true }
			)
			.setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.member?.displayAvatarURL({ dynamic: true }) || interaction.user.displayAvatarURL({ dynamic: true }) })
			.setTimestamp();

		await interaction.editReply({ content: '', embeds: [embed] });
	},

	async executePrefix(message) {
		const sent = await message.channel.send('HAII YOKOSO!');

		const embed = new EmbedBuilder()
			.setColor(0x2f3136)
			.setTitle('🏓 Pong Report')
			.setDescription('Here’s the latency snapshot.')
			.addFields(
				{ name: '📡 Bot Latency', value: `${sent.createdTimestamp - message.createdTimestamp}ms`, inline: true },
				{ name: '🧠 API Latency', value: `${message.client.ws.ping}ms`, inline: true }
			)
			.setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.member?.displayAvatarURL({ dynamic: true }) || message.author.displayAvatarURL({ dynamic: true }) })
			.setTimestamp();

		await sent.edit({ content: '', embeds: [embed] });
	}
};
