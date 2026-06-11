/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
	category: 'fun',
	data: new SlashCommandBuilder()
		.setName('gayrate')
		.setDescription('Calculates how gay someone is.')
		.addUserOption(option =>
			option.setName('target')
				.setDescription('The user to rate')
				.setRequired(false)
		),

	async execute(context) {
		const target = context.options?.getUser('target') 
            || context.mentions?.users.first() 
            || context.user 
            || context.author;

		const rate = Math.floor(Math.random() * 101);

		let commentary = '';
		if (rate === 0) {
			commentary = "Wait... 0%? You're literally straighter than a ruler. I don't buy it, run it again. 🤨";
		} else if (rate <= 25) {
			commentary = `Only **${rate}%** gay. That's kinda basic, not gonna lie. 🥱`;
		} else if (rate <= 50) {
			commentary = `**${rate}%** gay. Kinda fruity, like a Capri Sun. I vibe with it. 🧃`;
		} else if (rate <= 75) {
			commentary = `**${rate}%** gay! You definitely listen to Lady Gaga or K-pop, there is no way you don't. 💅`;
		} else if (rate <= 99) {
			commentary = `**${rate}%** gay! Bestie, you are practically radiating rainbow energy at this point. 🌈✨`;
		} else {
			commentary = `**100% GAY!** The gaydar just exploded. Absolute legend behavior. 👑🏳️‍🌈`;
		}

		const embed = new EmbedBuilder()
			.setColor(0xffc0cb)
			.setTitle(`🏳️‍🌈 Nishanka's Gaydar`)
			.setDescription(`Checking ${target}...\n\n${commentary}`)
			.setFooter({ text: '100% scientifically accurate, trust me.' });

		if (context.reply) {
			await context.reply({ embeds: [embed] });
		} else {
			await context.channel.send({ embeds: [embed] });
		}
	},

	async executePrefix(message, args) {
		await this.execute({
			client: message.client,
			user: message.author,
			author: message.author,
			member: message.member,
			channel: message.channel,
			message: message,
			args: args,
			options: {
				getUser: () => message.mentions.users.first(),
			}
		});
	}
};
