/* eslint-disable */
const { SlashCommandBuilder } = require('discord.js');
const { sendAnimeAction } = require('../../utils/sendAnimeAction');

module.exports = {
	category: 'actions',
	data: new SlashCommandBuilder()
		.setName('wave')
		.setDescription('wave someone through the screen!')
		.addUserOption(option =>
			option.setName('user')
				.setDescription('The user you want to wave')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('message')
				.setDescription('An optional message to send with your wave')),

	// Supports both slash and prefix via fakeInteraction.js
	async execute(context) {
		const user = context.options?.getUser?.('user') || context.mentions?.users.first();
		const customMsg = context.options?.getString?.('message') || context.args?.slice(1).join(' ');

		if (!user) return context.reply('❗ Please mention a user to wave.');

		// If slash, defer the reply
		if (context.deferReply) await context.deferReply();

		await sendAnimeAction({
			interaction: context.deferReply ? context : null, // If slash, pass interaction
			message: context.message || null,                 // If prefix, pass message
			targetUser: user,
			customMsg,
			actionType: 'wave',
			emoji: '👋',
			color: 0xffaad4
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


