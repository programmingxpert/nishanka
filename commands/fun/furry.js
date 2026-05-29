/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
	category: 'fun',
	data: new SlashCommandBuilder()
		.setName('furry')
		.setDescription('Determines how furry a user is.')
		.addUserOption(option =>
			option.setName('target')
				.setDescription('The user to check')
				.setRequired(false)
		),

	async execute(context) {
		const target = context.options?.getUser('target') 
            || context.mentions?.users.first() 
            || context.user 
            || context.author;

		const rate = Math.floor(Math.random() * 101);
		
		let emoji = '🐺';
		if (rate < 20) emoji = '🧑';
		else if (rate < 50) emoji = '😼';
		else if (rate < 80) emoji = '🐾';
		else emoji = '🦊';

		const embed = new EmbedBuilder()
			.setColor(0xe67e22)
			.setTitle(`🐾 Furry Detector`)
			.setDescription(`${target} is **${rate}%** furry! ${emoji}`)
			.setFooter({ text: 'The scanner never lies.' });

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
