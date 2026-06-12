/* eslint-disable */
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
	category: 'moderation',
	data: new SlashCommandBuilder()
		.setName('steal')
		.setDescription('Steal custom emojis or stickers from other servers (Nitro shortcut).')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageEmojisAndStickers)
		.addStringOption(option =>
			option.setName('input')
				.setDescription('Emoji (e.g. <:name:id>), sticker ID, direct image URL, or "reply" to a message')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('name')
				.setDescription('Custom name to give the stolen emoji/sticker')
				.setRequired(false)),

	async execute(interaction) {
		const input = interaction.options.getString('input').trim();
		const name = interaction.options.getString('name')?.trim();

		// Check bot permissions
		if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
			return interaction.reply({ content: '❌ I do not have permission to manage emojis and stickers in this server.', ephemeral: true });
		}

		await interaction.deferReply();
		await handleSteal(interaction, input, name);
	},

	async executePrefix(message, args) {
		// Check user permissions
		if (!message.member.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
			return message.reply('❌ You don’t have permission to use this command.');
		}

		// Check bot permissions
		if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
			return message.reply('❌ I do not have permission to manage emojis and stickers in this server.');
		}

		let input = args[0];
		let name = args[1];

		// If no arguments provided but the message is a reply, we look at the replied message
		if (!input && message.reference && message.reference.messageId) {
			// Proceed with empty input to let handleSteal fetch the reply
		} else if (!input) {
			return message.reply('❌ Please specify an emoji, sticker ID, image URL, or reply to a message containing one.');
		}

		await handleSteal(message, input, name);
	}
};

async function handleSteal(context, input, customName) {
	const isSlash = !!context.deferReply;
	const client = context.client;
	const guild = context.guild;
	const author = isSlash ? context.user : context.author;

	let url = null;
	let isSticker = false;
	let name = customName;

	// Helper to reply/edit depending on context type
	const reply = async (payload) => {
		if (isSlash) {
			return context.editReply(payload);
		} else {
			return context.reply(payload);
		}
	};

	try {
		// 1. Resolve if context is a reply to another message
		let repliedMessage = null;
		if (!isSlash && context.reference && context.reference.messageId) {
			repliedMessage = await context.channel.messages.fetch(context.reference.messageId).catch(() => null);
		}

		// 2. Parse replied message if applicable
		if (repliedMessage) {
			if (repliedMessage.stickers && repliedMessage.stickers.size > 0) {
				const sticker = repliedMessage.stickers.first();
				url = sticker.url;
				name = name || sticker.name;
				isSticker = true;
			} else {
				const emojis = repliedMessage.content.match(/<a?:([a-zA-Z0-9_~]+):(\d+)>/g);
				if (emojis && emojis.length > 0) {
					const emojiMatch = emojis[0].match(/<a?:([a-zA-Z0-9_~]+):(\d+)>/);
					const emojiName = emojiMatch[1];
					const emojiId = emojiMatch[2];
					const animated = emojis[0].startsWith('<a:');
					url = `https://cdn.discordapp.com/emojis/${emojiId}.${animated ? 'gif' : 'png'}`;
					name = name || emojiName;
				}
			}
		}

		// 3. If no URL was resolved from the reply, parse the direct input argument
		if (!url && input) {
			const emojiMatch = input.match(/<a?:([a-zA-Z0-9_~]+):(\d+)>/);
			if (emojiMatch) {
				const emojiName = emojiMatch[1];
				const emojiId = emojiMatch[2];
				const animated = input.startsWith('<a:');
				url = `https://cdn.discordapp.com/emojis/${emojiId}.${animated ? 'gif' : 'png'}`;
				name = name || emojiName;
			} else if (input.startsWith('http://') || input.startsWith('https://')) {
				url = input;
				if (!name) {
					try {
						const urlPath = new URL(input).pathname;
						const filename = urlPath.substring(urlPath.lastIndexOf('/') + 1);
						name = filename.split('.')[0] || 'stolen_emoji';
					} catch (e) {
						name = 'stolen_emoji';
					}
				}
			} else {
				// Check if it is a sticker or emoji ID (17-20 digits)
				const idMatch = input.match(/^(\d{17,20})$/);
				if (idMatch) {
					const id = idMatch[1];
					// Try fetching as a sticker first
					const stickerObj = await client.fetchSticker(id).catch(() => null);
					if (stickerObj) {
						url = stickerObj.url;
						name = name || stickerObj.name;
						isSticker = true;
					} else {
						// Otherwise default to standard emoji URL
						url = `https://cdn.discordapp.com/emojis/${id}.png`;
						name = name || 'emoji';
					}
				}
			}
		}

		if (!url) {
			return reply('❌ Could not find a valid custom emoji, sticker, or image URL from your input or referenced message.');
		}

		// 4. Sanitize Name (Alphanumeric and underscores, 2-32 chars)
		name = (name || 'stolen').replace(/[^a-zA-Z0-9_]/g, '_');
		if (name.length < 2) name = 'emoji_' + name;
		if (name.length > 32) name = name.slice(0, 32);

		// 5. Create Emoji or Sticker in the guild
		if (isSticker) {
			// Stickers require boost levels / slots verification, try/catch specifically
			try {
				const createdSticker = await guild.stickers.create({
					file: url,
					name: name,
					tags: name
				});

				const embed = new EmbedBuilder()
					.setTitle('✨ Sticker Stolen Successfully!')
					.setDescription(`Successfully cloned and added sticker: **${createdSticker.name}**`)
					.setImage(createdSticker.url)
					.setColor(0x2ecc71)
					.setTimestamp();

				return reply({ embeds: [embed] });
			} catch (stickerErr) {
				console.error('[steal] Failed to create sticker:', stickerErr);
				// Fall back to trying to create it as an emoji instead if sticker creation failed
				try {
					const createdEmoji = await guild.emojis.create({
						attachment: url,
						name: name
					});

					const embed = new EmbedBuilder()
						.setTitle('✨ Emoji Stolen Successfully!')
						.setDescription(`Sticker slots were full or format rejected, so it was added as emoji **:${createdEmoji.name}:** instead!`)
						.setThumbnail(createdEmoji.url)
						.setColor(0xe67e22)
						.setTimestamp();

					return reply({ embeds: [embed] });
				} catch (emojiErr) {
					throw new Error(`Failed to create sticker: ${stickerErr.message}. Fallback emoji creation also failed: ${emojiErr.message}`);
				}
			}
		} else {
			// Create custom emoji
			const createdEmoji = await guild.emojis.create({
				attachment: url,
				name: name
			});

			const embed = new EmbedBuilder()
				.setTitle('✨ Emoji Stolen Successfully!')
				.setDescription(`Successfully cloned and added emoji: **${createdEmoji}** (\`:${createdEmoji.name}:\`)`)
				.setThumbnail(createdEmoji.url)
				.setColor(0x2ecc71)
				.setTimestamp();

			return reply({ embeds: [embed] });
		}

	} catch (error) {
		console.error('[steal] Error stealing emoji/sticker:', error);
		let errorMsg = '❌ Failed to steal emoji/sticker. ';
		if (error.message.includes('Limit reached')) {
			errorMsg += 'The server has reached its emoji or sticker limit.';
		} else if (error.message.includes('Missing Permissions')) {
			errorMsg += 'Please make sure I have "Manage Guild Expressions" or "Manage Emojis and Stickers" permission.';
		} else {
			errorMsg += `Error: ${error.message}`;
		}
		return reply(errorMsg);
	}
}
