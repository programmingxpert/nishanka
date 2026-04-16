const mongoose = require('mongoose');

const censorSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    hardcoreWords: { type: [String], default: [] }, // Strictly forbidden everywhere
    restrictedWords: { type: [String], default: [] }, // Allowed only in age-restricted channels
    whitelistedWords: { type: [String], default: [] },
    logChannelId: { type: String, default: null }, // Mod channel
    staffRoleId: { type: String, default: null }, // Role to ping in mod logs
    ageRestrictedChannelId: { type: String, default: null }, // 16+/18+ channel
    enabled: { type: Boolean, default: false },
});

module.exports = mongoose.models.Censor || mongoose.model('Censor', censorSchema);
