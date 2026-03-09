/* eslint-disable */
const {
	SlashCommandBuilder,
	EmbedBuilder,
} = require('discord.js');

module.exports = {
	category: 'utility',
	data: new SlashCommandBuilder()
		.setName('user')
		.setDescription('Detailed profile of you or another user.')
		.addStringOption(option =>
			option.setName('user_identifier')
				.setDescription('Username, User ID, or Mention of the user to get info about')
				.setRequired(false)
		),

	// SLASH COMMAND
	async execute(interaction) {
		const userIdentifier = interaction.options.getString('user_identifier');

		let target;
		if (userIdentifier) {
			target = await this.resolveUser(interaction.client, interaction.guild, userIdentifier);
			if (!target) {
				return interaction.reply({ content: '❌ User not found.', ephemeral: true });
			}
		} else {
			target = interaction.user;
		}

		const member = interaction.guild.members.cache.get(target.id);
		const isOwner = interaction.guild.ownerId === target.id;

		const embed = createUserEmbed(target, member, interaction.user, isOwner);
		await interaction.reply({ embeds: [embed] });
	},

	// PREFIX COMMAND
	async executePrefix(message, args) {
		let target;

		if (args.length > 0) {
			const userIdentifier = args.join(' ');  // Combine the args into a single string
			target = await this.resolveUser(message.client, message.guild, userIdentifier);
			if (!target) {
				return message.reply('❌ User not found.');
			}
		} else {
			target = message.author;
		}

		const member = message.guild.members.cache.get(target.id);
		const isOwner = message.guild.ownerId === target.id;

		const embed = createUserEmbed(target, member, message.author, isOwner);
		await message.channel.send({ embeds: [embed] });
	},

	async resolveUser(client, guild, userIdentifier) {
		// Try fetching by User ID
		if (/^\d+$/.test(userIdentifier)) {
			try {
				return await client.users.fetch(userIdentifier);
			} catch (error) {
				// User ID is invalid or not found
			}
		}

		// Try fetching by Mention
		const mentionMatch = userIdentifier.match(/^<@!?(\d+)>$/);
		if (mentionMatch) {
			try {
				return await client.users.fetch(mentionMatch[1]);
			} catch (error) {
				// User ID is invalid or not found
			}
		}

		// Try fetching by Username
		try {
			const foundUsers = await guild.members.search({ query: userIdentifier, limit: 1 });
			if (foundUsers && foundUsers.size > 0) {
				return foundUsers.first().user;
			}
		} catch (error) {
			console.error("Error during username search:", error);
		}

		return null;
	}
};

// Helper function
function createUserEmbed(user, member, requestedBy, isOwner) {
	const roles = member?.roles.cache
		.filter(role => role.id !== member.guild.id)
		.map(role => role.name)
		.join(', ') || 'No roles';

	const embed = new EmbedBuilder()
		.setTitle(`${user.username}'s Profile`)
		.setThumbnail(user.displayAvatarURL({ dynamic: true }))
		.setColor(0x00bcd4)
		.addFields(
			{ name: 'ID', value: user.id, inline: true },
			{ name: 'Tag', value: user.tag, inline: true },
			{ name: 'Nickname', value: member?.nickname || 'None', inline: true },
			{ name: 'Joined Server', value: member?.joinedAt?.toLocaleString() || 'N/A', inline: true },
			{ name: 'Account Created', value: user.createdAt.toLocaleString(), inline: true },
			{ name: 'Roles', value: roles.length > 1024 ? roles.slice(0, 1021) + '...' : roles }
		)
		.setFooter({
			text: `Requested by ${requestedBy.tag}`,
			iconURL: requestedBy.displayAvatarURL({ dynamic: true })
		})
		.setTimestamp();

	// Only add description if the user is the owner
	if (isOwner) {
		embed.setDescription(`(SERVER OWNER) This user is the big boss of this server.`);
	}

	return embed;
}