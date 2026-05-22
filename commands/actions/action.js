const { SlashCommandBuilder } = require('discord.js');
const { sendAnimeAction } = require('../../utils/sendAnimeAction');

const actionsList = [
    'angry', 'baka', 'bite', 'blush', 'bored', 'cry', 'cuddle', 'dance', 'facepalm', 
    'feed', 'handhold', 'handshake', 'happy', 'highfive', 'hug', 'husbando', 'kick', 
    'kiss', 'kitsune', 'laugh', 'lewd', 'lurk', 'neko', 'nod', 'nom', 'nope', 'pat', 
    'peck', 'pout', 'punch', 'run', 'shoot', 'shrug', 'slap', 'sleep', 'smug', 
    'stare', 'think', 'thumbsup', 'tickle', 'touch', 'waifu', 'wave', 'wink', 'yawn', 'yeet'
];

module.exports = {
    category: 'actions',
    data: new SlashCommandBuilder()
        .setName('action')
        .setDescription('Perform an anime action!')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('The type of action to perform')
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Optional user to target')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('message')
                .setDescription('An optional message to send with the action')
                .setRequired(false)
        ),

    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        const filtered = actionsList.filter(choice => choice.startsWith(focusedValue)).slice(0, 25);
        await interaction.respond(
            filtered.map(choice => ({ name: choice.charAt(0).toUpperCase() + choice.slice(1), value: choice }))
        );
    },

    async execute(interaction) {
        const actionType = interaction.options.getString('type').toLowerCase();
        const user = interaction.options.getUser('user');
        const customMsg = interaction.options.getString('message');

        if (!actionsList.includes(actionType)) {
            return interaction.reply({ content: `❌ Invalid action type. Choose from: ${actionsList.join(', ')}`, ephemeral: true });
        }

        const actionColors = {
            angry: 0xd32f2f,
            cry: 0x1976d2,
            hug: 0xe91e63,
            kiss: 0xe91e63,
            pat: 0x4caf50,
            slap: 0xf44336,
        };
        const color = actionColors[actionType] || 0x7c6cf0;

        const actionEmojis = {
            angry: '😠', baka: '🤪', bite: '😬', blush: '😳', bored: '😑',
            cry: '😭', cuddle: '🤗', dance: '💃', facepalm: '🤦', feed: '🥞',
            handhold: '🤝', handshake: '🤝', happy: '😄', highfive: '🙌', hug: '💖',
            husbando: '💍', kick: '👟', kiss: '💋', kitsune: '🦊', laugh: '😂',
            lewd: '😏', lurk: '👀', neko: '🐱', nod: '👍', nom: '😋',
            nope: '🙅', pat: '👋', peck: '😘', pout: '😤', punch: '👊',
            run: '🏃', shoot: '🔫', shrug: '🤷', slap: '💥', sleep: '💤',
            smug: '😏', stare: '👀', think: '🤔', thumbsup: '👍', tickle: '👉',
            touch: '👉', waifu: '💍', wave: '👋', wink: '😉', yawn: '🥱', yeet: '🚀'
        };
        const emoji = actionEmojis[actionType] || '✨';

        await interaction.deferReply();

        await sendAnimeAction({
            interaction,
            message: null,
            targetUser: user || interaction.user,
            customMsg,
            actionType,
            emoji,
            color
        });
    }
};
