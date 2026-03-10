/* eslint-disable */
const { SlashCommandBuilder } = require('discord.js');
const { sendAnimeAction } = require('../../utils/sendAnimeAction');

module.exports = {
	category: 'fun',
	data: new SlashCommandBuilder()
		.setName('cuddle')
		.setDescription('Cuddle a user :3')
		.addUserOption(option =>
			option.setName('user')
				.setDescription('The user you want to cuddle with')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('message')
				.setDescription('An optional message to send with your cuddle')),

	// Supports both slash and prefix via fakeInteraction.js
	async execute(context) {
		const user = context.options?.getUser?.('user') || context.mentions?.users.first();
		const customMsg = context.options?.getString?.('message') || context.args?.slice(1).join(' ');
			const reply = (msg) => context.reply ? context.reply(msg) : context.message.reply(msg);
			const selfResponses = ["Aww, let me do that for you! *But you still need to mention someone else...*","Doing that to yourself? How lonely... Mention someone!","I'm here for you! But seriously, mention another user for this command.","You can't target yourself, silly! Mention a friend!","Hold on there, you need another person for this to work right. Mention them!"];
			const randomResponse = selfResponses[Math.floor(Math.random() * selfResponses.length)];
			if (!user) return reply('❗ Please mention a user to cuddle.');
			if (user.id === (context.user?.id || context.author?.id)) return reply(randomResponse);

		// If slash, defer the reply
		if (context.deferReply) await context.deferReply();

		await sendAnimeAction({
			interaction: context.deferReply ? context : null, // If slash, pass interaction
			message: context.message || null,                 // If prefix, pass message
			targetUser: user,
			customMsg,
			actionType: 'cuddle',
			emoji: '🤗🫂',
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


