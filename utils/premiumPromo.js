const GuildSettings = require('../models/guildSettingsSchema');

const PROMO_TIPS = [
    "enjoying nishanka? supporting yuki genuinely helps so much and means a lot to him fr 💖 https://nishanka.zeyuki.app/support",
    "hey, if you're enjoying my games, maybe buy yuki a coffee? it really helps keep my server hosting alive :') 💜 https://nishanka.zeyuki.app/support",
    "supporting yuki genuinely means a lot to him. check out our premium benefits at https://nishanka.zeyuki.app/premium 💜",
    "yuki is working really hard to build new features for me! if you want to support him, you can upgrade to premium or donate here: https://nishanka.zeyuki.app/support",
    "ty to everyone who supports me! you guys genuinely keep this project alive and it means the world to us 🥺"
];

const DASHBOARD_TIPS = [
    "did you know we have a web dashboard? you can configure auto-roles and welcome cards visually there! ⚙️ https://nishanka.zeyuki.app/",
    "check out the website to view item leaderboards, trophies, and stats in real-time! 📖 https://nishanka.zeyuki.app/",
    "you can customize your profile card backgrounds, bio, and showcase titles on the website! 🎨 https://nishanka.zeyuki.app/",
    "managing auto-triggers and server settings is way easier on our web dashboard! 🖥️ https://nishanka.zeyuki.app/"
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

    // 2. Check guild owner's tier and if they selected this guild for premium
    try {
        const botClient = global.client;
        if (botClient) {
            const guild = botClient.guilds.cache.get(guildId) || await botClient.guilds.fetch(guildId).catch(() => null);
            if (guild && guild.ownerId) {
                const ownerTier = getUserPremiumTier(guild.ownerId);
                if (ownerTier !== 'free') {
                    const config = require('../config.json');
                    if (guild.ownerId === config.devId) {
                        return 'lifetime';
                    }
                    const PremiumUser = require('../models/premiumUserSchema');
                    const premUser = await PremiumUser.findOne({ userId: guild.ownerId }).lean();
                    if (premUser && premUser.premiumGuilds && premUser.premiumGuilds.includes(guildId)) {
                        return ownerTier;
                    }
                }
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
