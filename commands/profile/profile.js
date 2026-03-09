// commands/profile/profile.js
/* eslint-disable */
const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');
//const Canvas = require('canvas');
const Canvas = require('@napi-rs/canvas');
const Profile = require('../../models/profileSchema');
const Bauble = require('../../models/baubleSchema'); // Assumes your bauble schema stores "baubles" for each user

module.exports = {
    category: 'profile',
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('View a user’s customizable profile.')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user whose profile you want to view')
                .setRequired(false)
        ),

    async execute(interaction) {
        try {
            // Use the provided target or default to the command user.
            const targetUser = interaction.options.getUser('target') || interaction.user;

            // Get profile data (create one if it doesn't exist).
            let profileData = await Profile.findOne({ userId: targetUser.id });
            if (!profileData) {
                profileData = new Profile({
                    userId: targetUser.id,
                    bio: "This is my bio!",
                    bannerColor: "#7289DA",
                    customDisplayName: "",
                    pfpUrl: "",
                    bannerUrl: "",
                    private: false,
                    showBaubles: true
                });
                await profileData.save();
            }

            // Get bauble balance from your bauble system (defaults to 0 if not set)
            let baubleBalance = 0;
            // IMPORTANT: Query using ONLY userId
            let baubleData = await Bauble.findOne({ userId: targetUser.id });
            if (baubleData && typeof baubleData.baubles === 'number') {
                baubleBalance = baubleData.baubles;
            }

            // If the profile is private and the requester isn’t the owner, refuse to show.
            if (profileData.private && interaction.user.id !== targetUser.id) {
                return interaction.reply({ content: '❌ This profile is private.', ephemeral: true });
            }

            // Canvas dimensions – increased height for extra text.
            const canvasWidth = 800;
            const canvasHeight = 450; // increased height
            const canvas = Canvas.createCanvas(canvasWidth, canvasHeight);
            const ctx = canvas.getContext('2d');

            // Draw banner: either load a banner image (if provided) or use a solid color.
            if (profileData.bannerUrl) {
                try {
                    const banner = await Canvas.loadImage(profileData.bannerUrl);
                    ctx.drawImage(banner, 0, 0, canvasWidth, 250); // banner in top portion
                } catch (err) {
                    ctx.fillStyle = profileData.bannerColor || "#7289DA";
                    ctx.fillRect(0, 0, canvasWidth, 250);
                }
            } else {
                ctx.fillStyle = profileData.bannerColor || "#7289DA";
                ctx.fillRect(0, 0, canvasWidth, 250);
            }

            // Draw overlay for the info area.
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(0, 250, canvasWidth, canvasHeight - 250);

            // Draw profile picture:
            // Use custom pfpUrl if provided (non-gif) or fall back to Discord avatar.
            const pfpUrl = (profileData.pfpUrl && !profileData.pfpUrl.endsWith('.gif'))
                ? profileData.pfpUrl
                : targetUser.displayAvatarURL({ extension: 'png', size: 256 });
            const avatar = await Canvas.loadImage(pfpUrl);
            const avatarSize = 128;
            ctx.save();
            ctx.beginPath();
            ctx.arc(80, 325, avatarSize / 2, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatar, 16, 261, avatarSize, avatarSize);
            ctx.restore();

            // Determine display name: custom if set, else username.
            const displayName = profileData.customDisplayName || targetUser.username;

            // Draw display name and username.
            ctx.font = '32px sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(displayName, 160, 300);
            ctx.font = '24px sans-serif';
            ctx.fillStyle = '#cccccc';
            ctx.fillText(targetUser.tag, 160, 335);

            // Draw bio text (start below username).
            const bio = profileData.bio || "";
            ctx.font = '20px sans-serif';
            ctx.fillStyle = '#ffffff';
            let bioX = 160;
            let bioY = 370; // start below username
            const bioMaxWidth = canvasWidth - bioX - 20;
            const words = bio.split(' ');
            let line = '', lineHeight = 24;
            for (let word of words) {
                const testLine = line + word + ' ';
                if (ctx.measureText(testLine).width > bioMaxWidth) {
                    ctx.fillText(line, bioX, bioY);
                    line = word + ' ';
                    bioY += lineHeight;
                } else {
                    line = testLine;
                }
            }
            ctx.fillText(line, bioX, bioY);

            // If showBaubles is enabled, draw the balance at bottom right.
            if (profileData.showBaubles) {
                ctx.font = '22px sans-serif';
                ctx.fillStyle = '#FFD700';
                const baubleText = `Baubles: ${baubleBalance}`;
                const textWidth = ctx.measureText(baubleText).width;
                ctx.fillText(baubleText, canvasWidth - textWidth - 20, canvasHeight - 20);
            }

            const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'profile.png' });
            await interaction.reply({ files: [attachment] });

        } catch (error) {
            console.error('Error in profile view command:', error);
            await interaction.reply({ content: '❌ An error occurred while generating the profile.', ephemeral: true });
        }
    },

    // Prefix version – similar to above.
    async executePrefix(message, args) {
        try {
            let targetUser;

            if (message.mentions.users.size > 0) {
                targetUser = message.mentions.users.first();
            } else if (args[0]) {
                try {
                    targetUser = await message.client.users.fetch(args[0]);
                } catch (err) {
                    targetUser = message.author;
                }
            } else {
                targetUser = message.author;
            }

            let profileData = await Profile.findOne({ userId: targetUser.id });
            if (!profileData) {
                profileData = new Profile({
                    userId: targetUser.id,
                    bio: "This is my bio!",
                    bannerColor: "#7289DA",
                    customDisplayName: "",
                    pfpUrl: "",
                    bannerUrl: "",
                    private: false,
                    showBaubles: true
                });
                await profileData.save();
            }

            // Check if profile is private.
            if (profileData.private && message.author.id !== targetUser.id) {
                return message.channel.send('❌ This profile is private.');
            }

            // Get bauble balance
            let baubleBalance = 0;
            // IMPORTANT: Query using ONLY userId
            let baubleData = await Bauble.findOne({ userId: targetUser.id});
            if (baubleData && typeof baubleData.baubles === 'number') {
                baubleBalance = baubleData.baubles;
            }

            // Canvas dimensions updated.
            const canvasWidth = 800, canvasHeight = 450;
            const canvas = Canvas.createCanvas(canvasWidth, canvasHeight);
            const ctx = canvas.getContext('2d');

            // Draw banner.
            if (profileData.bannerUrl) {
                try {
                    const banner = await Canvas.loadImage(profileData.bannerUrl);
                    ctx.drawImage(banner, 0, 0, canvasWidth, 250);
                } catch (err) {
                    ctx.fillStyle = profileData.bannerColor || "#7289DA";
                    ctx.fillRect(0, 0, canvasWidth, 250);
                }
            } else {
                ctx.fillStyle = profileData.bannerColor || "#7289DA";
                ctx.fillRect(0, 0, canvasWidth, 250);
            }

            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(0, 250, canvasWidth, canvasHeight - 250);

            // Draw profile picture.
            const pfpUrl = (profileData.pfpUrl && !profileData.pfpUrl.endsWith('.gif'))
                ? profileData.pfpUrl
                : targetUser.displayAvatarURL({ extension: 'png', size: 256 });
            
            let avatar;
            try {
                avatar = await Canvas.loadImage(pfpUrl);
            } catch (err) {
                // Fallback to default Discord avatar if custom URL or primary avatar 404s
                avatar = await Canvas.loadImage(targetUser.defaultAvatarURL);
            }

            const avatarSize = 128;
            ctx.save();
            ctx.beginPath();
            ctx.arc(80, 325, avatarSize / 2, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatar, 16, 261, avatarSize, avatarSize);
            ctx.restore();

            const displayName = profileData.customDisplayName || targetUser.username;
            ctx.font = '32px sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(displayName, 160, 300);
            ctx.font = '24px sans-serif';
            ctx.fillStyle = '#cccccc';
            ctx.fillText(targetUser.tag, 160, 335);

            const bio = profileData.bio || "";
            ctx.font = '20px sans-serif';
            ctx.fillStyle = '#ffffff';
            let bioX = 160;
            let bioY = 370;
            const bioMaxWidth = canvasWidth - bioX - 20;
            const words = bio.split(' ');
            let line = '', lineHeight = 24;
            for (let word of words) {
                const testLine = line + word + ' ';
                if (ctx.measureText(testLine).width > bioMaxWidth) {
                    ctx.fillText(line, bioX, bioY);
                    line = word + ' ';
                    bioY += lineHeight;
                } else {
                    line = testLine;
                }
            }
            ctx.fillText(line, bioX, bioY);

            if (profileData.showBaubles) {
                ctx.font = '22px sans-serif';
                ctx.fillStyle = '#FFD700';
                const baubleText = `Baubles: ${baubleBalance}`;
                const textWidth = ctx.measureText(baubleText).width;
                ctx.fillText(baubleText, canvasWidth - textWidth - 20, canvasHeight - 20);
            }

            const { AttachmentBuilder } = require('discord.js');
            const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'profile.png' });
            message.channel.send({ files: [attachment] });

        } catch (error) {
            console.error('Error in profile command (prefix):', error);
            message.channel.send('❌ An error occurred while generating the profile.');
        }
    }
};