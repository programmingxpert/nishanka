const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
	category: 'moderation',
	data: new SlashCommandBuilder()
		.setName('lock')
		.setDescription('Locks a channel for a specific role.')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
		.addChannelOption(option =>
			option.setName('channel')
				.setDescription('The channel to lock (defaults to current)')
				.setRequired(false))
		.addRoleOption(option =>
			option.setName('role')
				.setDescription('The role to affect (defaults to Citizen or @everyone)')
				.setRequired(false))
		.addStringOption(option =>
			option.setName('reason')
				.setDescription('Reason for locking the channel')
				.setRequired(false)),

	async execute(interaction) {
		const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
		const reason = interaction.options.getString('reason') || 'No reason provided.';
		
		let targetRole = interaction.options.getRole('role');
		if (!targetRole) {
			const citizenRole = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === 'citizen' || r.name.toLowerCase() === 'citizens');
			targetRole = citizenRole || interaction.guild.roles.everyone;
		}

		try {
			await targetChannel.permissionOverwrites.edit(targetRole, {
				SendMessages: false
			}, { reason: `Locked by ${interaction.user.tag}: ${reason}` });

			try {
				const { logServerEvent } = require('../../utils/serverLogger');
				await logServerEvent(interaction.guild.id, 'LOCK', `Locked channel #${targetChannel.name} for ${targetRole.name}. Reason: ${reason}`, interaction.user, targetChannel);
			} catch (e) {
				console.error('[lock] Logging failed:', e);
			}

			const embed = new EmbedBuilder()
				.setTitle('🔒 Channel Locked')
				.setDescription(`The channel ${targetChannel} has been locked for **${targetRole.name}**.`)
				.setColor(0xff3c38)
				.addFields(
					{ name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
					{ name: 'Reason', value: reason, inline: true }
				)
				.setTimestamp();

			await interaction.reply({ embeds: [embed] });
		} catch (error) {
			console.error(error);
			await interaction.reply({ content: `❌ Failed to lock channel ${targetChannel}. Make sure I have "Manage Channels" permission.`, ephemeral: true });
		}
	},

	async executePrefix(message, args) {
		if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
			return message.reply('❌ You don’t have permission to use this command.');
		}

		let targetChannel = message.channel;
		let targetRole = null;
		let reasonWords = [];

		for (const arg of args) {
			// Check if it's a channel mention or ID
			const channelMatch = arg.match(/^<#(\d+)>$/);
			if (channelMatch) {
				const chan = message.guild.channels.cache.get(channelMatch[1]);
				if (chan) {
					targetChannel = chan;
					continue;
				}
			} else if (/^\d{17,19}$/.test(arg)) {
				const chan = message.guild.channels.cache.get(arg);
				if (chan) {
					targetChannel = chan;
					continue;
				}
			}

			// Check if it's a role mention or ID
			const roleMatch = arg.match(/^<@&(\d+)>$/);
			if (roleMatch) {
				const role = message.guild.roles.cache.get(roleMatch[1]);
				if (role) {
					targetRole = role;
					continue;
				}
			} else if (/^\d{17,19}$/.test(arg)) {
				const role = message.guild.roles.cache.get(arg);
				if (role) {
					targetRole = role;
					continue;
				}
			}

			reasonWords.push(arg);
		}

		if (!targetRole) {
			const citizenRole = message.guild.roles.cache.find(r => r.name.toLowerCase() === 'citizen' || r.name.toLowerCase() === 'citizens');
			targetRole = citizenRole || message.guild.roles.everyone;
		}

		const reason = reasonWords.join(' ') || 'No reason provided.';

		try {
			await targetChannel.permissionOverwrites.edit(targetRole, {
				SendMessages: false
			}, { reason: `Locked by ${message.author.tag}: ${reason}` });

			try {
				const { logServerEvent } = require('../../utils/serverLogger');
				await logServerEvent(message.guild.id, 'LOCK', `Locked channel #${targetChannel.name} for ${targetRole.name}. Reason: ${reason}`, message.author, targetChannel);
			} catch (e) {
				console.error('[lock] Logging failed:', e);
			}

			const embed = new EmbedBuilder()
				.setTitle('🔒 Channel Locked')
				.setDescription(`The channel ${targetChannel} has been locked for **${targetRole.name}**.`)
				.setColor(0xff3c38)
				.addFields(
					{ name: 'Moderator', value: `${message.author.tag}`, inline: true },
					{ name: 'Reason', value: reason, inline: true }
				)
				.setTimestamp();

			await message.channel.send({ embeds: [embed] });
		} catch (error) {
			console.error(error);
			await message.reply(`❌ Failed to lock channel ${targetChannel}. Make sure I have "Manage Channels" permission.`);
		}
	}
};
