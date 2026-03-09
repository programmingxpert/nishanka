/* eslint-disable */
// commands/actions/nom.js
const { SlashCommandBuilder } = require('discord.js');
const { sendAnimeAction } = require('../../utils/sendAnimeAction');

module.exports = {
	category: 'actions',
	data: new SlashCommandBuilder()
		.setName('nom')
		.setDescription('Nom nom nom...')
		.addStringOption(option =>
			option.setName('message')
				.setDescription('An optional message to send with your nom.')),

	async execute(context) {
		const customMsg = context.options?.getString?.('message') || context.args?.slice(1).join(' ');
		if (context.deferReply) await context.deferReply();

		await sendAnimeAction({
			interaction: context.deferReply ? context : null,
			message: context.message || null,
			targetUser: context.user || context.author,
			customMsg,
			actionType: 'nom',
			emoji: '😋',
			color: 0xf39c12 // Example: Orange
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

