/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const SUPPORT_URL = 'https://nishanka.zeyuki.app/support';
const DISCORD_INVITE = 'https://discord.gg/tkPfDP4n7D';

module.exports = {
	category: 'utility',
	cooldown: 5,
	data: new SlashCommandBuilder()
		.setName('support')
		.setDescription('Support Nishankabot via financial funding or by providing feedback!'),
	async execute(interaction) {
		const embed = new EmbedBuilder()
			.setColor(0x7c6cf0)
			.setTitle('💖 Support Nishanka')
			.setDescription('Nishanka is a community-driven project! You can support the development and hosting of the bot in two main ways:')
			.addFields(
				{ 
					name: '🪙 Financial Support', 
					value: 'Help fund our server hosting, database, domain, and API costs. We accept any custom amount starting from **₹50 / $0.99 USD**. Payments can be made via **Razorpay** (preferred for India) or **PayPal** (for international supporters).\n\n👉 **To donate, visit:** [nishanka.zeyuki.app/support](' + SUPPORT_URL + ')' 
				},
				{ 
					name: '💬 Suggestions & Feedback', 
					value: 'Have ideas, suggestions, bug reports, or feature requests? Join our official Discord server and ping/tag the developer **@zeyuki** directly in the support channel! We love listening to user feedback.' 
				}
			)
			.setThumbnail(interaction.client.user.displayAvatarURL({ extension: 'png', size: 256 }))
			.setFooter({ text: 'Thank you for keeping Nishanka alive and thriving!' })
			.setTimestamp();

		const donateButton = new ButtonBuilder()
			.setLabel('Financial Support')
			.setURL(SUPPORT_URL)
			.setStyle(ButtonStyle.Link)
			.setEmoji('💳');

		const discordButton = new ButtonBuilder()
			.setLabel('Join Discord')
			.setURL(DISCORD_INVITE)
			.setStyle(ButtonStyle.Link)
			.setEmoji('💬');

		const row = new ActionRowBuilder().addComponents(donateButton, discordButton);

		await interaction.reply({ embeds: [embed], components: [row] });
	},

	async executePrefix(message) {
		const embed = new EmbedBuilder()
			.setColor(0x7c6cf0)
			.setTitle('💖 Support Nishanka')
			.setDescription('Nishanka is a community-driven project! You can support the development and hosting of the bot in two main ways:')
			.addFields(
				{ 
					name: '🪙 Financial Support', 
					value: 'Help fund our server hosting, database, domain, and API costs. We accept any custom amount starting from **₹50 / $0.99 USD**. Payments can be made via **Razorpay** (preferred for India) or **PayPal** (for international supporters).\n\n👉 **To donate, visit:** [nishanka.zeyuki.app/support](' + SUPPORT_URL + ')' 
				},
				{ 
					name: '💬 Suggestions & Feedback', 
					value: 'Have ideas, suggestions, bug reports, or feature requests? Join our official Discord server and ping/tag the developer **@zeyuki** directly in the support channel! We love listening to user feedback.' 
				}
			)
			.setThumbnail(message.client.user.displayAvatarURL({ extension: 'png', size: 256 }))
			.setFooter({ text: 'Thank you for keeping Nishanka alive and thriving!' })
			.setTimestamp();

		const donateButton = new ButtonBuilder()
			.setLabel('Financial Support')
			.setURL(SUPPORT_URL)
			.setStyle(ButtonStyle.Link)
			.setEmoji('💳');

		const discordButton = new ButtonBuilder()
			.setLabel('Join Discord')
			.setURL(DISCORD_INVITE)
			.setStyle(ButtonStyle.Link)
			.setEmoji('💬');

		const row = new ActionRowBuilder().addComponents(donateButton, discordButton);

		await message.reply({ embeds: [embed], components: [row] });
	}
};
