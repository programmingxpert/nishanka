/* eslint-disable */
const { SlashCommandBuilder } = require('discord.js');
const { sendAnimeAction } = require('../../utils/sendAnimeAction');

module.exports = {
	category: 'actions',
	data: new SlashCommandBuilder()
		.setName('shrug')
		.setDescription('¯\\_(ツ)_/¯ Shrug it off!')
		.addStringOption(option =>
			option.setName('message')
				.setDescription('An optional message to send with your shrug.')),

	async execute(context) {
		const customMsg = context.options?.getString?.('message') || context.args?.slice(1).join(' ');
		if (context.deferReply) await context.deferReply();

		await sendAnimeAction({
			interaction: context.deferReply ? context : null,
			message: context.message || null,
			targetUser: context.user || context.author,
			customMsg,
			actionType: 'shrug',
			emoji: '🤷',
			color: 0x95a5a6 // Example: Gray
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

