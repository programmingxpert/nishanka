/* eslint-disable */
const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const GIFEncoder = require('gif-encoder-2');

async function loadImageSafe(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`Failed to fetch image: ${url} (status: ${response.status})`);
            return null;
        }
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        return await loadImage(buffer);
    } catch (err) {
        console.error(`Error loading image from ${url}:`, err);
        return null;
    }
}

async function createGifBuffer(images, delay) {
    const firstImage = images[0];
    let width = firstImage.width;
    let height = firstImage.height;

    if (images.length === 1) {
        // Single static image: keep original size but cap at a reasonable maximum
        const maxDimension = 2000;
        if (width > maxDimension || height > maxDimension) {
            const ratio = Math.min(maxDimension / width, maxDimension / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
        }
    } else {
        // Multiple images: resize to fit max 500px for animation efficiency
        const maxDimension = 500;
        if (width > maxDimension || height > maxDimension) {
            const ratio = Math.min(maxDimension / width, maxDimension / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
        }
    }

    const encoder = new GIFEncoder(width, height, 'neuquant', true);
    const stream = encoder.createReadStream();
    
    const gifPromise = new Promise((resolve, reject) => {
        const chunks = [];
        stream.on('data', chunk => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', err => reject(err));
    });

    encoder.start();
    encoder.setRepeat(0); // Loop forever
    encoder.setDelay(delay);
    encoder.setQuality(10);

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Render each image into the encoder
    for (const img of images) {
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        encoder.addFrame(ctx);
    }

    encoder.finish();
    return await gifPromise;
}

module.exports = {
    category: 'utility',
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('togif')
        .setDescription('Convert static images (PNG/JPG/WebP) directly into GIF format!')
        .addAttachmentOption(option =>
            option.setName('image1')
                .setDescription('The image to convert to GIF')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('delay')
                .setDescription('Delay between frames in milliseconds (only for multiple images, default: 500ms)')
                .setRequired(false)
                .setMinValue(50)
                .setMaxValue(2000))
        .addAttachmentOption(option =>
            option.setName('image2')
                .setDescription('Additional image for animated GIF (optional)')
                .setRequired(false))
        .addAttachmentOption(option =>
            option.setName('image3')
                .setDescription('Additional image for animated GIF (optional)')
                .setRequired(false))
        .addAttachmentOption(option =>
            option.setName('image4')
                .setDescription('Additional image for animated GIF (optional)')
                .setRequired(false))
        .addAttachmentOption(option =>
            option.setName('image5')
                .setDescription('Additional image for animated GIF (optional)')
                .setRequired(false))
        .addAttachmentOption(option =>
            option.setName('image6')
                .setDescription('Additional image for animated GIF (optional)')
                .setRequired(false))
        .addAttachmentOption(option =>
            option.setName('image7')
                .setDescription('Additional image for animated GIF (optional)')
                .setRequired(false))
        .addAttachmentOption(option =>
            option.setName('image8')
                .setDescription('Additional image for animated GIF (optional)')
                .setRequired(false))
        .addAttachmentOption(option =>
            option.setName('image9')
                .setDescription('Additional image for animated GIF (optional)')
                .setRequired(false))
        .addAttachmentOption(option =>
            option.setName('image10')
                .setDescription('Additional image for animated GIF (optional)')
                .setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply();
        
        const delay = interaction.options.getInteger('delay') || 500;
        
        const urls = [];
        const imageOptions = ['image1', 'image2', 'image3', 'image4', 'image5', 'image6', 'image7', 'image8', 'image9', 'image10'];
        for (const optName of imageOptions) {
            const attachment = interaction.options.getAttachment(optName);
            if (attachment && attachment.contentType?.startsWith('image/')) {
                urls.push(attachment.url);
            }
        }

        if (urls.length === 0) {
            return interaction.editReply('❌ No valid images uploaded.');
        }

        try {
            const images = [];
            for (const url of urls) {
                const img = await loadImageSafe(url);
                if (img) images.push(img);
            }

            if (images.length === 0) {
                return interaction.editReply('❌ Failed to load the specified images.');
            }

            const gifBuffer = await createGifBuffer(images, delay);
            const attachment = new AttachmentBuilder(gifBuffer, { name: 'converted.gif' });
            
            await interaction.editReply({ 
                content: `✅ Converted image(s) to GIF format successfully.`, 
                files: [attachment] 
            });
        } catch (err) {
            console.error('togif slash command error:', err);
            await interaction.editReply('❌ An error occurred while generating the GIF.');
        }
    },

    async executePrefix(message, args) {
        // Parse arguments: e.g. -togif [delay]
        let delay = 500;
        if (args[0]) {
            const parsed = parseInt(args[0]);
            if (!isNaN(parsed)) {
                delay = Math.max(50, Math.min(2000, parsed));
            }
        }

        const urls = [];

        // 1. Check current message attachments
        if (message.attachments.size > 0) {
            message.attachments.forEach(att => {
                if (att.contentType?.startsWith('image/') || att.url.match(/\.(png|jpe?g|webp|gif)$/i)) {
                    urls.push(att.url);
                }
            });
        }

        // 2. Check replied message attachments
        if (urls.length === 0 && message.reference && message.reference.messageId) {
            const repliedMessage = await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
            if (repliedMessage) {
                if (repliedMessage.attachments.size > 0) {
                    repliedMessage.attachments.forEach(att => {
                        if (att.contentType?.startsWith('image/') || att.url.match(/\.(png|jpe?g|webp|gif)$/i)) {
                            urls.push(att.url);
                        }
                    });
                }
                if (urls.length === 0 && repliedMessage.embeds.length > 0) {
                    repliedMessage.embeds.forEach(embed => {
                        if (embed.image) {
                            urls.push(embed.image.url);
                        } else if (embed.thumbnail) {
                            urls.push(embed.thumbnail.url);
                        }
                    });
                }
            }
        }

        // 3. Check mentions (use avatars)
        if (urls.length === 0 && message.mentions.users.size > 0) {
            message.mentions.users.forEach(user => {
                urls.push(user.displayAvatarURL({ extension: 'png', size: 256 }));
            });
        }

        // 4. Check for direct URLs in arguments
        if (urls.length === 0) {
            args.forEach(arg => {
                if (arg.startsWith('http://') || arg.startsWith('https://')) {
                    urls.push(arg);
                }
            });
        }

        // 5. Fallback to author avatar
        if (urls.length === 0) {
            urls.push(message.author.displayAvatarURL({ extension: 'png', size: 256 }));
        }

        const statusMsg = await message.reply('🎞️ Converting image to GIF... please wait.');

        try {
            const images = [];
            for (const url of urls) {
                const img = await loadImageSafe(url);
                if (img) images.push(img);
            }

            if (images.length === 0) {
                return statusMsg.edit('❌ Failed to load any images from input.');
            }

            const gifBuffer = await createGifBuffer(images, delay);
            const attachment = new AttachmentBuilder(gifBuffer, { name: 'converted.gif' });

            await statusMsg.delete().catch(() => {});
            await message.reply({
                content: `✅ Converted image(s) to GIF format successfully.`,
                files: [attachment]
            });
        } catch (err) {
            console.error('togif prefix command error:', err);
            await statusMsg.edit('❌ Failed to encode GIF. Make sure image dimensions are valid.');
        }
    }
};
