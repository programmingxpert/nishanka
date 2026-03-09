/* eslint-disable */
const { SlashCommandBuilder } = require('discord.js');
const { sendAnimeAction } = require('../../utils/sendAnimeAction');

module.exports = {
	category: 'actions',
	data: new SlashCommandBuilder()
		.setName('lurk')
		.setDescription('Lurk and observe... (you\'re lurking!)')
		.addStringOption(option =>
			option.setName('message')
				.setDescription('An optional message to send with your lurk')),

	// Supports both slash and prefix via fakeInteraction.js
	async execute(context) {
		const customMsg = context.options?.getString?.('message') || context.args?.slice(1).join(' ');

		// If slash, defer the reply
		if (context.deferReply) await context.deferReply();

		await sendAnimeAction({
			interaction: context.deferReply ? context : null, // If slash, pass interaction
			message: context.message || null,                 // If prefix, pass message
			targetUser: context.user || context.author, //The lurker themselves
			customMsg,
			actionType: 'lurk',
			emoji: '👀',
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

