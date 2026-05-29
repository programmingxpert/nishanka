const { SlashCommandBuilder } = require('discord.js');
const { sendAnimeAction } = require('../../utils/sendAnimeAction');

const hardcodedGifs = [
    "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcHh1ajE5NW02YXZtd2lmbTFxeTExZmhzbzJweDV4ZG43ZW0zZHQzYSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/fsQbx1hX7hPBBpIM5b/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcHh1ajE5NW02YXZtd2lmbTFxeTExZmhzbzJweDV4ZG43ZW0zZHQzYSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/o75ajIFH0QnQC3nCeD/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcHh1ajE5NW02YXZtd2lmbTFxeTExZmhzbzJweDV4ZG43ZW0zZHQzYSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/lMameLIF8voLu8HxY6/giphy.gif"
];

module.exports = {
	category: 'actions',
	aliases: ['cheering'],
	data: new SlashCommandBuilder()
		.setName('cheer')
		.setDescription('Cheer for someone!')
		.addUserOption(option =>
			option.setName('target')
				.setDescription('The user to cheer for')
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
			actionType: 'cheer',
			emoji: '🙌',
			color: 0xf1c40f,
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
			actionType: 'cheer',
			emoji: '🙌',
			color: 0xf1c40f,
			customMsg,
            hardcodedGifs
		});
	}
};
