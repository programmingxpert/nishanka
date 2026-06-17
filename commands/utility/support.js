const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const PremiumUser = require('../../models/premiumUserSchema');
const config = require('../../config.json');

const SUPPORT_URL = 'https://nishanka.zeyuki.app/support';
const DISCORD_INVITE = 'https://discord.gg/tkPfDP4n7D';

module.exports = {
	category: 'utility',
	cooldown: 5,
	data: new SlashCommandBuilder()
		.setName('support')
		.setDescription('Support Nishankabot via financial funding or by providing feedback!'),
	async execute(interaction) {
		let totalSupporters = 0;
		try {
			totalSupporters = await PremiumUser.countDocuments({
				userId: { $ne: config.devId }
			});
		} catch (err) {
			console.error('[Support Command] Error counting supporters:', err);
		}

		const embed = new EmbedBuilder()
			.setColor(0x7c6cf0)
			.setTitle('💖 support nishanka')
			.setDescription('nishanka is a community-driven project! you can support the development and hosting of the bot in two main ways:\n\n*it genuinely helps me so much and means a lot to me* — yuki')
			.addFields(
				{ 
					name: '🪙 financial support', 
					value: 'help fund our server hosting, database, domain, and API costs. we accept any custom amount starting from **₹50 / $0.99 USD**. payments can be made via **Razorpay** (preferred for India) or **PayPal** (for international supporters).\n\n👉 **to donate, visit:** [nishanka.zeyuki.app/support](' + SUPPORT_URL + ')' 
				},
				{ 
					name: '💬 suggestions & feedback', 
					value: 'have ideas, suggestions, bug reports, or feature requests? join our official Discord server and ping/tag the developer **@zeyuki** directly in the support channel! we love listening to user feedback.' 
				},
				{
					name: '💎 current supporters',
					value: `we currently have **[${totalSupporters}](https://nishanka.zeyuki.app/supporters)** active supporter(s) (excluding yuki). check out the [supporter list](https://nishanka.zeyuki.app/supporters) to see who keeps me running!`
				}
			)
			.setThumbnail(interaction.client.user.displayAvatarURL({ extension: 'png', size: 256 }))
			.setFooter({ text: 'thank you for keeping nishanka alive and thriving!' })
			.setTimestamp();

		const donateButton = new ButtonBuilder()
			.setLabel('financial support')
			.setURL(SUPPORT_URL)
			.setStyle(ButtonStyle.Link)
			.setEmoji('💳');

		const discordButton = new ButtonBuilder()
			.setLabel('join Discord')
			.setURL(DISCORD_INVITE)
			.setStyle(ButtonStyle.Link)
			.setEmoji('💬');

		const row = new ActionRowBuilder().addComponents(donateButton, discordButton);

		await interaction.reply({ embeds: [embed], components: [row] });
	},

	async executePrefix(message) {
		let totalSupporters = 0;
		try {
			totalSupporters = await PremiumUser.countDocuments({
				userId: { $ne: config.devId }
			});
		} catch (err) {
			console.error('[Support Command] Error counting supporters:', err);
		}

		const embed = new EmbedBuilder()
			.setColor(0x7c6cf0)
			.setTitle('💖 support nishanka')
			.setDescription('nishanka is a community-driven project! you can support the development and hosting of the bot in two main ways:\n\n*it genuinely helps me so much and means a lot to me* — yuki')
			.addFields(
				{ 
					name: '🪙 financial support', 
					value: 'help fund our server hosting, database, domain, and API costs. we accept any custom amount starting from **₹50 / $0.99 USD**. payments can be made via **Razorpay** (preferred for India) or **PayPal** (for international supporters).\n\n👉 **to donate, visit:** [nishanka.zeyuki.app/support](' + SUPPORT_URL + ')' 
				},
				{ 
					name: '💬 suggestions & feedback', 
					value: 'have ideas, suggestions, bug reports, or feature requests? join our official Discord server and ping/tag the developer **@zeyuki** directly in the support channel! we love listening to user feedback.' 
				},
				{
					name: '💎 current supporters',
					value: `we currently have **[${totalSupporters}](https://nishanka.zeyuki.app/supporters)** active supporter(s) (excluding yuki). check out the [supporter list](https://nishanka.zeyuki.app/supporters) to see who keeps me running!`
				}
			)
			.setThumbnail(message.client.user.displayAvatarURL({ extension: 'png', size: 256 }))
			.setFooter({ text: 'thank you for keeping nishanka alive and thriving!' })
			.setTimestamp();

		const donateButton = new ButtonBuilder()
			.setLabel('financial support')
			.setURL(SUPPORT_URL)
			.setStyle(ButtonStyle.Link)
			.setEmoji('💳');

		const discordButton = new ButtonBuilder()
			.setLabel('join Discord')
			.setURL(DISCORD_INVITE)
			.setStyle(ButtonStyle.Link)
			.setEmoji('💬');

		const row = new ActionRowBuilder().addComponents(donateButton, discordButton);

		await message.reply({ embeds: [embed], components: [row] });
	}
};
