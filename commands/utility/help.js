/* eslint-disable */
const {
	ActionRowBuilder,
	StringSelectMenuBuilder,
	EmbedBuilder,
	SlashCommandBuilder,
	ComponentType,
	ButtonBuilder,
	ButtonStyle,
} = require('discord.js');
const config = require('../../config.json');

const categoryDetails = {
	admin: {
		label: 'Administration',
		emoji: '⚙️',
		description: 'Configure server settings, prefix, quotes, and triggers.',
	},
	moderation: {
		label: 'Moderation Tools',
		emoji: '🛡️',
		description: 'Manage members, warnings, mutes, bans, and auto-mod.',
	},
	giveaway: {
		label: 'Giveaway Controls',
		emoji: '🎁',
		description: 'Schedule, run, draw, and end server giveaways.',
	},
	economy: {
		label: 'Economy & Shop',
		emoji: '💵',
		description: 'Earn baubles, check shop/inventory, and view leaderboards.',
	},
	casino: {
		label: 'Casino & Betting',
		emoji: '🎰',
		description: 'Play risk-reward games like gamble, blackjack, slots, and mines.',
	},
	marriage: {
		label: 'Marriage & Family',
		emoji: '💍',
		description: 'Propose, marry, divorce, adopt children, and build family trees.',
	},
	minigames: {
		label: 'Minigames',
		emoji: '🎮',
		description: 'Challenge others to wordbomb, scramble, hangman, and battles.',
	},
	fun: {
		label: 'Humor & Entertainment',
		emoji: '🎭',
		description: 'Check your iq, get random excuses, vibecheck, and post memes.',
	},
	profile: {
		label: 'Profiles & Banners',
		emoji: '👤',
		description: 'Customize and show off your premium user profile cards.',
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
	ai: {
		label: 'Artificial Intelligence',
		emoji: '🤖',
		description: 'DeepSeek-powered AI assistants, games, and utilities.',
	},
	utility: {
		label: 'Utility Tools',
		emoji: '🛠️',
		description: 'General utilities, reminders, AFK status, and server info.',
	}
};

const categoryColors = {
	admin: 0x2b2d42,
	moderation: 0x2ecc71,
	giveaway: 0xe67e22,
	economy: 0xf1c40f,
	casino: 0xe74c3c,
	marriage: 0xe84393,
	minigames: 0x3498db,
	fun: 0x9b59b6,
	profile: 0x1abc9c,
	music: 0x9b59b6,
	actions: 0xe84393,
	ai: 0x7c6cf0,
	utility: 0x95a5a6
};

const COMMAND_MAPPING = {
	// Admin
	setquoteschannel: 'admin',
	trigger: 'admin',
	welcome: 'admin',
	autorole: 'admin',
	logging: 'admin',
	leveling: 'admin',
	snipetoggle: 'admin',

	// Moderation
	automod: 'moderation',
	antispam: 'moderation',
	censor: 'moderation',
	mediaonly: 'moderation',
	ban: 'moderation',
	unban: 'moderation',
	fakeban: 'moderation',
	mkick: 'moderation',
	timeout: 'moderation',
	removetimeout: 'moderation',
	warn: 'moderation',
	warnings: 'moderation',
	clearwarn: 'moderation',
	clearwarnings: 'moderation',
	purge: 'moderation',
	defaultpurge: 'moderation',
	lock: 'moderation',
	unlock: 'moderation',
	temprole: 'moderation',

	// Giveaway
	giveaway: 'giveaway',
	giveawayend: 'giveaway',

	// Economy
	bauble: 'economy',
	inventory: 'economy',
	passive: 'economy',
	work: 'economy',
	scavenge: 'economy',
	rob: 'economy',
	daily: 'economy',
	weekly: 'economy',
	hourly: 'economy',
	monthly: 'economy',
	checklist: 'economy',
	grab: 'economy',
	shop: 'economy',
	sell: 'economy',
	use: 'economy',
	give: 'economy',
	gift: 'economy',
	leaderboard: 'economy',
	globalleaderboard: 'economy',
	add: 'economy',
	take: 'economy',
	reset: 'economy',
	taxfund: 'economy',
	collections: 'economy',
	crime: 'economy',
	dig: 'economy',
	dumpster: 'economy',
	economy: 'economy',
	expedition: 'economy',
	fish: 'economy',
	items: 'economy',
	memehunt: 'economy',

	// Casino
	gamble: 'casino',
	coinflip: 'casino',
	slots: 'casino',
	mines: 'casino',
	buckshot: 'casino',
	battle: 'minigames',
	blackjack: 'casino',
	bj: 'casino',
	animebattle: 'minigames',
	mblackjack: 'casino',

	// Profile
	profile: 'profile',
	'profile-edit': 'profile',
	'profile-reset': 'profile',
	title: 'profile',

	// Marriage
	family: 'marriage',
	familytree: 'marriage',
	proposals: 'marriage',
	marry: 'marriage',
	divorce: 'marriage',
	adopt: 'marriage',
	disown: 'marriage',

	// Minigames
	wordbomb: 'minigames',
	scramble: 'minigames',
	emojidecode: 'minigames',
	guesstheflag: 'minigames',
	deathbattle: 'minigames',
	geoguesser: 'minigames',
	hangman: 'minigames',
	truthordare: 'minigames',

	// Fun
	meme: 'fun',
	wanted: 'fun',
	hack: 'fun',
	iq: 'fun',
	vibecheck: 'fun',
	ship: 'fun',
	pp: 'fun',
	gayrate: 'fun',
	'8ball': 'fun',
	furry: 'fun',
	quote: 'fun',
	gta6: 'fun',

	// AI
	excuse: 'ai',
	ai: 'ai',

	// Music
	play: 'music',
	stop: 'music',
	pause: 'music',
	resume: 'music',
	queue: 'music',
	skip: 'music',
	remove: 'music',
	clearmusic: 'music',

	// Utility
	help: 'utility',
	ping: 'utility',
	reload: 'utility',
	togglecmd: 'utility',
	remind: 'utility',
	afk: 'utility',
	server: 'utility',
	servericon: 'utility',
	user: 'utility',
	avatar: 'utility',
	rep: 'utility',
	rank: 'utility',
	snipe: 'utility'
};

const commandGroups = {
	admin: [
		{
			title: '⚙️ Server Configurations',
			commands: ['setquoteschannel', 'welcome', 'autorole', 'logging', 'leveling', 'snipetoggle']
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
			commands: ['bauble', 'inventory', 'passive', 'collections', 'economy']
		},
		{
			title: '💼 Earnings & Work',
			commands: ['work', 'scavenge', 'rob', 'daily', 'weekly', 'hourly', 'monthly', 'checklist', 'grab', 'taxfund', 'crime', 'dig', 'dumpster', 'expedition', 'fish', 'memehunt']
		},
		{
			title: '🛒 Market & Trading',
			commands: ['shop', 'sell', 'use', 'give', 'gift', 'items']
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
	casino: [
		{
			title: '🎰 Classic Casino Games',
			commands: ['gamble', 'coinflip', 'slots', 'blackjack', 'mblackjack']
		},
		{
			title: '💣 Survival & Strategy',
			commands: ['mines', 'buckshot']
		}
	],
	marriage: [
		{
			title: '💍 Matrimony & Marriage',
			commands: ['marry', 'divorce', 'proposals']
		},
		{
			title: '👪 Family Dynamics',
			commands: ['adopt', 'disown', 'family', 'familytree']
		}
	],
	minigames: [
		{
			title: '🧠 Word & Vocabulary Games',
			commands: ['wordbomb', 'scramble', 'hangman']
		},
		{
			title: '⚔️ Battles & Duels',
			commands: ['battle', 'animebattle', 'deathbattle']
		},
		{
			title: '🌐 Trivia & Logic',
			commands: ['emojidecode', 'guesstheflag', 'geoguesser', 'truthordare']
		}
	],
	profile: [
		{
			title: '👤 User Profile Customization',
			commands: ['profile', 'profile-edit', 'profile-reset', 'title']
		}
	],
	fun: [
		{
			title: '🎭 Humor & Interactive',
			commands: ['meme', 'wanted', 'hack', 'iq', 'vibecheck', 'ship', 'pp', 'gayrate', '8ball', 'furry', 'gta6', 'mblackjack']
		},
		{
			title: '💬 Attributions',
			commands: ['quote']
		}
	],
	ai: [
		{
			title: '🤖 Artificial Intelligence',
			commands: ['ai', 'excuse']
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
			commands: ['server', 'servericon', 'user', 'avatar', 'rep', 'rank', 'snipe']
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
		commands: ['happy', 'yay', 'laugh', 'wave', 'wink', 'thumbsup', 'highfive', 'dance', 'handshake', 'cheer', 'whoop']
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
		commands: ['action', 'think', 'shrug', 'smug', 'stare', 'blush', 'baka', 'nom', 'nod', 'nope', 'facepalm', 'feed', 'lewd', 'waifu', 'neko', 'kitsune', 'husbando', 'shocked', 'surprised']
	}
];

module.exports = {
	category: 'utility',
	aliases: ['h', 'commands'],
	data: new SlashCommandBuilder()
		.setName('help')
		.setDescription('Displays all commands grouped by category.'),

	async execute(context) {
		const commands = context.client.commands;
		const grouped = {};
		const isOwner = (context.user?.id || context.author?.id) === config.devId;

		// Group commands by category (collect name -> description map)
		for (const [, cmd] of commands) {
			if (cmd.devOnly || cmd.hidden) continue;
			if (context.client.disabledCommands && context.client.disabledCommands.has(cmd.data.name)) continue;

			// Permission filtering: Skip if user lacks required permissions
			if (cmd.data.default_member_permissions && context.member) {
				if (!context.member.permissions.has(BigInt(cmd.data.default_member_permissions))) {
					continue;
				}
			}

			// Map command to its category dynamically
			let category = COMMAND_MAPPING[cmd.data.name];
			if (!category) {
				if (cmd.category === 'actions') {
					category = 'actions';
				} else {
					category = cmd.category || 'Uncategorized';
				}
			}

			if (category === 'admin' && !isOwner) continue;

			if (!grouped[category]) grouped[category] = {};
			grouped[category][cmd.data.name] = cmd.data.description || 'No description provided.';
		}

		// Sort categories by predefined order
		const categoryOrder = ['admin', 'moderation', 'giveaway', 'economy', 'casino', 'marriage', 'minigames', 'fun', 'profile', 'music', 'actions', 'ai', 'utility'];
		const categories = Object.keys(grouped).sort((a, b) => {
			const idxA = categoryOrder.indexOf(a);
			const idxB = categoryOrder.indexOf(b);
			if (idxA === -1 && idxB === -1) return a.localeCompare(b);
			if (idxA === -1) return 1;
			if (idxB === -1) return -1;
			return idxA - idxB;
		});

		// Calculate total commands dynamically
		const totalCommands = Object.values(grouped).reduce((acc, cat) => acc + Object.keys(cat).length, 0);

		const embed = new EmbedBuilder()
			.setColor(0x2B2D31)
			.setTitle('✦ Nishanka')
			.setDescription(
				[
			'**Economy • Games • Moderation • Utility**',
			'',
			'A complete Discord experience built around progression, fun, and community.',
			'',
			'> Select a category below to explore commands.'
				].join('\n')
			)
			.setFooter({
				text: 'Nishanka • Built with ❤️'
			});

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

		const buttons = new ActionRowBuilder()
			.addComponents(
				new ButtonBuilder()
					.setLabel('Invite')
					.setStyle(ButtonStyle.Link)
					.setURL('https://discord.com/api/oauth2/authorize?client_id=1357752347643609198&permissions=8&scope=bot%20applications.commands'),

				new ButtonBuilder()
					.setLabel('Support')
					.setStyle(ButtonStyle.Link)
					.setURL('https://discord.gg/tkPfDP4n7D'),

				new ButtonBuilder()
					.setLabel('Dashboard / Server Config')
					.setStyle(ButtonStyle.Link)
					.setURL('https://nishanka.zeyuki.app/'),
				new ButtonBuilder()
					.setLabel('🗎 Docs')
					.setStyle(ButtonStyle.Link)
					.setURL('https://nishanka.zeyuki.app/docs')
			);

		const reply = await context.reply({
			embeds: [embed],
			components: [buttons, row],
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
							formattedSections.push(`**${group.title}**\n${activeInGroup.map(name => "`" + name + "`").join(' ')}`);
						}
					}
				} else {
					const groups = commandGroups[selected] || [];
					for (const group of groups) {
						const activeInGroup = group.commands.filter(name => categoryCmds[name] !== undefined);
						if (activeInGroup.length > 0) {
							activeInGroup.forEach(name => formattedNames.add(name));
							formattedSections.push(`**${group.title}**\n${activeInGroup.map(name => "`" + name + "`").join(' ')}`);
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
					formattedSections.push(`**❓ Miscellaneous Commands**\n${otherCmds.map(name => "`" + name + "`").join(' ')}`);
				}

				const details = categoryDetails[selected] || { label: selected.toUpperCase(), description: "List of commands" };
				const embedColor = categoryColors[selected] || 0x3498db;

				const embeds = [];
				let currentDescription = '';
				
				for (const section of formattedSections) {
					if (currentDescription.length + section.length > 1800) {
						embeds.push(
							new EmbedBuilder()
								.setColor(0x2B2D31)
								.setTitle(`${details.emoji || '✦'} ${details.label} Commands ${embeds.length > 0 ? '(Cont.)' : ''}`)
								.setDescription(
									[
										`${details.description}`,
										'',
										currentDescription
									].join('\n')
								)
						);
						currentDescription = section;
					} else {
						if (currentDescription.length > 0) currentDescription += '\n\n';
						currentDescription += section;
					}
				}
				
				if (currentDescription.length > 0 || embeds.length === 0) {
					embeds.push(
						new EmbedBuilder()
							.setColor(0x2B2D31)
							.setTitle(`${details.emoji || '✦'} ${details.label} Commands ${embeds.length > 0 ? '(Cont.)' : ''}`)
							.setDescription(
								[
									`${details.description}`,
									'',
									currentDescription || 'No commands found.'
								].join('\n')
							)
							.setColor(embedColor)
					);
				}
				
				embeds[embeds.length - 1].setFooter({ text: 'Nishanka • Built with ❤️' });
				
				const finalEmbeds = embeds.slice(0, 10);

				await interaction.editReply({
					embeds: finalEmbeds,
					components: [buttons, row],
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
						.setFooter({ text: 'Nishanka • Built with ❤️' });

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
			author: message.author,
			member: message.member,
			channel: message.channel,
			reply: (...args) => message.channel.send(...args),
			isPrefix: true,
		});
	},
};