/* eslint-disable */
const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');
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

async function createGifBuffer(images, delay, effect) {
    const firstImage = images[0];
    let width = firstImage.width;
    let height = firstImage.height;

    // Constrain dimensions to keep encoding fast and memory usage low
    const maxDimension = 300;
    if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
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

    const validEffects = ['spin', 'shake', 'bounce', 'fade'];
    const activeEffect = validEffects.includes(effect) ? effect : null;

    if (images.length === 1 && activeEffect) {
        const totalFrames = activeEffect === 'shake' || activeEffect === 'fade' ? 10 : 18;
        for (let i = 0; i < totalFrames; i++) {
            ctx.clearRect(0, 0, width, height);
            ctx.save();

            if (activeEffect === 'spin') {
                ctx.translate(width / 2, height / 2);
                ctx.rotate((2 * Math.PI * i) / totalFrames);
                ctx.drawImage(images[0], -width / 2, -height / 2, width, height);
            } else if (activeEffect === 'shake') {
                const dx = (Math.random() - 0.5) * (width * 0.08);
                const dy = (Math.random() - 0.5) * (height * 0.08);
                ctx.drawImage(images[0], dx, dy, width, height);
            } else if (activeEffect === 'bounce') {
                const offset = Math.sin((i / totalFrames) * 2 * Math.PI) * (height * 0.15);
                const squish = Math.max(0, -offset * 0.25);
                ctx.drawImage(images[0], squish / 2, offset + squish, width - squish, height - squish);
            } else if (activeEffect === 'fade') {
                const alpha = 0.15 + 0.85 * Math.abs(Math.cos((i / totalFrames) * Math.PI));
                ctx.globalAlpha = alpha;
                ctx.drawImage(images[0], 0, 0, width, height);
            }

            ctx.restore();
            encoder.addFrame(ctx);
        }
    } else {
        // Sequentially render images (either multiple, or single with no effect)
        for (const img of images) {
            ctx.clearRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            encoder.addFrame(ctx);
        }
    }

    encoder.finish();
    return await gifPromise;
}

module.exports = {
    category: 'fun',
    cooldown: 8,
    data: new SlashCommandBuilder()
        .setName('togif')
        .setDescription('Convert images or apply effects to create an animated GIF!')
        .addAttachmentOption(option =>
            option.setName('image1')
                .setDescription('The first image to convert or apply effect to')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('delay')
                .setDescription('Delay between frames in milliseconds (default: 500ms)')
                .setRequired(false)
                .setMinValue(50)
                .setMaxValue(2000))
        .addStringOption(option =>
            option.setName('effect')
                .setDescription('Effect to apply if converting a single image')
                .setRequired(false)
                .addChoices(
                    { name: 'Spin', value: 'spin' },
                    { name: 'Shake', value: 'shake' },
                    { name: 'Bounce', value: 'bounce' },
                    { name: 'Fade', value: 'fade' }
                ))
        .addAttachmentOption(option =>
            option.setName('image2')
                .setDescription('The second image (optional)')
                .setRequired(false))
        .addAttachmentOption(option =>
            option.setName('image3')
                .setDescription('The third image (optional)')
                .setRequired(false))
        .addAttachmentOption(option =>
            option.setName('image4')
                .setDescription('The fourth image (optional)')
                .setRequired(false))
        .addAttachmentOption(option =>
            option.setName('image5')
                .setDescription('The fifth image (optional)')
                .setRequired(false))
        .addAttachmentOption(option =>
            option.setName('image6')
                .setDescription('The sixth image (optional)')
                .setRequired(false))
        .addAttachmentOption(option =>
            option.setName('image7')
                .setDescription('The seventh image (optional)')
                .setRequired(false))
        .addAttachmentOption(option =>
            option.setName('image8')
                .setDescription('The eighth image (optional)')
                .setRequired(false))
        .addAttachmentOption(option =>
            option.setName('image9')
                .setDescription('The ninth image (optional)')
                .setRequired(false))
        .addAttachmentOption(option =>
            option.setName('image10')
                .setDescription('The tenth image (optional)')
                .setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply();
        
        const delay = interaction.options.getInteger('delay') || 500;
        const effect = interaction.options.getString('effect');
        
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

            const gifBuffer = await createGifBuffer(images, delay, effect);
            const attachment = new AttachmentBuilder(gifBuffer, { name: 'rendered.gif' });
            
            let followUp = '';
            if (images.length === 1 && !effect) {
                followUp = '\n*Tip: Specify an effect (`spin`, `shake`, `bounce`, `fade`) to animate a single image!*';
            }

            await interaction.editReply({ 
                content: `✅ Generated GIF with ${images.length} frame(s) (delay: ${delay}ms).${followUp}`, 
                files: [attachment] 
            });
        } catch (err) {
            console.error('togif slash command error:', err);
            await interaction.editReply('❌ An error occurred while generating the GIF.');
        }
    },

    async executePrefix(message, args) {
        // Parse arguments: e.g. -togif [delay] [effect]
        let delay = 500;
        let effect = null;
        
        const delayArg = args[0];
        const effectArg = args[1];

        if (delayArg) {
            const parsed = parseInt(delayArg);
            if (!isNaN(parsed)) {
                delay = Math.max(50, Math.min(2000, parsed));
                if (effectArg) {
                    effect = effectArg.toLowerCase();
                }
            } else {
                effect = delayArg.toLowerCase();
                if (effectArg) {
                    const parsed2 = parseInt(effectArg);
                    if (!isNaN(parsed2)) {
                        delay = Math.max(50, Math.min(2000, parsed2));
                    }
                }
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

        const statusMsg = await message.reply('🎞️ Generating GIF... please wait.');

        try {
            const images = [];
            for (const url of urls) {
                const img = await loadImageSafe(url);
                if (img) images.push(img);
            }

            if (images.length === 0) {
                return statusMsg.edit('❌ Failed to load any images from input.');
            }

            const gifBuffer = await createGifBuffer(images, delay, effect);
            const attachment = new AttachmentBuilder(gifBuffer, { name: 'rendered.gif' });

            let followUp = '';
            if (images.length === 1 && !effect) {
                followUp = '\n*Tip: Specify an effect (`spin`, `shake`, `bounce`, `fade`) to animate a single image!*';
            }

            await statusMsg.delete().catch(() => {});
            await message.reply({
                content: `✅ Generated GIF with ${images.length} frame(s) (delay: ${delay}ms).${followUp}`,
                files: [attachment]
            });
        } catch (err) {
            console.error('togif prefix command error:', err);
            await statusMsg.edit('❌ Failed to encode GIF. Make sure image dimensions are valid.');
        }
    }
};
