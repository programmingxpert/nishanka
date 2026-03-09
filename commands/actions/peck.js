/* eslint-disable */
// commands/actions/peck.js
const { SlashCommandBuilder } = require('discord.js');
const { sendAnimeAction } = require('../../utils/sendAnimeAction');

module.exports = {
	category: 'actions',
	data: new SlashCommandBuilder()
		.setName('peck')
		.setDescription('Peck another user!')
		.addUserOption(option =>
			option.setName('user')
				.setDescription('The user to peck')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('message')
				.setDescription('An optional message to send with your peck.')),

	async execute(context) {
		const user = context.options?.getUser?.('user') || context.mentions?.users.first();
		const customMsg = context.options?.getString?.('message') || context.args?.slice(1).join(' ');

		if (!user) return context.reply('❗ Please mention a user to peck.');

		if (context.deferReply) await context.deferReply();

		await sendAnimeAction({
			interaction: context.deferReply ? context : null,
			message: context.message || null,
			targetUser: user,
			actingUser: context.user || context.author, // Add acting user
			customMsg,
			actionType: 'peck',
			emoji: '😘',
			color: 0xff69b4 // Example: Pink
		});
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
				getString: () => args.join(' ')
			}
		});
	}
};

