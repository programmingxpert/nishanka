const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');
const { checkCommandPermission } = require('../../utils/permissions');

function resolveColor(colorStr) {
    if (!colorStr) return 0x7c6cf0; // Fallback to brand purple
    
    // Check hex color
    if (/^#[0-9A-F]{6}$/i.test(colorStr)) {
        return parseInt(colorStr.replace('#', '0x'), 16);
    }
    if (/^0x[0-9A-F]{6}$/i.test(colorStr)) {
        return parseInt(colorStr, 16);
    }

    // Common color names mapping
    const colors = {
        red: 0xef4444,
        blue: 0x3b82f6,
        green: 0x10b981,
        yellow: 0xf59e0b,
        orange: 0xf97316,
        purple: 0x8b5cf6,
        pink: 0xec4899,
        teal: 0x14b8a6,
        gold: 0xd97706,
        black: 0x111827,
        white: 0xf9fafb,
        gray: 0x6b7280
    };

    return colors[colorStr.toLowerCase()] || 0x7c6cf0;
}

// Simple flag parser helper for prefix command
function parsePrefixArgs(args) {
    const text = args.join(' ');
    const flags = {
        title: null,
        color: null,
        persona: null,
        name: null,
        avatar: null,
        image: null,
        message: ''
    };

    // Regex to match flags like --title "..." or --color #ff0000 or --image "url"
    const flagRegex = /--(title|color|persona|name|avatar|image)\s+(?:"([^"]+)"|'([^']+)'|(\S+))/g;
    let match;
    let cleanText = text;

    while ((match = flagRegex.exec(text)) !== null) {
        const flagName = match[1];
        const flagValue = match[2] || match[3] || match[4];
        flags[flagName] = flagValue;
        cleanText = cleanText.replace(match[0], '');
    }

    flags.message = cleanText.trim().replace(/\s+/g, ' ');
    return flags;
}

async function sendAsPersona(channel, personaName, avatarURL, embed) {
    const me = channel.guild.members.me;
    if (!me.permissions.has('ManageWebhooks')) {
        // Fallback: send as bot itself
        await channel.send({ embeds: [embed] });
        return;
    }

    try {
        const webhook = await channel.createWebhook({
            name: personaName.substring(0, 32),
            avatar: avatarURL
        });

        await webhook.send({
            embeds: [embed]
        });

        await webhook.delete().catch(() => {});
    } catch (err) {
        console.error('[Announce Webhook] Error sending persona message:', err);
        // Fallback: send as bot itself
        await channel.send({ embeds: [embed] });
    }
}

module.exports = {
    category: 'utility',
    cooldown: 3,
    data: new SlashCommandBuilder()
        .setName('announce')
        .setDescription('Create a professionally styled announcement embed.')
        .addStringOption(option =>
            option.setName('message')
                .setDescription('The announcement description text')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('color')
                .setDescription('Stripe color (Hex code e.g. #ff0000 or name like red, blue, green)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('title')
                .setDescription('Title of the announcement embed')
                .setRequired(false))
        .addAttachmentOption(option =>
            option.setName('media')
                .setDescription('Attach an image/video/gif')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('persona')
                .setDescription('Use an announcement persona')
                .setRequired(false)
                .addChoices(
                    { name: 'None (Send as bot)', value: 'none' },
                    { name: 'Nishanka AI', value: 'nishanka' },
                    { name: 'Custom Persona (Requires custom_name option)', value: 'custom' }
                ))
        .addStringOption(option =>
            option.setName('custom_name')
                .setDescription('Custom persona display name (used with Custom Persona)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('custom_avatar')
                .setDescription('Custom persona avatar URL (used with Custom Persona)')
                .setRequired(false)),

    async execute(interaction) {
        if (!await checkCommandPermission(interaction, 'embed') && !await checkCommandPermission(interaction, 'bot')) {
            return interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
        }

        const messageContent = interaction.options.getString('message');
        const colorStr = interaction.options.getString('color');
        const title = interaction.options.getString('title');
        const media = interaction.options.getAttachment('media');
        const persona = interaction.options.getString('persona') || 'none';
        const customName = interaction.options.getString('custom_name');
        const customAvatar = interaction.options.getString('custom_avatar');

        const resolvedColor = resolveColor(colorStr);

        const embed = new EmbedBuilder()
            .setColor(resolvedColor)
            .setDescription(messageContent)
            .setTimestamp();

        if (title) {
            embed.setTitle(title);
        }

        if (media) {
            embed.setImage(media.url);
        }

        await interaction.deferReply({ ephemeral: true });

        if (persona === 'nishanka') {
            const avatarURL = interaction.client.user.displayAvatarURL({ dynamic: true });
            await sendAsPersona(interaction.channel, 'Nishanka', avatarURL, embed);
        } else if (persona === 'custom') {
            if (!customName) {
                return interaction.editReply({ content: '❌ You must specify a `custom_name` when using the custom persona.' });
            }
            const avatarURL = customAvatar || interaction.client.user.displayAvatarURL({ dynamic: true });
            await sendAsPersona(interaction.channel, customName, avatarURL, embed);
        } else {
            await interaction.channel.send({ embeds: [embed] });
        }

        await interaction.editReply({ content: '✅ Announcement posted successfully!' });
    },

    async executePrefix(message, args) {
        if (!await checkCommandPermission(message, 'embed') && !await checkCommandPermission(message, 'bot')) {
            return message.reply('❌ You do not have permission to run this command.');
        }

        if (args.length === 0) {
            return message.reply('❌ Please specify a message. Format: `-announce [--title "Title"] [--color red] [--persona nishanka/custom] [--name "Custom Name"] [--avatar "URL"] [--image "URL"] <message>`');
        }

        await message.delete().catch(() => {});

        const flags = parsePrefixArgs(args);

        if (!flags.message) {
            return message.channel.send('❌ No message content provided for the announcement.');
        }

        const resolvedColor = resolveColor(flags.color);

        const embed = new EmbedBuilder()
            .setColor(resolvedColor)
            .setDescription(flags.message)
            .setTimestamp();

        if (flags.title) {
            embed.setTitle(flags.title);
        }

        const attachment = message.attachments.first();
        if (attachment) {
            embed.setImage(attachment.url);
        } else if (flags.image) {
            embed.setImage(flags.image);
        }

        const personaType = (flags.persona || 'none').toLowerCase();

        if (personaType === 'nishanka') {
            const avatarURL = message.client.user.displayAvatarURL({ dynamic: true });
            await sendAsPersona(message.channel, 'Nishanka', avatarURL, embed);
        } else if (personaType === 'custom') {
            const customName = flags.name || 'Custom Announcer';
            const avatarURL = flags.avatar || message.client.user.displayAvatarURL({ dynamic: true });
            await sendAsPersona(message.channel, customName, avatarURL, embed);
        } else {
            await message.channel.send({ embeds: [embed] });
        }
    }
};
