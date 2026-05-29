/* eslint-disable */
const {
	ActionRowBuilder,
	StringSelectMenuBuilder,
	EmbedBuilder,
	SlashCommandBuilder,
	ComponentType,
} = require('discord.js');
const config = require('../../config.json');

const categoryDetails = {
	admin: {
		label: 'Server Administration',
		emoji: '⚙️',
		description: 'Configure server settings, prefix, quotes, and triggers.',
	},
	moderation: {
		label: 'Moderation',
		emoji: '🛡️',
		description: 'Manage members, warnings, mutes, bans, and auto-mod.',
	},
	giveaway: {
		label: 'Giveaways',
		emoji: '🎁',
		description: 'Schedule, run, draw, and end server giveaways.',
	},
	economy: {
		label: 'Economy & Wealth',
		emoji: '💵',
		description: 'Earn baubles, check shop/inventory, and play casino games.',
	},
	profile: {
		label: 'User Profiles',
		emoji: '👤',
		description: 'Customize and view global user profile cards.',
	},
	fun: {
		label: 'Fun & Games',
		emoji: '🎭',
		description: 'Play trivia, scramble, marriage/family systems, and memes.',
	},
	music: {
		label: 'Music Player',
		emoji: '🎵',
		description: 'Music commands to stream audio tracks in voice channels.',
	},
	actions: {
		label: 'Social Actions',
		emoji: '🌸',
		description: 'Anime-style social action animations (hug, slap, pat).',
	},
	utility: {
		label: 'Utility Tools',
		emoji: '🛠️',
		description: 'General utilities, reminders, AFK status, and server info.',
	}
};

const categoryColors = {
	admin: 0x555555,
	moderation: 0x2ecc71,
	economy: 0xf1c40f,
	fun: 0xe74c3c,
	music: 0x9b59b6,
	giveaway: 0xe67e22,
	profile: 0x3498db,
	utility: 0x95a5a6,
	actions: 0xe84393
};

const commandGroups = {
	admin: [
		{
			title: '⚙️ Server Configurations',
			commands: ['setquoteschannel']
		},
		{
			title: '⚡ Custom Triggers',
			commands: ['trigger']
		}
	],
	moderation: [
		{
			title: '🛡️ Automated Moderation',
			commands: ['automod', 'antispam', 'censor', 'mediaonly']
		},
		{
			title: '🔨 Punishments',
			commands: ['ban', 'unban', 'fakeban', 'mkick', 'timeout', 'removetimeout']
		},
		{
			title: '⚠️ Warnings & Infractions',
			commands: ['warn', 'warnings', 'clearwarn', 'clearwarnings']
		},
		{
			title: '🛠️ Staff Tools',
			commands: ['purge', 'defaultpurge', 'lock', 'unlock', 'temprole']
		}
	],
	giveaway: [
		{
			title: '🎁 Giveaway Control',
			commands: ['giveaway', 'giveawayend']
		}
	],
	economy: [
		{
			title: '💳 Balance & Stats',
			commands: ['bauble', 'inventory', 'passive']
		},
		{
			title: '💼 Earnings & Work',
			commands: ['work', 'scavenge', 'rob', 'daily', 'weekly', 'checklist', 'grab']
		},
		{
			title: '🎲 Games & Gambling',
			commands: ['gamble', 'coinflip', 'slots', 'mines', 'buckshot', 'battle']
		},
		{
			title: '🛒 Market & Trading',
			commands: ['shop', 'sell', 'use', 'give', 'gift']
		},
		{
			title: '📈 Leaderboards',
			commands: ['leaderboard', 'globalleaderboard']
		},
		{
			title: '⚙️ Administration',
			commands: ['add', 'take', 'reset']
		}
	],
	profile: [
		{
			title: '👤 User Profile Customization',
			commands: ['profile', 'profile-edit', 'profile-reset']
		}
	],
	fun: [
		{
			title: '💍 Family & Marriage System',
			commands: ['family', 'familytree', 'proposals', 'marry', 'divorce', 'adopt', 'disown']
		},
		{
			title: '⚔️ Games & Challenges',
			commands: ['wordbomb', 'scramble', 'emojidecode', 'guesstheflag', 'deathbattle']
		},
		{
			title: '🎭 Humor & Interactive',
			commands: ['meme', 'wanted', 'excuse', 'hack', 'iq', 'vibecheck', 'ship']
		},
		{
			title: '💬 Attributions',
			commands: ['quote']
		}
	],
	music: [
		{
			title: '🎵 Playback & Control',
			commands: ['play', 'stop', 'pause', 'resume']
		},
		{
			title: '📜 Queue Management',
			commands: ['queue', 'skip', 'remove', 'clearmusic']
		}
	],
	utility: [
		{
			title: '⚙️ System Commands',
			commands: ['help', 'ping', 'reload', 'togglecmd']
		},
		{
			title: '📅 Reminders & AFK',
			commands: ['remind', 'afk']
		},
		{
			title: 'ℹ️ Information Lookup',
			commands: ['server', 'servericon', 'user', 'avatar', 'rep']
		}
	]
};

const actionGroups = [
	{
		title: '💖 Affectionate Actions',
		commands: ['hug', 'kiss', 'cuddle', 'pat', 'peck', 'tickle', 'touch', 'handhold']
	},
	{
		title: '😄 Friendly & Social',
		commands: ['happy', 'laugh', 'wave', 'wink', 'thumbsup', 'highfive', 'dance', 'handshake']
	},
	{
		title: '😢 Sad & Tired',
		commands: ['cry', 'bored', 'pout', 'sleep', 'yawn', 'lurk']
	},
	{
		title: '😡 Aggressive / Action',
		commands: ['angry', 'slap', 'bite', 'punch', 'kick', 'shoot', 'yeet', 'run']
	},
	{
		title: '🤔 Expressive & Anime Info',
		commands: ['action', 'think', 'shrug', 'smug', 'stare', 'blush', 'baka', 'nom', 'nod', 'nope', 'facepalm', 'feed', 'lewd', 'waifu', 'neko', 'kitsune', 'husbando']
	}
];

module.exports = {
	category: 'utility',
	data: new SlashCommandBuilder()
		.setName('help')
		.setDescription('Displays all commands grouped by category.'),

	async execute(context) {
		const commands = context.client.commands;
		const grouped = {};
		const isOwner = context.user?.id === config.devId;

		// Group commands by category (collect name -> description map)
		for (const [, cmd] of commands) {
			if (cmd.hidden && !isOwner) continue;
			if (context.client.disabledCommands && context.client.disabledCommands.has(cmd.data.name)) continue;

			// Permission filtering: Skip if user lacks required permissions
			if (cmd.data.default_member_permissions && context.member) {
				if (!context.member.permissions.has(BigInt(cmd.data.default_member_permissions))) {
					continue;
				}
			}

			const category = cmd.category || 'Uncategorized';
			if (category === 'admin' && !isOwner) continue;

			if (!grouped[category]) grouped[category] = {};
			grouped[category][cmd.data.name] = cmd.data.description || 'No description provided.';
		}

		// Sort categories by predefined order
		const categoryOrder = ['admin', 'moderation', 'giveaway', 'economy', 'profile', 'fun', 'music', 'actions', 'utility'];
		const categories = Object.keys(grouped).sort((a, b) => {
			const idxA = categoryOrder.indexOf(a);
			const idxB = categoryOrder.indexOf(b);
			if (idxA === -1 && idxB === -1) return a.localeCompare(b);
			if (idxA === -1) return 1;
			if (idxB === -1) return -1;
			return idxA - idxB;
		});

		const fields = [];
		if (isOwner) {
			fields.push({ name: '⚙️ Admin', value: 'Server configs & triggers', inline: true });
		}
		fields.push(
			{ name: '🛡️ Moderation', value: 'Auto-mod & mutes/bans', inline: true },
			{ name: '💵 Economy', value: 'Wealth & casino games', inline: true },
			{ name: '🎭 Fun & Games', value: 'Family system & minigames', inline: true },
			{ name: '🎵 Music Player', value: 'Stream audio in VC', inline: true },
			{ name: '👤 Profiles', value: 'Customize profile cards', inline: true }
		);

		const embed = new EmbedBuilder()
			.setTitle('📘 Help Menu')
			.setDescription(
				'Welcome to the **Nishanka Help Menu**!\n' +
				'Please select a category from the dropdown menu below to view its available commands.'
			)
			.setColor(0x7c6cf0)
			.addFields(fields)
			.setFooter({ text: 'Use /help or -help | Nishanka ©️' });

		const selectMenu = new StringSelectMenuBuilder()
			.setCustomId('help-category-select')
			.setPlaceholder('📂 Choose a category')
			.addOptions(
				categories.map((cat) => {
					const details = categoryDetails[cat] || {
						label: cat.charAt(0).toUpperCase() + cat.slice(1),
						emoji: '📂',
						description: 'List of commands'
					};
					return {
						label: details.label,
						value: cat,
						description: details.description,
						emoji: details.emoji
					};
				})
			);

		const row = new ActionRowBuilder().addComponents(selectMenu);

		const reply = await context.reply({
			embeds: [embed],
			components: [row],
			ephemeral: context.isPrefix ? false : true,
		});

		// Create a collector to listen to the dropdown selection
		const collector = reply.createMessageComponentCollector({
			componentType: ComponentType.StringSelect,
			time: 300000, // 5 minutes
		});

		collector.on('collect', async (interaction) => {
			try {
				await interaction.deferUpdate();

				const selected = interaction.values[0];
				const categoryCmds = grouped[selected] || {};
				const formattedSections = [];
				const formattedNames = new Set();

				if (selected === 'actions') {
					for (const group of actionGroups) {
						const activeInGroup = group.commands.filter(name => categoryCmds[name] !== undefined);
						if (activeInGroup.length > 0) {
							activeInGroup.forEach(name => formattedNames.add(name));
							formattedSections.push(`**${group.title}**\n${activeInGroup.map(name => `\`${name}\``).join(' ')}`);
						}
					}
				} else {
					const groups = commandGroups[selected] || [];
					for (const group of groups) {
						const activeInGroup = group.commands.filter(name => categoryCmds[name] !== undefined);
						if (activeInGroup.length > 0) {
							const groupLines = activeInGroup.map(name => {
								formattedNames.add(name);
								return `\`${name}\` - ${categoryCmds[name]}`;
							});
							formattedSections.push(`**${group.title}**\n${groupLines.join('\n')}`);
						}
					}
				}

				// Catch-all for any un-categorized commands in that category folder
				const otherCmds = [];
				for (const name in categoryCmds) {
					if (!formattedNames.has(name)) {
						otherCmds.push(name);
					}
				}
				if (otherCmds.length > 0) {
					if (selected === 'actions') {
						formattedSections.push(`**❓ Other Actions**\n${otherCmds.map(name => `\`${name}\``).join(' ')}`);
					} else {
						const otherLines = otherCmds.map(name => `\`${name}\` - ${categoryCmds[name]}`);
						formattedSections.push(`**❓ Miscellaneous Commands**\n${otherLines.join('\n')}`);
					}
				}

				const details = categoryDetails[selected] || { label: selected.toUpperCase() };
				const embedColor = categoryColors[selected] || 0x3498db;

				const selectedEmbed = new EmbedBuilder()
					.setTitle(`${details.emoji || '📂'} ${details.label} Commands`)
					.setDescription(formattedSections.join('\n\n') || 'No commands found.')
					.setColor(embedColor)
					.setFooter({ text: 'Use /help or -help | Nishanka ©️' });

				await interaction.editReply({
					embeds: [selectedEmbed],
					components: [row],
				});

			} catch (error) {
				if (error.code === 10062) {
					return;
				}
				console.error("Error updating help message:", error);
				await interaction.followUp({ content: "❌ An error occurred while updating the help message.", ephemeral: true }).catch(() => {});
			}
		});

		collector.on('end', (collected, reason) => {
			if (reply.edit) {
				if (reason === 'time') {
					const expiredEmbed = new EmbedBuilder()
						.setTitle('📘 Help Menu')
						.setDescription('This help menu has expired due to inactivity. Run the command again to use it.')
						.setColor(0x95a5a6)
						.setFooter({ text: 'Use /help or -help | Nishanka ©️' });

					reply.edit({ embeds: [expiredEmbed], components: [] }).catch(console.error);
				} else {
					reply.edit({ components: [] }).catch(console.error);
				}
			}
		});
	},

	async executePrefix(message) {
		await module.exports.execute({
			client: message.client,
			user: message.author,
			member: message.member,
			channel: message.channel,
			reply: (...args) => message.channel.send(...args),
			isPrefix: true,
		});
	},
};