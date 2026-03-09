/* eslint-disable */
// commands/actions/smug.js
const { SlashCommandBuilder } = require('discord.js');
const { sendAnimeAction } = require('../../utils/sendAnimeAction');

module.exports = {
	category: 'actions',
	data: new SlashCommandBuilder()
		.setName('smug')
		.setDescription('Smug face.')
		.addStringOption(option =>
			option.setName('message')
				.setDescription('An optional message to send with your smug expression.')),

	async execute(context) {
		const customMsg = context.options?.getString?.('message') || context.args?.slice(1).join(' ');
		if (context.deferReply) await context.deferReply();

		await sendAnimeAction({
			interaction: context.deferReply ? context : null,
			message: context.message || null,
			targetUser: context.user || context.author,
			customMsg,
			actionType: 'smug',
			emoji: '😏',
			color: 0x3498db // Example: Blue
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

