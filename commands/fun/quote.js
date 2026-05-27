/* eslint-disable */
const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

async function fetchMessageByLinkOrId(client, messageIdOrLink, currentChannel) {
    const linkRegex = /https:\/\/discord\.com\/channels\/\d+\/(\d+)\/(\d+)/;
    const match = messageIdOrLink.match(linkRegex);
    
    let channel = currentChannel;
    let messageId = messageIdOrLink;

    if (match) {
        const channelId = match[1];
        messageId = match[2];
        channel = await client.channels.fetch(channelId).catch(() => null);
    }

    if (!channel) return null;
    return await channel.messages.fetch(messageId).catch(() => null);
}

function wrapText(ctx, text, maxWidth) {
    const words = text.split(/\s+/);
    if (words.length === 0) return [];
    
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = ctx.measureText(currentLine + " " + word).width;
        if (width < maxWidth) {
            currentLine += " " + word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    lines.push(currentLine);
    return lines;
}

async function generateQuoteCard(user, displayName, quoteText, channelName) {
    const canvas = createCanvas(900, 300);
    const ctx = canvas.getContext('2d');

    // 1. Background Gradient
    const grad = ctx.createLinearGradient(0, 0, 900, 300);
    grad.addColorStop(0, '#0d0d14');
    grad.addColorStop(1, '#1b1b26');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Main Outer Border
    ctx.strokeStyle = '#2f2f3f';
    ctx.lineWidth = 3;
    ctx.strokeRect(1.5, 1.5, canvas.width - 3, canvas.height - 3);

    // 3. Watermark Quote Icon
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.font = '240px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('”', 800, 220);

    // 4. Circular Avatar
    const avatarUrl = user.displayAvatarURL({ extension: 'png', size: 256 });
    let avatar;
    try {
        avatar = await loadImage(avatarUrl);
    } catch (e) {
        avatar = null;
    }

    if (avatar) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(110, 150, 75, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, 35, 75, 150, 150);
        ctx.restore();

        // Avatar Border with Glow
        ctx.beginPath();
        ctx.arc(110, 150, 75, 0, Math.PI * 2, true);
        ctx.strokeStyle = '#7c6cf0'; // primary color
        ctx.lineWidth = 4;
        ctx.shadowColor = 'rgba(124, 108, 240, 0.45)';
        ctx.shadowBlur = 15;
        ctx.stroke();
        
        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
    } else {
        // Fallback initials circle
        ctx.beginPath();
        ctx.arc(110, 150, 75, 0, Math.PI * 2, true);
        ctx.fillStyle = '#7c6cf0';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(user.username.slice(0, 2).toUpperCase(), 110, 150);
    }

    // 5. Quoted User Identity
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#ffffff';
    
    // Display Name
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText(displayName, 210, 90);
    
    // Username Tag
    const nameWidth = ctx.measureText(displayName).width;
    ctx.fillStyle = '#8b89ac';
    ctx.font = '18px sans-serif';
    ctx.fillText(`@${user.username}`, 210 + nameWidth + 15, 90);

    // Subtle divider
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(210, 110);
    ctx.lineTo(820, 110);
    ctx.stroke();

    // 6. Wrap and draw Quote Text
    ctx.fillStyle = '#e4e2f5';
    let fontSize = 24;
    let lineHeight = 34;
    ctx.font = `italic ${fontSize}px Georgia, serif`;
    
    let lines = wrapText(ctx, quoteText, 600);

    // Adjust font size dynamically if text is very long
    if (lines.length > 4) {
        fontSize = 20;
        lineHeight = 28;
        ctx.font = `italic ${fontSize}px Georgia, serif`;
        lines = wrapText(ctx, quoteText, 600);
    }
    if (lines.length > 5) {
        fontSize = 16;
        lineHeight = 22;
        ctx.font = `italic ${fontSize}px Georgia, serif`;
        lines = wrapText(ctx, quoteText, 600);
    }

    // Cap lines and append ellipsis if it still overflows
    if (lines.length > 5) {
        lines.length = 5;
        lines[4] = lines[4].slice(0, -3) + '...';
    }

    let startY = 150;
    // Adjust vertical center based on number of lines
    if (lines.length === 1) startY = 165;
    else if (lines.length === 2) startY = 155;
    else if (lines.length === 3) startY = 145;
    else startY = 135;

    lines.forEach((line, index) => {
        ctx.fillText(line, 210, startY + (index * lineHeight));
    });

    // 7. Footer / Attribution
    ctx.fillStyle = '#5a5878';
    ctx.font = 'italic 13px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`— Quoted from #${channelName}`, 840, 270);

    const buffer = await canvas.encode('png');
    return new AttachmentBuilder(buffer, { name: 'quote.png' });
}

module.exports = {
    category: 'fun',
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('quote')
        .setDescription('Create a beautiful image quote of a message or custom text!')
        .addStringOption(option =>
            option.setName('text')
                .setDescription('The custom text to quote (if not replying to a message)')
                .setRequired(false))
        .addUserOption(option =>
            option.setName('author')
                .setDescription('The user to attribute the custom quote to (optional)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('message_link_or_id')
                .setDescription('Link or ID of the message to quote (optional)')
                .setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply();
        const client = interaction.client;
        const textOption = interaction.options.getString('text');
        const authorOption = interaction.options.getUser('author');
        const msgLinkOption = interaction.options.getString('message_link_or_id');

        let quoteText = '';
        let targetUser = null;
        let displayName = '';

        if (msgLinkOption) {
            // 1. Quoting via link/id parameter
            const fetched = await fetchMessageByLinkOrId(client, msgLinkOption, interaction.channel);
            if (!fetched) {
                return interaction.editReply('❌ Could not find the specified message. Verify the link/ID.');
            }
            quoteText = fetched.content;
            targetUser = fetched.author;
            const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
            displayName = member ? member.displayName : targetUser.username;
        } else if (textOption) {
            // 2. Quoting custom text
            quoteText = textOption;
            targetUser = authorOption || interaction.user;
            const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
            displayName = member ? member.displayName : targetUser.username;
        } else {
            // 3. Fallback: check if the interaction channel's message context is referencing a reply?
            // Note: interactions don't inherit target message unless executed as user/message context command.
            return interaction.editReply('❌ Please specify `text` or `message_link_or_id` to generate a quote card.');
        }

        if (!quoteText || quoteText.trim().length === 0) {
            return interaction.editReply('❌ Cannot quote a message with no text content.');
        }

        try {
            const attachment = await generateQuoteCard(targetUser, displayName, quoteText, interaction.channel.name);
            await interaction.editReply({ files: [attachment] });
        } catch (err) {
            console.error('Quote command error:', err);
            await interaction.editReply('❌ Failed to generate quote card.');
        }
    },

    async executePrefix(message, args) {
        const client = message.client;
        let quoteText = '';
        let targetUser = null;
        let displayName = '';

        const refMessageId = message.reference?.messageId;

        if (refMessageId) {
            // 1. Quoting a replied message
            const refMsg = await message.channel.messages.fetch(refMessageId).catch(() => null);
            if (!refMsg) {
                return message.reply('❌ Failed to fetch replied message.').catch(() => {});
            }
            quoteText = refMsg.content;
            targetUser = refMsg.author;
            const member = await message.guild.members.fetch(targetUser.id).catch(() => null);
            displayName = member ? member.displayName : targetUser.username;
        } else if (args.length > 0) {
            // 2. Quoting custom text. Check if a user is mentioned at the end of args
            let lastArg = args[args.length - 1];
            const mentionMatch = lastArg.match(/^<@!?(\d+)>$/);
            
            if (mentionMatch) {
                const targetId = mentionMatch[1];
                targetUser = await client.users.fetch(targetId).catch(() => null);
                args.pop(); // Remove user mention from quote text
            }

            quoteText = args.join(' ');
            if (!targetUser) targetUser = message.author;
            const member = await message.guild.members.fetch(targetUser.id).catch(() => null);
            displayName = member ? member.displayName : targetUser.username;
        } else {
            return message.reply('❌ Reply to a message or type `-quote <text> [@author]` to generate a quote card.').catch(() => {});
        }

        if (!quoteText || quoteText.trim().length === 0) {
            return message.reply('❌ Cannot quote an empty message.').catch(() => {});
        }

        const msg = await message.reply('✍️ Engraving quote card...');

        try {
            const attachment = await generateQuoteCard(targetUser, displayName, quoteText, message.channel.name);
            await msg.delete().catch(() => {});
            await message.reply({ files: [attachment] });
        } catch (err) {
            console.error('Quote command error:', err);
            await msg.edit('❌ Failed to generate quote card.');
        }
    }
};
