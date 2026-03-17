/* eslint-disable */
const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');

const emojiURLs = {
	heart: 'https://png.pngtree.com/png-clipart/20220902/ourmid/pngtree-red-heart-shaped-icon-png-image_6135253.png',
	broken: 'https://emojiisland.com/cdn/shop/products/Broken_Red_Heart_Emoji_large.png?v=1571606066',
	skull: 'https://emoji.iamrohit.in/img-apple/1f480.png'
};

function getOverlayEmoji(score) {
	if (score >= 50) return emojiURLs.heart;
	if (score >= 20) return emojiURLs.broken;
	return emojiURLs.skull;
}

function getLoveMessage(score) {
	if (score === 100) return "ABSOLUTE CINEMA!";
	
	if (score >= 90) {
		const msgs = ["Meant for eachother!", "Soulmates confirmed. 💖", "A match made in heaven!", "True Love! 🥰"];
		return msgs[Math.floor(Math.random() * msgs.length)];
	}
	if (score >= 70) {
		const msgs = ["Damn, they really do love each other!", "Sparks are flying! ✨", "Looking good together! 😍"];
		return msgs[Math.floor(Math.random() * msgs.length)];
	}
	if (score >= 50) {
		const msgs = ["Not bad! There is potential here. 🙂", "Maybe just friends, maybe more? 🤔", "A solid connection!"];
		return msgs[Math.floor(Math.random() * msgs.length)];
	}
	if (score >= 30) {
		const msgs = ["Bit rocky... but love can surprise! 😬", "It's gonna take some work. 😅", "Friendzone material?"];
		return msgs[Math.floor(Math.random() * msgs.length)];
	}
	if (score >= 10) {
		const msgs = ["Awkward... maybe just friends. 🥶", "Yikes. Don't force it.", "There is always plenty of fish in the sea."];
		return msgs[Math.floor(Math.random() * msgs.length)];
	}
	
	const msgs = ["💀 Run. Just run.", "Negative chemistry.", "Rest in peace to this relationship.", "Absolutely not."];
	return msgs[Math.floor(Math.random() * msgs.length)];
}

function drawMeter(ctx, score, x, y, width = 500, height = 30) {
	const bgColor = '#444444';
	const fillColor =
		score >= 50 ? '#FF4F7A' : score >= 20 ? '#FFAA4F' : '#888888';

	// Background track
	ctx.fillStyle = bgColor;
	ctx.beginPath();
	ctx.roundRect(x, y, width, height, 15);
	ctx.fill();

	// Foreground fill
	if (score > 0) {
		ctx.fillStyle = fillColor;
		ctx.beginPath();
		// minimum width of 15 for rounded corners if score is very low but > 0
		const fillWidth = Math.max((score / 100) * width, 15); 
		ctx.roundRect(x, y, fillWidth, height, 15);
		ctx.fill();
	}

	// Outline
	ctx.strokeStyle = '#ffffff';
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.roundRect(x, y, width, height, 15);
	ctx.stroke();

	// Draw Text on top of meter
	ctx.fillStyle = '#ffffff';
	ctx.font = 'bold 18px sans-serif';
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillText(`${score}%`, x + width / 2, y + height / 2);
}

async function generateShipImage(user1, user2, score) {
	const canvas = createCanvas(600, 320);
	const ctx = canvas.getContext('2d');

	// Background
	ctx.fillStyle = '#2b2d31'; // modern discord dark background
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	// Load avatars and emoji
	const [avatar1, avatar2, emojiOverlay] = await Promise.all([
		loadImage(user1.displayAvatarURL({ extension: 'png', size: 256 })),
		loadImage(user2.displayAvatarURL({ extension: 'png', size: 256 })),
		loadImage(getOverlayEmoji(score))
	]);

	// Draw avatars (circular clipping)
	ctx.save();
	ctx.beginPath();
	ctx.arc(150, 130, 95, 0, Math.PI * 2, true);
	ctx.closePath();
	ctx.clip();
	ctx.drawImage(avatar1, 55, 35, 190, 190);
	ctx.restore();

	// Avatar 1 border
	ctx.beginPath();
	ctx.arc(150, 130, 95, 0, Math.PI * 2, true);
	ctx.strokeStyle = score >= 50 ? '#FF4F7A' : '#ffffff';
	ctx.lineWidth = 5;
	ctx.stroke();

	ctx.save();
	ctx.beginPath();
	ctx.arc(450, 130, 95, 0, Math.PI * 2, true);
	ctx.closePath();
	ctx.clip();
	ctx.drawImage(avatar2, 355, 35, 190, 190);
	ctx.restore();

	// Avatar 2 border
	ctx.beginPath();
	ctx.arc(450, 130, 95, 0, Math.PI * 2, true);
	ctx.strokeStyle = score >= 50 ? '#FF4F7A' : '#ffffff';
	ctx.lineWidth = 5;
	ctx.stroke();

	// Draw emoji in the center
	ctx.drawImage(emojiOverlay, 260, 85, 80, 80);

	// Draw percentage meter
	drawMeter(ctx, score, 50, 260, 500, 30);

	// Save to buffer
	const buffer = await canvas.encode('png');
	return new AttachmentBuilder(buffer, { name: 'ship.png' });
}

function generateCoupleName(displayName1, displayName2) {
	const name1 = displayName1.replace(/\s/g, ''); // Remove spaces
	const name2 = displayName2.replace(/\s/g, ''); // Remove spaces

	const len1 = Math.round(name1.length / 2);
	const len2 = Math.round(name2.length / 2);

	const part1 = name1.slice(0, len1);
	const part2 = name2.slice(len2 > 0 ? len2 - 1 : 0);

	return part1 + part2;
}

module.exports = {
	category: 'fun',
	cooldown: 5,
	data: new SlashCommandBuilder()
		.setName('ship')
		.setDescription('Calculate the love compatibility between two users!')
		.addUserOption(option =>
			option.setName('user1')
				.setDescription('First user to ship (optional)')
				.setRequired(false))
		.addUserOption(option =>
			option.setName('user2')
				.setDescription('Second user to ship (optional)')
				.setRequired(false)),

	async execute(interaction) {
		await interaction.deferReply();
		
		let user1 = interaction.options.getUser('user1');
		let user2 = interaction.options.getUser('user2');

		if (!user1 && !user2) {
			user1 = interaction.user;
			const members = await interaction.guild.members.fetch();
			const theOthers = members.filter(m => !m.user.bot && m.id !== user1.id);
			if (theOthers.size > 0) {
				user2 = theOthers.random().user;
			}
		} else if (user1 && !user2) {
			user2 = user1;
			user1 = interaction.user;
		}

		if (!user2) {
			return interaction.editReply({ content: 'Could not find a second user to ship!' });
		}

		if (user1.id === user2.id) {
			return interaction.editReply({ content: 'You can’t ship someone with themselves! 😹' });
		}

		const member1 = await interaction.guild.members.fetch(user1.id).catch(() => null);
		const member2 = await interaction.guild.members.fetch(user2.id).catch(() => null);

		const displayName1 = member1 ? member1.displayName : user1.username;
		const displayName2 = member2 ? member2.displayName : user2.username;

		const score = Math.floor(Math.random() * 101); // 0 to 100
		const image = await generateShipImage(user1, user2, score);
		const coupleName = generateCoupleName(displayName1, displayName2);
		const message = getLoveMessage(score);

		const embed = new EmbedBuilder()
			.setColor(0xFF69B4)
			.setTitle(`💘 Love Match`)
			.addFields({name: "Couple Name", value: coupleName})
			.setDescription(`**${displayName1}** x **${displayName2}**\n\n${message}`)
			.setImage('attachment://ship.png')
			.setFooter({ text: 'Nishanka ©️' })
			.setTimestamp();

		await interaction.editReply({ embeds: [embed], files: [image] });
	},

	async executePrefix(message, args) {
		let user1 = message.mentions.users.at(0);
		let user2 = message.mentions.users.at(1);
		
		if (!user1 && args.length > 0) {
			// fallback check if they just provided IDs
			const u1ID = args[0].replace(/[<@!>]/g, '');
			try {
				user1 = await message.client.users.fetch(u1ID);
			} catch (e) {
				// not a valid ID
			}
			
			if (user1 && args.length > 1) {
				const u2ID = args[1].replace(/[<@!>]/g, '');
				try {
					user2 = await message.client.users.fetch(u2ID);
				} catch (e) {
					// not a valid ID
				}
			}
		}

		if (!user1 && !user2) {
			user1 = message.author;
			const members = await message.guild.members.fetch();
			const theOthers = members.filter(m => !m.user.bot && m.id !== user1.id);
			if (theOthers.size > 0) {
				user2 = theOthers.random().user;
			}
		} else if (user1 && !user2) {
			user2 = user1;
			user1 = message.author;
		}

		if (!user2) {
			return message.reply('Could not find a second user to ship!');
		}

		if (user1.id === user2.id) return message.reply('You can’t ship someone with themselves! 😹');

		const msg = await message.reply('Calculating love percentage... 💘');

		const member1 = await message.guild.members.fetch(user1.id).catch(() => null);
		const member2 = await message.guild.members.fetch(user2.id).catch(() => null);

		const displayName1 = member1 ? member1.displayName : user1.username;
		const displayName2 = member2 ? member2.displayName : user2.username;

		const score = Math.floor(Math.random() * 101); // 0 to 100
		const image = await generateShipImage(user1, user2, score);
		const coupleName = generateCoupleName(displayName1, displayName2);
		const messageText = getLoveMessage(score);

		const embed = new EmbedBuilder()
			.setColor(0xFF69B4)
			.setTitle(`💘 Love Match`)
			.addFields({name: "Couple Name", value: coupleName})
			.setDescription(`**${displayName1}** x **${displayName2}**\n\n${messageText}`)
			.setImage('attachment://ship.png')
			.setFooter({ text: 'Nishanka ©️' })
			.setTimestamp();

		await msg.edit({ content: null, embeds: [embed], files: [image] });
	}
};
