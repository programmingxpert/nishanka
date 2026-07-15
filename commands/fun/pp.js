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

		// Calculate a random size between 0 and 200
		const size = Math.floor(Math.random() * 201);
		const shaft = '='.repeat(size);
		const pp = `8${shaft}D`;

		let commentary = '';
		if (size <= 2) {
			commentary = `${pp}\n\n...Oh. Bestie, I am so sorry. Is that a peanut? 🥜💀`;
		} else if (size <= 5) {
			commentary = `${pp}\n\nNot the smallest, but let's be real, you're not bragging about this to anyone. 🤏`;
		} else if (size <= 9) {
			commentary = `${pp}\n\nPerfectly average. Like a lukewarm cup of water. It exists. 🤷‍♀️`;
		} else if (size <= 12) {
			commentary = `${pp}\n\nOkay, hold on! You actually got blessed by the RNG gods today. Respect. 😳`;
		} else {
			commentary = `${pp}\n\nSir, this is a Discord server, please put that weapon away. 🚨🍆`;
		}

		const embed = new EmbedBuilder()
			.setColor(0xff69b4)
			.setTitle(`📏 Nishanka's PP Measurer`)
			.setDescription(`Measuring ${target}...\n\n${commentary}`)
			.setFooter({ text: 'Validated by the Federal Measurement Bureau' });

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
