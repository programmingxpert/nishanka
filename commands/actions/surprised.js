const { SlashCommandBuilder } = require('discord.js');
const { sendAnimeAction } = require('../../utils/sendAnimeAction');

const hardcodedGifs = [
    "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcWVuaWN2aXBtbHkyZHAyYTU0NzgzYzE2eTZ2ZXVmNHZqZmNweTN5aCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/FxlsMhC9t82jCJKfgY/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcWVuaWN2aXBtbHkyZHAyYTU0NzgzYzE2eTZ2ZXVmNHZqZmNweTN5aCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/L1NgLeXFat9ofiQuaB/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcWVuaWN2aXBtbHkyZHAyYTU0NzgzYzE2eTZ2ZXVmNHZqZmNweTN5aCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/tfUW8mhiFk8NlJhgEh/giphy.gif"
];

module.exports = {
	category: 'actions',
	aliases: ['surprise'],
	data: new SlashCommandBuilder()
		.setName('surprised')
		.setDescription('React with surprise!')
		.addUserOption(option =>
			option.setName('target')
				.setDescription('The user who surprised you')
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
			actionType: 'surprised',
			emoji: '😲',
			color: 0x3498db,
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
			actionType: 'surprised',
			emoji: '😲',
			color: 0x3498db,
			customMsg,
            hardcodedGifs
		});
	}
};
