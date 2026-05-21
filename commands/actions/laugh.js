/* eslint-disable */
// commands/actions/laugh.js
const { SlashCommandBuilder } = require('discord.js');
const { sendAnimeAction } = require('../../utils/sendAnimeAction');

module.exports = {
	category: 'actions',
	data: new SlashCommandBuilder()
		.setName('laugh')
		.addUserOption(option =>
			option.setName('user')
				.setDescription('Optional user to target'))
		.setDescription('Laughing out Loud!')
		.addStringOption(option =>
			option.setName('message')
				.setDescription('An optional message to send with your action of laughing.')),

	async execute(context) {
		const user = context.options?.getUser?.('user') || context.mentions?.users.first();
		const customMsg = context.options?.getString?.('message') || context.args?.slice(1).join(' ');
			const reply = (msg) => context.reply ? context.reply(msg) : context.message.reply(msg);
		if (context.deferReply) await context.deferReply();

		await sendAnimeAction({
			interaction: context.deferReply ? context : null,
			message: context.message || null,
			targetUser: user || context.user || context.author,
			customMsg,
			actionType: 'laugh',
			emoji: '😂',
			color: 0x9e9d24 // Example: Dark Yellow
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

