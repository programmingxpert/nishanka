/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const INVITE_LINK = 'https://discord.com/api/oauth2/authorize?client_id=1357752347643609198&permissions=8&scope=bot%20applications.commands';

module.exports = {
	category: 'utility',
	cooldown: 5,
	data: new SlashCommandBuilder()
		.setName('invite')
		.setDescription('Sends the official invite link for Nishanka bot.'),
	async execute(interaction) {
		const embed = new EmbedBuilder()
			.setColor(0x7c6cf0)
			.setTitle('✉️ Invite Nishanka')
			.setDescription('Supercharge your server with custom AI adventures, level system, and modular triggers!')
			.addFields(
				{ name: '🌐 Web Dashboard', value: '[nishanka.zeyuki.app](https://nishanka.zeyuki.app)', inline: true },
				{ name: '✨ Premium Perks', value: '[Get Premium](https://nishanka.zeyuki.app/premium)', inline: true }
			)
			.setThumbnail(interaction.client.user.displayAvatarURL({ extension: 'png', size: 256 }))
			.setFooter({ text: 'Thank you for supporting Nishanka!' })
			.setTimestamp();

		const inviteButton = new ButtonBuilder()
			.setLabel('Invite Bot')
			.setURL(INVITE_LINK)
			.setStyle(ButtonStyle.Link)
			.setEmoji('🤖');

		const shopButton = new ButtonBuilder()
			.setLabel('Premium Shop')
			.setURL('https://nishanka.zeyuki.app/premium')
			.setStyle(ButtonStyle.Link)
			.setEmoji('✨');

		const row = new ActionRowBuilder().addComponents(inviteButton, shopButton);

		await interaction.reply({ embeds: [embed], components: [row] });
	},

	async executePrefix(message) {
		const embed = new EmbedBuilder()
			.setColor(0x7c6cf0)
			.setTitle('✉️ Invite Nishanka')
			.setDescription('Supercharge your server with custom AI adventures, level system, and modular triggers!')
			.addFields(
				{ name: '🌐 Web Dashboard', value: '[nishanka.zeyuki.app](https://nishanka.zeyuki.app)', inline: true },
				{ name: '✨ Premium Perks', value: '[Get Premium](https://nishanka.zeyuki.app/premium)', inline: true }
			)
			.setThumbnail(message.client.user.displayAvatarURL({ extension: 'png', size: 256 }))
			.setFooter({ text: 'Thank you for supporting Nishanka!' })
			.setTimestamp();

		const inviteButton = new ButtonBuilder()
			.setLabel('Invite Bot')
			.setURL(INVITE_LINK)
			.setStyle(ButtonStyle.Link)
			.setEmoji('🤖');

		const shopButton = new ButtonBuilder()
			.setLabel('Premium Shop')
			.setURL('https://nishanka.zeyuki.app/premium')
			.setStyle(ButtonStyle.Link)
			.setEmoji('✨');

		const row = new ActionRowBuilder().addComponents(inviteButton, shopButton);

		await message.reply({ embeds: [embed], components: [row] });
	}
};
