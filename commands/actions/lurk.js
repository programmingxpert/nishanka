/* eslint-disable */
const { SlashCommandBuilder } = require('discord.js');
const { sendAnimeAction } = require('../../utils/sendAnimeAction');

module.exports = {
	category: 'actions',
	data: new SlashCommandBuilder()
		.setName('lurk')
		.addUserOption(option =>
			option.setName('user')
				.setDescription('Optional user to target'))
		.setDescription('Lurk and observe... (you\'re lurking!)')
		.addStringOption(option =>
			option.setName('message')
				.setDescription('An optional message to send with your lurk')),

	// Supports both slash and prefix via fakeInteraction.js
	async execute(context) {
		const user = context.options?.getUser?.('user') || context.mentions?.users.first();
		const customMsg = context.options?.getString?.('message') || context.args?.slice(1).join(' ');
			const reply = (msg) => context.reply ? context.reply(msg) : context.message.reply(msg);

		// If slash, defer the reply
		if (context.deferReply) await context.deferReply();

		await sendAnimeAction({
			interaction: context.deferReply ? context : null, // If slash, pass interaction
			message: context.message || null,                 // If prefix, pass message
			targetUser: user || context.user || context.author, //The lurker themselves
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
				getString: () => {
					// If the first argument is a mention, omit it from the custom message
					if (args[0] && args[0].match(/^<@!?\d+>$/)) {
						return args.slice(1).join(' ');
					}
					return args.join(' ');
				}
			}
		});
	}
};

