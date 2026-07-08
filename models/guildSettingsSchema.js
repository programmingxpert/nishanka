const mongoose = require('mongoose');

const guildSettingsSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    economy: {
        currencyName: { type: String, default: 'coins' },
        currencySymbol: { type: String, default: '🪙' },
        dailyAmount: { type: Number, default: 100 },
    },
    music: {
        defaultVolume: { type: Number, default: 50 },
        djRoleId: { type: String, default: null },
        announceSongs: { type: Boolean, default: true },
        twentyFourSeven: { type: Boolean, default: false }
    },
    tts: {
        enabled: { type: Boolean, default: false },
        voice: { type: String, default: 'en' },
        maxLength: { type: Number, default: 120 },
        cooldown: { type: Number, default: 4 }, // in seconds
        allowedRoles: { type: [String], default: [] }
    },
    bot: {
        prefix: { type: String, default: '' }, // empty string means it will fallback to process.env.PREFIX
        nickname: { type: String, default: '' },
        deleteInvoke: { type: Boolean, default: false },
        unknownCommandMsg: { type: Boolean, default: false },
        quotesChannelId: { type: String, default: null },
                defaultPurgeAmount: { type: Number, default: 10 },
        snipeEnabled: { type: Boolean, default: true }
    },
    leveling: {
        enabled: { type: Boolean, default: true },
        levelUpChannelId: { type: String, default: null },
        announceLevelUps: { type: Boolean, default: true },
        roleRewards: {
            type: [{
                level: { type: Number, required: true },
                roleId: { type: String, required: true }
            }],
            default: []
        },
        baublesMultiplier: { type: Number, default: 100 }
    },
    welcome: {
        enabled: { type: Boolean, default: false },
        channelId: { type: String, default: null },
        joinMessage: { type: String, default: 'Welcome {user.mention} to {server.name}! You are our {server.memberCount}th member! 🎉' },
        leaveMessage: { type: String, default: '{user.name} has left the server. 😢' }
    },
    autoRole: {
        enabled: { type: Boolean, default: false },
        roleId: { type: String, default: null }
    },
    logging: {
        enabled: { type: Boolean, default: false },
        channelId: { type: String, default: null },
        messageDelete: { type: Boolean, default: true },
        messageUpdate: { type: Boolean, default: true },
        memberJoin: { type: Boolean, default: true },
        memberLeave: { type: Boolean, default: true },
        msgLogChannelId: { type: String, default: null },
        mediaLogChannelId: { type: String, default: null },
        reactionLogChannelId: { type: String, default: null },
        antispamLogChannelId: { type: String, default: null },
        modLogChannelId: { type: String, default: null },
        voiceLogChannelId: { type: String, default: null }
    },
    dashboardPermissions: {
        bot: { type: [String], default: [] },
        giveaways: { type: [String], default: [] },
        embed: { type: [String], default: [] },
        triggers: { type: [String], default: [] },
        mediaonly: { type: [String], default: [] },
        automod: { type: [String], default: [] },
        censor: { type: [String], default: [] },
        music: { type: [String], default: [] }
    },
    tickets: {
        enabled: { type: Boolean, default: false },
        categoryId: { type: String, default: null },
        staffRoleId: { type: String, default: null },
        logChannelId: { type: String, default: null },
        panelChannelId: { type: String, default: null },
        panelMessageId: { type: String, default: null },
        lastTicketNumber: { type: Number, default: 0 }
    },
    starboard: {
        enabled: { type: Boolean, default: false },
        channelId: { type: String, default: null },
        emoji: { type: String, default: '⭐' },
        threshold: { type: Number, default: 3 }
    },
    isPremium: { type: Boolean, default: false },
    lastSecurityCheck: { type: Date, default: null },
    interactionLogChannelId: { type: String, default: null },
    interactionLogWebhookUrl: { type: String, default: null }
});

module.exports = mongoose.models.GuildSettings || mongoose.model('GuildSettings', guildSettingsSchema);
