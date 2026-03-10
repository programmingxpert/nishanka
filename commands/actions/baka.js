/* eslint-disable */
// commands/actions/baka.js
const { SlashCommandBuilder } = require('discord.js');
const { sendAnimeAction } = require('../../utils/sendAnimeAction');

module.exports = {
	category: 'actions',
	data: new SlashCommandBuilder()
		.setName('baka')
		.setDescription('Calling yourself Baka!')
		.addStringOption(option =>
			option.setName('message')
				.setDescription('An optional message to send with your baka act.')),

	async execute(context) {
		const customMsg = context.options?.getString?.('message') || context.args?.slice(1).join(' ');
			const reply = (msg) => context.reply ? context.reply(msg) : context.message.reply(msg);
			const selfResponses = ["Aww, let me do that for you! *But you still need to mention someone else...*","Doing that to yourself? How lonely... Mention someone!","I'm here for you! But seriously, mention another user for this command.","You can't target yourself, silly! Mention a friend!","Hold on there, you need another person for this to work right. Mention them!"];
			const randomResponse = selfResponses[Math.floor(Math.random() * selfResponses.length)];
			if (!user) return reply('❗ Please mention a user to baka.');
			if (user.id === (context.user?.id || context.author?.id)) return reply(randomResponse);
			if (context.deferReply) await context.deferReply();

		await sendAnimeAction({
			interaction: context.deferReply ? context : null,
			message: context.message || null,
			targetUser: context.user || context.author,
			customMsg,
			actionType: 'baka',
			emoji: '💢',
			color: 0xfc619d // Example: Pink
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

