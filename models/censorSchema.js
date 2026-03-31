const mongoose = require('mongoose');

const censorSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    blockedWords: { type: [String], default: [] },
    whitelistedWords: { type: [String], default: [] },
    logChannelId: { type: String, default: null },
    enabled: { type: Boolean, default: false },
});

module.exports = mongoose.model('Censor', censorSchema);
