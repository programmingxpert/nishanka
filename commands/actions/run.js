/* eslint-disable */
// commands/actions/run.js
const { SlashCommandBuilder } = require('discord.js');
const { sendAnimeAction } = require('../../utils/sendAnimeAction');

module.exports = {
	category: 'actions',
	data: new SlashCommandBuilder()
		.setName('run')
		.addUserOption(option =>
			option.setName('user')
				.setDescription('Optional user to target'))
		.setDescription('Running away!')
		.addStringOption(option =>
			option.setName('message')
				.setDescription('An optional message to send with your action of run.')),

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
			actionType: 'run',
			emoji: '🏃',
			color: 0x0288d1 // Example: Dark Blue
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

