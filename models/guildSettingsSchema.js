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
    bot: {
        prefix: { type: String, default: '' }, // empty string means it will fallback to process.env.PREFIX
        nickname: { type: String, default: '' },
        deleteInvoke: { type: Boolean, default: false },
        unknownCommandMsg: { type: Boolean, default: false },
        quotesChannelId: { type: String, default: null },
        defaultPurgeAmount: { type: Number, default: 10 }
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
    dashboardPermissions: {
        bot: { type: [String], default: [] },
        giveaways: { type: [String], default: [] },
        embed: { type: [String], default: [] },
        triggers: { type: [String], default: [] },
        mediaonly: { type: [String], default: [] },
        automod: { type: [String], default: [] },
        censor: { type: [String], default: [] },
        music: { type: [String], default: [] }
    }
});

module.exports = mongoose.models.GuildSettings || mongoose.model('GuildSettings', guildSettingsSchema);
