/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
	category: 'fun',
	data: new SlashCommandBuilder()
		.setName('pp')
		.setDescription('Measures your PP size or someone else\'s.')
		.addUserOption(option =>
			option.setName('target')
				.setDescription('The user you want to measure')
				.setRequired(false)
		),

	async execute(context) {
		const target = context.options?.getUser('target') 
            || context.mentions?.users.first() 
            || context.user 
            || context.author;

		// Calculate a random size between 0 and 15
		// For fun, the bot owner could always be 15, but we'll stick to random per execution
		const size = Math.floor(Math.random() * 16);
		const shaft = '='.repeat(size);
		const pp = `8${shaft}D`;

		const embed = new EmbedBuilder()
			.setColor(0xff69b4)
			.setTitle(`${target.displayName}'s PP Size`)
			.setDescription(pp)
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
