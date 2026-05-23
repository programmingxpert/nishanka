const mongoose = require('mongoose');

const censorSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    hardcoreWords: { type: [String], default: [] }, // Strictly forbidden everywhere
    restrictedWords: { type: [String], default: [] }, // Allowed only in age-restricted channels
    whitelistedWords: { type: [String], default: [] },
    logChannelId: { type: String, default: null }, // Mod channel
    staffRoleId: { type: String, default: null }, // Role to ping in mod logs
    pingMode: { type: String, enum: ['both', 'hardcore', 'restricted'], default: 'both' }, // When to ping the staff role
    ageRestrictedChannelId: { type: String, default: null }, // 16+/18+ channel
    logHardcoreWords: { type: Boolean, default: true },
    logRestrictedWords: { type: Boolean, default: true },
    filterMode: { type: String, enum: ['whitelist', 'blacklist'], default: 'whitelist' }, // Toggle
    whitelistedChannels: { type: [String], default: [] }, // Channels to ignore
    blacklistedChannels: { type: [String], default: [] }, // Only enforce in these channels if not empty
    enabled: { type: Boolean, default: false },
    applyToEveryone: { type: Boolean, default: false },
});

module.exports = mongoose.models.Censor || mongoose.model('Censor', censorSchema);
