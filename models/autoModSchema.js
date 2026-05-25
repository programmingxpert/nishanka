const mongoose = require('mongoose');

const autoModSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },

    // Logging Configuration
    logChannelId: { type: String, default: null },
    logFeatures: {
        antiSpam: { type: Boolean, default: true },
        antiLink: { type: Boolean, default: true }
    },

    // Top-Level Modules
    antiSpamEnabled: { type: Boolean, default: true },
    antiSpamFilterMode: { type: String, default: 'whitelist' }, // 'whitelist' or 'blacklist'
    antiSpamWhitelistedChannels: { type: [String], default: [] },
    antiSpamBlacklistedChannels: { type: [String], default: [] },
    
    // Existing AntiSpam configuration
    fastSpam: {
        enabled: { type: Boolean, default: true },
        threshold: { type: Number, default: 5 },
        window: { type: Number, default: 3000 }, // ms
        warnUser: { type: Boolean, default: true },
        deleteMessages: { type: Boolean, default: true },
        timeoutUser: { type: Boolean, default: true },
        timeoutDuration: { type: Number, default: 60000 }, // ms (1 minute default)
        ignoredUsers: { type: [String], default: [] },
    },
    slowSpam: {
        enabled: { type: Boolean, default: true },
        threshold: { type: Number, default: 10 },
        window: { type: Number, default: 12000 }, // ms
        warnUser: { type: Boolean, default: true },
        deleteMessages: { type: Boolean, default: true },
        timeoutUser: { type: Boolean, default: true },
        timeoutDuration: { type: Number, default: 60000 }, // ms (1 minute default)
        ignoredUsers: { type: [String], default: [] },
    },
    warnUser: { type: Boolean, default: true },
    deleteMessages: { type: Boolean, default: true },
    timeoutUser: { type: Boolean, default: true },
    timeoutDuration: { type: Number, default: 60000 }, // ms (1 minute default)
    ignoredUsers: { type: [String], default: [] }, // Users whose permissions are IGNORED by antispam
    repetitionEnabled: { type: Boolean, default: true },
    repetitionThreshold: { type: Number, default: 3 },

    // Anti-Link Configuration
    antiLink: {
        enabled: { type: Boolean, default: false },
        filterMode: { type: String, default: 'whitelist' }, // 'whitelist' or 'blacklist'
        whitelistedChannels: { type: [String], default: [] },
        blacklistedChannels: { type: [String], default: [] },
        warnUser: { type: Boolean, default: true },
        deleteMessages: { type: Boolean, default: true },
        timeoutUser: { type: Boolean, default: true },
        timeoutDuration: { type: Number, default: 60000 }, // ms (1 minute default)
        ignoredUsers: { type: [String], default: [] },
        allowedFormats: {
            images: { type: Boolean, default: false },
            gifs: { type: Boolean, default: false },
            videos: { type: Boolean, default: false }
        },
        whitelistedWebsites: { type: [String], default: [] }
    }
}, { collection: 'antispams' }); // Preserve existing collection data

module.exports = mongoose.models.AutoMod || mongoose.model('AutoMod', autoModSchema);
