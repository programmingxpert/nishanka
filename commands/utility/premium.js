const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
	category: 'utility',
	cooldown: 5,
	data: new SlashCommandBuilder()
		.setName('premium')
		.setDescription('View the premium tiers, benefits, and how to purchase!'),
	async execute(interaction) {
		const embed = new EmbedBuilder()
			.setColor(0x7c6cf0)
			.setTitle('✨ nishanka premium')
			.setDescription('supercharge your server and unlock full access to all features by upgrading to a premium plan!')
			.addFields(
				{
					name: '⚡ daily ai power (apu)',
					value: '• **free tier**: **20 apu** daily limit\n• **lite tier**: **500 apu** daily limit\n• **pro tier**: **1,500 apu** daily limit\n• **network tier**: **5,000 apu** daily limit',
					inline: false
				},
				{
					name: '⏱️ dynamic ai cooldowns',
					value: '• **free tier**: **60 seconds** cooldown\n• **lite tier**: **30 seconds** cooldown\n• **pro tier**: **10 seconds** cooldown\n• **network tier**: **5 seconds** cooldown',
					inline: false
				},
				{
					name: '🎨 visual personalization',
					value: 'customize your profile backgrounds, bio details, and showcase titles directly on our clean web dashboard!',
					inline: false
				},
				{
					name: '⚙️ advanced server configuration',
					value: 'configure logging categories, welcome/leave cards, custom triggers, and auto-roles visually on the web.',
					inline: false
				},
				{
					name: '💳 how to buy / upgrade',
					value: 'visit our official shop page to choose a tier. support starts from **₹50 / $0.99 USD**!\n\n👉 **upgrade here:** [nishanka.zeyuki.app/premium](https://nishanka.zeyuki.app/premium)',
					inline: false
				}
			)
			.setThumbnail(interaction.client.user.displayAvatarURL({ extension: 'png', size: 256 }))
			.setFooter({ text: 'thank you for supporting the development of nishanka!' })
			.setTimestamp();

		const shopBtn = new ButtonBuilder()
			.setLabel('premium shop')
			.setURL('https://nishanka.zeyuki.app/premium')
			.setStyle(ButtonStyle.Link)
			.setEmoji('💳');

		const dashboardBtn = new ButtonBuilder()
			.setLabel('web dashboard')
			.setURL('https://nishanka.zeyuki.app/')
			.setStyle(ButtonStyle.Link)
			.setEmoji('🌐');

		const supportBtn = new ButtonBuilder()
			.setLabel('support server')
			.setURL('https://discord.gg/tkPfDP4n7D')
			.setStyle(ButtonStyle.Link)
			.setEmoji('💬');

		const row = new ActionRowBuilder().addComponents(shopBtn, dashboardBtn, supportBtn);

		await interaction.reply({ embeds: [embed], components: [row] });
	},

	async executePrefix(message) {
		const embed = new EmbedBuilder()
			.setColor(0x7c6cf0)
			.setTitle('✨ nishanka premium')
			.setDescription('supercharge your server and unlock full access to all features by upgrading to a premium plan!')
			.addFields(
				{
					name: '⚡ daily ai power (apu)',
					value: '• **free tier**: **20 apu** daily limit\n• **lite tier**: **500 apu** daily limit\n• **pro tier**: **1,500 apu** daily limit\n• **network tier**: **5,000 apu** daily limit',
					inline: false
				},
				{
					name: '⏱️ dynamic ai cooldowns',
					value: '• **free tier**: **60 seconds** cooldown\n• **lite tier**: **30 seconds** cooldown\n• **pro tier**: **10 seconds** cooldown\n• **network tier**: **5 seconds** cooldown',
					inline: false
				},
				{
					name: '🎨 visual personalization',
					value: 'customize your profile backgrounds, bio details, and showcase titles directly on our clean web dashboard!',
					inline: false
				},
				{
					name: '⚙️ advanced server configuration',
					value: 'configure logging categories, welcome/leave cards, custom triggers, and auto-roles visually on the web.',
					inline: false
				},
				{
					name: '💳 how to buy / upgrade',
					value: 'visit our official shop page to choose a tier. support starts from **₹50 / $0.99 USD**!\n\n👉 **upgrade here:** [nishanka.zeyuki.app/premium](https://nishanka.zeyuki.app/premium)',
					inline: false
				}
			)
			.setThumbnail(message.client.user.displayAvatarURL({ extension: 'png', size: 256 }))
			.setFooter({ text: 'thank you for supporting the development of nishanka!' })
			.setTimestamp();

		const shopBtn = new ButtonBuilder()
			.setLabel('premium shop')
			.setURL('https://nishanka.zeyuki.app/premium')
			.setStyle(ButtonStyle.Link)
			.setEmoji('💳');

		const dashboardBtn = new ButtonBuilder()
			.setLabel('web dashboard')
			.setURL('https://nishanka.zeyuki.app/')
			.setStyle(ButtonStyle.Link)
			.setEmoji('🌐');

		const supportBtn = new ButtonBuilder()
			.setLabel('support server')
			.setURL('https://discord.gg/tkPfDP4n7D')
			.setStyle(ButtonStyle.Link)
			.setEmoji('💬');

		const row = new ActionRowBuilder().addComponents(shopBtn, dashboardBtn, supportBtn);

		await message.reply({ embeds: [embed], components: [row] });
	}
};
