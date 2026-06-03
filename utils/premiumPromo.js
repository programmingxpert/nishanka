const GuildSettings = require('../models/guildSettingsSchema');

const PROMO_TIPS = [
    "Enjoying Nishanka? Support us for as low as $1.99/mo (VERY CHEAP!!)",
    "Enjoying the games? Support development for as low as $1.99/mo!",
    "Unlock unlimited triggers, giveaways, and 24/7 music starting at $1.99/mo!",
    "Unlock achievements, badges, and server perks starting at $1.99/mo (VERY CHEAP!!)",
    "Support Nishanka for as low as $1.99/mo. Check the dashboard!"
];

const DASHBOARD_TIPS = [
    "Configure auto-roles, server logging, and welcome cards visually on our clean Web Dashboard! ⚙️ https://nishanka.zeyuki.app/",
    "Tired of typing? Check item leaderboards, trophies, and player stats in real-time on our Web App! 📖 https://nishanka.zeyuki.app/",
    "Customize your profile backgrounds, bio, and showcase titles directly on the Web Dashboard! 🎨 https://nishanka.zeyuki.app/",
    "Manage auto-triggers, active giveaways, and server settings in a beautiful visual interface! 🖥️ https://nishanka.zeyuki.app/"
];

async function isGuildPremium(guildId) {
    if (!guildId) return false;
    const premiumGuilds = (process.env.PREMIUM_GUILDS || "").split(",").map(id => id.trim());
    if (premiumGuilds.includes(guildId)) return true;

    // Check database
    try {
        const guildConfig = await GuildSettings.findOne({ guildId }).lean();
        if (guildConfig && guildConfig.isPremium) return true;
    } catch (e) {}
    return false;
}

function getRandomPromoTip() {
    return PROMO_TIPS[Math.floor(Math.random() * PROMO_TIPS.length)];
}

function getRandomDashboardTip() {
    return DASHBOARD_TIPS[Math.floor(Math.random() * DASHBOARD_TIPS.length)];
}

module.exports = {
    isGuildPremium,
    getRandomPromoTip,
    getRandomDashboardTip
};
