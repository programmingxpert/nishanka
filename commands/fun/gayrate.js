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

		const embed = new EmbedBuilder()
			.setColor(0xffc0cb)
			.setTitle(`🏳️‍🌈 Gay Rate Machine`)
			.setDescription(`${target} is **${rate}%** gay! 🌈`)
			.setFooter({ text: '100% scientifically accurate' });

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
