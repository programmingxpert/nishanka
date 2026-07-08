/* eslint-disable */
const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

const CRIMES = [
    "Spamming -ping command",
    "Hoarding Glimmering Baubles",
    "Robbing server administrators",
    "Being excessively cute on chat",
    "Stealing coffee cooldown boosts",
    "Causing music node disconnects",
    "Using light theme in dashboard",
    "Attempting to cheat at Mines",
    "Refusing to claim daily rewards",
    "Disturbing Zeyuki during development"
];

async function generateWantedPoster(user, displayName) {
    const canvas = createCanvas(500, 700);
    const ctx = canvas.getContext('2d');

    // 1. Parchment Background
    ctx.fillStyle = '#e6d6b8';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Borders
    ctx.strokeStyle = '#4a2f13';
    ctx.lineWidth = 15;
    ctx.strokeRect(7.5, 7.5, canvas.width - 15, canvas.height - 15);

    ctx.strokeStyle = '#4a2f13';
    ctx.lineWidth = 2;
    ctx.strokeRect(22, 22, canvas.width - 44, canvas.height - 44);

    // 3. Header Text
    ctx.fillStyle = '#2a1505';
    ctx.textAlign = 'center';
    
    ctx.font = 'bold 65px Georgia, serif';
    ctx.fillText('WANTED', 250, 100);

    ctx.font = 'bold 26px Georgia, serif';
    ctx.fillText('DEAD OR ALIVE', 250, 145);

    // 4. Avatar and Frame
    const avatarUrl = user.displayAvatarURL({ extension: 'png', size: 256 });
    let avatar;
    try {
        avatar = await loadImage(avatarUrl);
    } catch (e) {
        // Fallback placeholder if avatar load fails
        avatar = null;
    }

    // Draw frame border
    ctx.strokeStyle = '#4a2f13';
    ctx.lineWidth = 6;
    ctx.strokeRect(120, 180, 260, 260);

    if (avatar) {
        ctx.drawImage(avatar, 125, 185, 250, 250);
        
        // Grayscale & Sepia effect via overlay
        ctx.fillStyle = 'rgba(139, 90, 43, 0.25)'; // Sepia tone tint
        ctx.fillRect(125, 185, 250, 250);
        
        // Add subtle overlay noise or vignette lines to make it look old
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        for (let i = 0; i < 250; i += 6) {
            ctx.fillRect(125, 185 + i, 250, 2);
        }
    } else {
        // Placeholder text if no avatar
        ctx.fillStyle = '#4a2f13';
        ctx.font = '30px Georgia, serif';
        ctx.fillText('NO PHOTO', 250, 310);
    }

    // 5. Name and Crime Info
    ctx.fillStyle = '#2a1505';
    
    // Display Name
    ctx.font = 'bold 32px Georgia, serif';
    ctx.fillText(displayName.toUpperCase(), 250, 490);

    // Crime
    const crime = CRIMES[Math.floor(Math.random() * CRIMES.length)];
    ctx.font = 'italic 18px Georgia, serif';
    ctx.fillText(`For: ${crime}`, 250, 530);

    // 6. Reward Info
    ctx.font = 'bold 24px Georgia, serif';
    ctx.fillText('REWARD', 250, 595);

    // Reward amount
    ctx.fillStyle = '#a92a2a'; // rustic deep red
    ctx.font = 'bold 36px Georgia, serif';
    ctx.fillText('50,000 BAUBLES', 250, 640);

    // Save to buffer
    const buffer = await canvas.encode('png');
    return new AttachmentBuilder(buffer, { name: 'wanted.png' });
}

module.exports = {
    category: 'fun',
    cooldown: 10,
    data: new SlashCommandBuilder()
        .setName('wanted')
        .setDescription('Generate a vintage Wanted poster for a user!')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to put on the bounty board (optional)')
                .setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply();
        const user = interaction.options.getUser('user') || interaction.user;
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        const displayName = member ? member.displayName : user.username;

        try {
            const attachment = await generateWantedPoster(user, displayName);
            await interaction.editReply({ files: [attachment] });
        } catch (err) {
            console.error('Wanted command error:', err);
            await interaction.editReply('❌ Failed to generate wanted poster.');
        }
    },

    async executePrefix(message, args) {
        const user = message.mentions.users.first() 
            || (args[0] ? await message.client.users.fetch(args[0].replace(/[<@!>]/g, '')).catch(() => null) : null) 
            || message.author;

        const msg = await message.reply('🤠 Drafting bounty poster...');
        const member = await message.guild.members.fetch(user.id).catch(() => null);
        const displayName = member ? member.displayName : user.username;

        try {
            const attachment = await generateWantedPoster(user, displayName);
            await msg.delete().catch(() => {});
            await message.reply({ files: [attachment] });
        } catch (err) {
            console.error('Wanted command error:', err);
            await msg.edit('❌ Failed to generate wanted poster.');
        }
    }
};
