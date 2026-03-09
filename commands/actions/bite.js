/* eslint-disable */
const { SlashCommandBuilder } = require('discord.js');
const { sendAnimeAction } = require('../../utils/sendAnimeAction');

module.exports = {
	category: 'fun',
	data: new SlashCommandBuilder()
		.setName('bite')
		.setDescription('bite a user')
		.addUserOption(option =>
			option.setName('user')
				.setDescription('The user you want to bite')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('message')
				.setDescription('An optional message to send with your bite')),

	// Supports both slash and prefix via fakeInteraction.js
	async execute(context) {
		const user = context.options?.getUser?.('user') || context.mentions?.users.first();
		const customMsg = context.options?.getString?.('message') || context.args?.slice(1).join(' ');

		if (!user) return context.reply('❗ Please mention a user to bite.');

		// If slash, defer the reply
		if (context.deferReply) await context.deferReply();

		await sendAnimeAction({
			interaction: context.deferReply ? context : null, // If slash, pass interaction
			message: context.message || null,                 // If prefix, pass message
			targetUser: user,
			customMsg,
			actionType: 'bite',
			emoji: '🐶',
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


