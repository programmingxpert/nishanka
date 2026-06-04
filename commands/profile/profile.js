// commands/profile/profile.js
/* eslint-disable */
const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');
//const Canvas = require('canvas');
const Canvas = require('@napi-rs/canvas');
const Profile = require('../../models/profileSchema');
const Bauble = require('../../models/baubleSchema');
const Achievement = require('../../models/achievementSchema'); // Assumes your bauble schema stores "baubles" for each user
const { ACHIEVEMENTS, syncUserAchievements } = require('../../utils/achievements');
const path = require('path');

function getBadgeImageSource(emojiChar) {
    if (emojiChar === '💎') {
        return path.join(__dirname, '..', '..', 'assets', 'emojis', 'png', 'currency-premium-gem.png');
    }
    if (emojiChar === '🚀') {
        return 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f680.png';
    }
    if (emojiChar === '🌟') {
        return 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/2b50.png';
    }
    if (emojiChar === '🥇') {
        return 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f947.png';
    }
    if (emojiChar === '🥷') {
        return 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f977.png';
    }
    if (emojiChar === '🏰') {
        return 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f3f0.png';
    }
    if (emojiChar === '🏺') {
        return 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f3fa.png';
    }
    if (emojiChar === '👑') {
        return 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f451.png';
    }
    if (emojiChar === '⚡') {
        return 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/26a1.png';
    }
    if (emojiChar === '📅') {
        return 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f4c5.png';
    }
    if (emojiChar === '🔱') {
        return 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f531.png';
    }
    if (emojiChar === '🔮') {
        return 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f52e.png';
    }
    if (emojiChar === '🧪') {
        return 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f9ea.png';
    }
    if (emojiChar === '🏛️') {
        return 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f3db.png';
    }
    if (emojiChar === '🎩') {
        return 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f3a9.png';
    }
    return null;
}

function drawCrown(ctx, x, y, width, height) {
    ctx.save();
    
    // Create gold gradient for the main body
    const goldGrad = ctx.createLinearGradient(x, y, x + width, y + height);
    goldGrad.addColorStop(0, '#FFE875');  // Light gold
    goldGrad.addColorStop(0.25, '#F7C621'); // Mid gold
    goldGrad.addColorStop(0.5, '#B38F00');  // Dark gold
    goldGrad.addColorStop(0.75, '#F7C621'); // Mid gold
    goldGrad.addColorStop(1, '#FFE875');   // Light gold

    // Create shadow/border color
    ctx.strokeStyle = '#6E5500';
    ctx.lineWidth = 1.5;
    
    // Draw the main crown body
    ctx.fillStyle = goldGrad;
    ctx.beginPath();
    
    // Start at bottom-left of the crown peaks
    ctx.moveTo(x + width * 0.05, y + height * 0.85);
    
    // Curve up to left peak
    ctx.quadraticCurveTo(x + width * 0.05, y + height * 0.5, x + width * 0.15, y + height * 0.25);
    
    // Left valley
    ctx.quadraticCurveTo(x + width * 0.3, y + height * 0.55, x + width * 0.35, y + height * 0.55);
    
    // Center peak (tallest)
    ctx.quadraticCurveTo(x + width * 0.45, y + height * 0.25, x + width * 0.5, y + height * 0.05);
    
    // Center-to-right valley
    ctx.quadraticCurveTo(x + width * 0.55, y + height * 0.25, x + width * 0.65, y + height * 0.55);
    
    // Right peak
    ctx.quadraticCurveTo(x + width * 0.7, y + height * 0.55, x + width * 0.85, y + height * 0.25);
    
    // Curve down to bottom-right of the crown peaks
    ctx.quadraticCurveTo(x + width * 0.95, y + height * 0.5, x + width * 0.95, y + height * 0.85);
    
    // Bottom curved edge of the body (following the curve of the band)
    ctx.quadraticCurveTo(x + width * 0.5, y + height * 0.95, x + width * 0.05, y + height * 0.85);
    
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Now draw the bottom band (brim)
    const bandGrad = ctx.createLinearGradient(x, y, x + width, y + height);
    bandGrad.addColorStop(0, '#B38F00');
    bandGrad.addColorStop(0.3, '#FFE875');
    bandGrad.addColorStop(0.5, '#947200');
    bandGrad.addColorStop(0.7, '#FFE875');
    bandGrad.addColorStop(1, '#B38F00');
    
    ctx.fillStyle = bandGrad;
    ctx.beginPath();
    ctx.moveTo(x + width * 0.05, y + height * 0.85);
    ctx.quadraticCurveTo(x + width * 0.5, y + height * 0.95, x + width * 0.95, y + height * 0.85);
    ctx.lineTo(x + width * 0.95, y + height * 0.98);
    ctx.quadraticCurveTo(x + width * 0.5, y + height * 1.08, x + width * 0.05, y + height * 0.98);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Draw band gems/pearls (little circles on the bottom band)
    const numBandGems = 5;
    ctx.fillStyle = '#FFFFFF'; // Pearls
    ctx.strokeStyle = '#888888';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < numBandGems; i++) {
        const t = 0.15 + 0.7 * (i / (numBandGems - 1)); // spacing factor
        const gemX = x + width * t;
        const gemY = y + height * 0.89 + (height * 0.05) * Math.sin(t * Math.PI);
        ctx.beginPath();
        ctx.arc(gemX, gemY, width * 0.03, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }

    // Helper to draw a shiny 3D gem
    function drawShinyGem(gemX, gemY, radius, baseColor, highlightColor) {
        ctx.save();
        const gemGrad = ctx.createRadialGradient(
            gemX - radius * 0.3, gemY - radius * 0.3, radius * 0.1,
            gemX, gemY, radius
        );
        gemGrad.addColorStop(0, highlightColor);
        gemGrad.addColorStop(1, baseColor);
        
        ctx.fillStyle = gemGrad;
        ctx.beginPath();
        ctx.arc(gemX, gemY, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Sparkle outline
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
    }

    // Gem radius relative to crown size
    const peakGemRadius = width * 0.07;

    // Draw gems on the 3 peaks
    // Left peak gem: Ruby Red
    drawShinyGem(x + width * 0.15, y + height * 0.25, peakGemRadius, '#800000', '#FF4D4D');
    
    // Center peak gem: Sapphire Blue
    drawShinyGem(x + width * 0.5, y + height * 0.05, peakGemRadius + 1, '#000080', '#4D4DFF');
    
    // Right peak gem: Emerald Green
    drawShinyGem(x + width * 0.85, y + height * 0.25, peakGemRadius, '#006400', '#4DFF4D');

    ctx.restore();
}

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

            // Sync user achievements first
            await syncUserAchievements(interaction.client, targetUser.id);

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
            const hasCrown = baubleData && baubleData.inventory && baubleData.inventory.some(item => item.itemId === 'crown' && item.quantity > 0);
            const userUnlocked = await Achievement.find({ userId: targetUser.id }).lean();
            const unlockedIds = new Set(userUnlocked.map(a => a.achievementId));

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
            const targetMember = interaction.guild.members.cache.get(targetUser.id);
            const pfpUrl = (profileData.pfpUrl && !profileData.pfpUrl.endsWith('.gif'))
                ? profileData.pfpUrl
                : (targetMember ? targetMember.displayAvatarURL({ extension: 'png', size: 256 }) : targetUser.displayAvatarURL({ extension: 'png', size: 256 }));
            const avatar = await Canvas.loadImage(pfpUrl);
            const avatarSize = 128;
            ctx.save();
            ctx.beginPath();
            ctx.arc(80, 325, avatarSize / 2, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatar, 16, 261, avatarSize, avatarSize);
            ctx.restore();

            if (hasCrown) {
                drawCrown(ctx, 55, 229, 50, 35);
            }

            // Determine display name: custom if set, else username.
            const displayName = profileData.customDisplayName || targetUser.username;

            // Draw display name and username.
            ctx.font = '32px sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(displayName, 160, 300);

            let crownOffset = 0;
            if (hasCrown) {
                const nameWidth = ctx.measureText(displayName).width;
                drawCrown(ctx, 160 + nameWidth + 12, 300 - 24, 28, 20);
                crownOffset = 36;
            }
            let badgeOffset = 0;
            const nameWidth = ctx.measureText(displayName).width;
            
            const badgePromises = ACHIEVEMENTS.map(async (ach) => {
                if (ach.isBadge && unlockedIds.has(ach.id)) {
                    const src = getBadgeImageSource(ach.emoji);
                    if (src) {
                        try {
                            const img = await Canvas.loadImage(src);
                            return { ach, img };
                        } catch (err) {
                            console.error(`Failed to load badge image for ${ach.emoji}:`, err);
                        }
                    }
                    return { ach, img: null };
                }
                return null;
            });
            
            const badgesToDraw = (await Promise.all(badgePromises)).filter(Boolean);
            
            for (const item of badgesToDraw) {
                if (item.img) {
                    ctx.drawImage(item.img, 160 + nameWidth + 12 + crownOffset + badgeOffset, 298 - 20, 22, 22);
                } else {
                    ctx.font = '22px sans-serif';
                    ctx.fillStyle = '#ffffff';
                    ctx.fillText(item.ach.emoji, 160 + nameWidth + 12 + crownOffset + badgeOffset, 298);
                }
                badgeOffset += 30;
            }

            ctx.font = '24px sans-serif';
            ctx.fillStyle = '#cccccc';
            ctx.fillText(targetUser.tag, 160, 335);

            const activeTitle = baubleData ? baubleData.activeTitle : null;
            if (activeTitle) {
                const tagWidth = ctx.measureText(targetUser.tag).width;
                ctx.font = 'italic bold 20px sans-serif';
                ctx.fillStyle = '#FFD700';
                ctx.fillText(`[${activeTitle}]`, 160 + tagWidth + 12, 335);
            }

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

            const attachment = new AttachmentBuilder(await canvas.encode('png'), { name: 'profile.png' });
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

            // Sync user achievements first
            await syncUserAchievements(message.client, targetUser.id);

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
            const hasCrown = baubleData && baubleData.inventory && baubleData.inventory.some(item => item.itemId === 'crown' && item.quantity > 0);
            const userUnlocked = await Achievement.find({ userId: targetUser.id }).lean();
            const unlockedIds = new Set(userUnlocked.map(a => a.achievementId));

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
            const targetMember = message.guild.members.cache.get(targetUser.id);
            const pfpUrl = (profileData.pfpUrl && !profileData.pfpUrl.endsWith('.gif'))
                ? profileData.pfpUrl
                : (targetMember ? targetMember.displayAvatarURL({ extension: 'png', size: 256 }) : targetUser.displayAvatarURL({ extension: 'png', size: 256 }));
            
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

            if (hasCrown) {
                drawCrown(ctx, 55, 229, 50, 35);
            }

            const displayName = profileData.customDisplayName || targetUser.username;
            ctx.font = '32px sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(displayName, 160, 300);

            let crownOffset = 0;
            if (hasCrown) {
                const nameWidth = ctx.measureText(displayName).width;
                drawCrown(ctx, 160 + nameWidth + 12, 300 - 24, 28, 20);
                crownOffset = 36;
            }
            let badgeOffset = 0;
            const nameWidth = ctx.measureText(displayName).width;
            
            const badgePromisesPrefix = ACHIEVEMENTS.map(async (ach) => {
                if (ach.isBadge && unlockedIds.has(ach.id)) {
                    const src = getBadgeImageSource(ach.emoji);
                    if (src) {
                        try {
                            const img = await Canvas.loadImage(src);
                            return { ach, img };
                        } catch (err) {
                            console.error(`Failed to load badge image for ${ach.emoji}:`, err);
                        }
                    }
                    return { ach, img: null };
                }
                return null;
            });
            
            const badgesToDrawPrefix = (await Promise.all(badgePromisesPrefix)).filter(Boolean);
            
            for (const item of badgesToDrawPrefix) {
                if (item.img) {
                    ctx.drawImage(item.img, 160 + nameWidth + 12 + crownOffset + badgeOffset, 298 - 20, 22, 22);
                } else {
                    ctx.font = '22px sans-serif';
                    ctx.fillStyle = '#ffffff';
                    ctx.fillText(item.ach.emoji, 160 + nameWidth + 12 + crownOffset + badgeOffset, 298);
                }
                badgeOffset += 30;
            }

            ctx.font = '24px sans-serif';
            ctx.fillStyle = '#cccccc';
            ctx.fillText(targetUser.tag, 160, 335);

            const activeTitle = baubleData ? baubleData.activeTitle : null;
            if (activeTitle) {
                const tagWidth = ctx.measureText(targetUser.tag).width;
                ctx.font = 'italic bold 20px sans-serif';
                ctx.fillStyle = '#FFD700';
                ctx.fillText(`[${activeTitle}]`, 160 + tagWidth + 12, 335);
            }

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
            const attachment = new AttachmentBuilder(await canvas.encode('png'), { name: 'profile.png' });
            message.channel.send({ files: [attachment] });

        } catch (error) {
            console.error('Error in profile command (prefix):', error);
            message.channel.send('❌ An error occurred while generating the profile.');
        }
    }
};