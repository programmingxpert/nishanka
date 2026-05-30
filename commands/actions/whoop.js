const { SlashCommandBuilder } = require('discord.js');
const { sendAnimeAction } = require('../../utils/sendAnimeAction');

const hardcodedGifs = [
    "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZnZvYzZtcWw1bGZmdXZkajh5NG16bHVraGRobmp1ejR4amM1bnU3diZlcD12MV9naWZzX3NlYXJjaCZjdD1n/l0ErD3ZBW6vQgYCgE/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZnZvYzZtcWw1bGZmdXZkajh5NG16bHVraGRobmp1ejR4amM1bnU3diZlcD12MV9naWZzX3NlYXJjaCZjdD1n/NpsofYoHrC8mg8DjOu/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZnZvYzZtcWw1bGZmdXZkajh5NG16bHVraGRobmp1ejR4amM1bnU3diZlcD12MV9naWZzX3NlYXJjaCZjdD1n/BMBYKTsu5UKVe7NKWZ/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZnZvYzZtcWw1bGZmdXZkajh5NG16bHVraGRobmp1ejR4amM1bnU3diZlcD12MV9naWZzX3NlYXJjaCZjdD1n/7J8675iO9e3JeOOqRd/giphy.gif"
];

module.exports = {
	category: 'actions',
	aliases: ['whip'],
	data: { name: 'whoop' },

	async execute(interaction) {
		const targetUser = interaction.options.getUser('target');
		const customMsg  = interaction.options.getString('message');

		await sendAnimeAction({
			interaction,
			message: null,
			targetUser,
			actionType: 'whoop',
			emoji: '💥',
			color: 0xff3333,
			customMsg,
            hardcodedGifs
		});
	},

	async executePrefix(message, args) {
		const targetUser = message.mentions.users.first() || null;
		// If a user was mentioned, the message starts after the mention. Otherwise, it's just the args.
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
			actionType: 'whoop',
			emoji: '💥',
			color: 0xff3333,
			customMsg,
            hardcodedGifs
		});
	}
};
