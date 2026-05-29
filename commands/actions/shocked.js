const { SlashCommandBuilder } = require('discord.js');
const { sendAnimeAction } = require('../../utils/sendAnimeAction');

const hardcodedGifs = [
    "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3h1aXhhaWp0NmhpYWphNGhwOXM0bTIyYnUyOHV3ZmluaTB6ZW5hZSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/lNMyVfxjzZ6T09QDp3/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3h1aXhhaWp0NmhpYWphNGhwOXM0bTIyYnUyOHV3ZmluaTB6ZW5hZSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/gKfyusl0PRPdTNmwnD/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3h1aXhhaWp0NmhpYWphNGhwOXM0bTIyYnUyOHV3ZmluaTB6ZW5hZSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/6nWhy3ulBL7GSCvKw6/giphy.gif"
];

module.exports = {
	category: 'actions',
	aliases: ['shock'],
	data: new SlashCommandBuilder()
		.setName('shocked')
		.setDescription('React with shock!')
		.addUserOption(option =>
			option.setName('target')
				.setDescription('The user who shocked you')
				.setRequired(false)
		)
		.addStringOption(option =>
			option.setName('message')
				.setDescription('An optional message to include')
				.setRequired(false)
		),

	async execute(interaction) {
		const targetUser = interaction.options.getUser('target');
		const customMsg  = interaction.options.getString('message');

		await sendAnimeAction({
			interaction,
			message: null,
			targetUser,
			actionType: 'shocked',
			emoji: '😱',
			color: 0xffa500,
			customMsg,
            hardcodedGifs
		});
	},

	async executePrefix(message, args) {
		const targetUser = message.mentions.users.first() || null;
		let customMsg = null;
		if (targetUser) {
			const argsWithoutMention = args.slice(1);
			if (argsWithoutMention.length > 0) customMsg = argsWithoutMention.join(' ');
		} else {
			if (args.length > 0) customMsg = args.join(' ');
		}

		await sendAnimeAction({
			interaction: null,
			message,
			targetUser,
			actionType: 'shocked',
			emoji: '😱',
			color: 0xffa500,
			customMsg,
            hardcodedGifs
		});
	}
};
