/* eslint-disable */
// commands/actions/cry.js
const { SlashCommandBuilder } = require('discord.js');
const { sendAnimeAction } = require('../../utils/sendAnimeAction');

module.exports = {
	category: 'actions',
	data: new SlashCommandBuilder()
		.setName('cry')
		.setDescription('Cry...')
		.addUserOption(option =>
			option.setName('user')
				.setDescription('The user to cry at (optional)'))
		.addStringOption(option =>
			option.setName('message')
				.setDescription('An optional message to send with your crying.')),

	async execute(context) {
		const user = context.options?.getUser?.('user');
		const customMsg = context.options?.getString?.('message') || context.args?.slice(1).join(' ');
			const reply = (msg) => context.reply ? context.reply(msg) : context.message.reply(msg);
		const targetUser = user || context.user || context.author;

		if (context.deferReply) await context.deferReply();

		await sendAnimeAction({
			interaction: context.deferReply ? context : null,
			message: context.message || null,
			targetUser: targetUser,
			actingUser: context.user || context.author,
			customMsg,
			actionType: 'cry',
			emoji: '😭',
			color: 0x00bcd4 // Example: Cyan
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

