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

const dbPremiumUsersCache = new Map();

async function loadPremiumUsers() {
    try {
        const PremiumUser = require('../models/premiumUserSchema');
        const users = await PremiumUser.find({});
        dbPremiumUsersCache.clear();
        const now = new Date();
        for (const u of users) {
            if (u.expiresAt && now > new Date(u.expiresAt)) {
                continue;
            }
            dbPremiumUsersCache.set(u.userId, { tier: u.tier, expiresAt: u.expiresAt });
        }
        console.log(`[Premium Cache] Loaded ${dbPremiumUsersCache.size} premium users from database.`);
    } catch (err) {
        console.error('[Premium Cache] Failed to load premium users:', err);
    }
}

function isUserPremium(userId) {
    if (!userId) return false;
    return getUserPremiumTier(userId) !== 'free';
}

function getUserPremiumTier(userId) {
    if (!userId) return 'free';
    const config = require('../config.json');
    if (userId === config.devId) return 'lifetime';

    // Check DB cache first
    const cachedUser = dbPremiumUsersCache.get(userId);
    if (cachedUser) {
        if (!cachedUser.expiresAt || new Date() < new Date(cachedUser.expiresAt)) {
            return cachedUser.tier;
        }
    }

    const lite = (process.env.PREMIUM_USERS_LITE || "").split(",").map(id => id.trim());
    const pro = (process.env.PREMIUM_USERS_PRO || "").split(",").map(id => id.trim());
    const network = (process.env.PREMIUM_USERS_NETWORK || "").split(",").map(id => id.trim());
    const lifetime = (process.env.PREMIUM_USERS_LIFETIME || "").split(",").map(id => id.trim());
    const generalPremium = (process.env.PREMIUM_USERS || "").split(",").map(id => id.trim());

    if (lifetime.includes(userId)) return 'lifetime';
    if (network.includes(userId)) return 'network';
    if (pro.includes(userId)) return 'pro';
    if (lite.includes(userId)) return 'lite';
    if (generalPremium.includes(userId)) return 'pro'; // default general premium to pro

    return 'free';
}

async function getGuildPremiumTier(guildId) {
    if (!guildId) return 'free';

    // 1. Check direct guild whitelists from env
    const liteGuilds = (process.env.PREMIUM_GUILDS_LITE || "").split(",").map(id => id.trim());
    const proGuilds = (process.env.PREMIUM_GUILDS_PRO || "").split(",").map(id => id.trim());
    const networkGuilds = (process.env.PREMIUM_GUILDS_NETWORK || "").split(",").map(id => id.trim());
    const lifetimeGuilds = (process.env.PREMIUM_GUILDS_LIFETIME || "").split(",").map(id => id.trim());
    const generalGuilds = (process.env.PREMIUM_GUILDS || "").split(",").map(id => id.trim());

    if (lifetimeGuilds.includes(guildId)) return 'lifetime';
    if (networkGuilds.includes(guildId)) return 'network';
    if (proGuilds.includes(guildId)) return 'pro';
    if (liteGuilds.includes(guildId)) return 'lite';
    if (generalGuilds.includes(guildId)) return 'pro'; // default general to pro

    // 2. Check guild owner's tier
    try {
        const botClient = global.client;
        if (botClient) {
            const guild = botClient.guilds.cache.get(guildId) || await botClient.guilds.fetch(guildId).catch(() => null);
            if (guild && guild.ownerId) {
                const ownerTier = getUserPremiumTier(guild.ownerId);
                if (ownerTier !== 'free') return ownerTier;
            }
        }
    } catch (e) {}

    // 3. Check database isPremium flag
    try {
        const guildConfig = await GuildSettings.findOne({ guildId }).lean();
        if (guildConfig && guildConfig.isPremium) {
            return guildConfig.premiumTier || 'lite'; // default db premium to lite
        }
    } catch (e) {}

    return 'free';
}

module.exports = {
    isGuildPremium,
    isUserPremium,
    getUserPremiumTier,
    getGuildPremiumTier,
    getRandomPromoTip,
    getRandomDashboardTip,
    loadPremiumUsers,
    dbPremiumUsersCache
};
