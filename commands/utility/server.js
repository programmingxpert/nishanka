/* eslint-disable*/
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
	category: 'utility',
	data: new SlashCommandBuilder()
		.setName('server')
		.setDescription('Provides detailed information about the server.'),

	async execute(interaction) {
		const guild = interaction.guild;
		const owner = await guild.fetchOwner();

		const embed = await createServerEmbed(guild, owner, interaction.user);
		await interaction.reply({ embeds: [embed] });
	},

	async executePrefix(message) {
		const guild = message.guild;
		const owner = await guild.fetchOwner();

		const embed = await createServerEmbed(guild, owner, message.author);
		await message.channel.send({ embeds: [embed] });
	},
};

async function createServerEmbed(guild, owner, requestedBy) {
	const channels = guild.channels.cache;
	const roles = guild.roles.cache;
	const emojis = guild.emojis.cache;
	const bannerURL = guild.bannerURL({ size: 1024 });
	const splashURL = guild.splashURL({ size: 1024 });
	const discoverySplash = guild.discoverySplashURL({ size: 1024 });
	const icon = guild.iconURL({ dynamic: true });

	const requesterMember = guild.members.cache.get(requestedBy.id);
	const requesterAvatarURL = requesterMember ? requesterMember.displayAvatarURL({ dynamic: true }) : requestedBy.displayAvatarURL({ dynamic: true });

	const embed = new EmbedBuilder()
		.setTitle(`${guild.name} — Server Details`)
		.setThumbnail(icon)
		.setColor(0x3498db)
		.addFields(
			{ name: '🆔 Server ID', value: guild.id, inline: true },
			{ name: '👑 Owner', value: `${owner.user.tag} (${owner.id})`, inline: true },
			{ name: '📆 Created On', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, inline: true },
			{ name: '🧍 Members', value: `${guild.memberCount}`, inline: true },
			{ name: '💬 Channels', value: `Text: ${channels.filter(c => c.type === 0).size} | Voice: ${channels.filter(c => c.type === 2).size} | Categories: ${channels.filter(c => c.type === 4).size}`, inline: true },
			{ name: '📁 Roles', value: `${roles.size}`, inline: true },
			{ name: '😄 Emojis', value: `${emojis.size}`, inline: true },
			{ name: '📈 Boosts', value: `Level ${guild.premiumTier} (${guild.premiumSubscriptionCount} boosts)`, inline: true },
			{ name: '🌍 Region (VC)', value: `${guild.preferredLocale}`, inline: true },
			{ name: '📝 Description', value: guild.description ?? 'No description provided.' }
		)
		.setFooter({
			text: `Requested by ${requestedBy.tag}`,
			iconURL: requesterAvatarURL,
		})
		.setTimestamp();

	if (bannerURL) embed.setImage(bannerURL);
	else if (splashURL) embed.setImage(splashURL);
	else if (discoverySplash) embed.setImage(discoverySplash);

//	if (guild.ownerId === requestedBy.id) {
//		embed.addFields({
//			name: '👑 Special Note',
//			value: 'You are the supreme overlord of this server. (SERVER OWNER)',
//		});
//	}

	return embed;
}
