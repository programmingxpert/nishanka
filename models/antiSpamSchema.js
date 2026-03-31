const mongoose = require('mongoose');

const antiSpamSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    fastSpam: {
        enabled: { type: Boolean, default: true },
        threshold: { type: Number, default: 5 },
        window: { type: Number, default: 3000 }, // ms
    },
    slowSpam: {
        enabled: { type: Boolean, default: true },
        threshold: { type: Number, default: 10 },
        window: { type: Number, default: 12000 }, // ms
    },
    warnUser: { type: Boolean, default: true },
    deleteMessages: { type: Boolean, default: true },
    timeoutUser: { type: Boolean, default: true },
    timeoutDuration: { type: Number, default: 60000 }, // ms (1 minute default)
    ignoredUsers: { type: [String], default: [] }, // Users whose permissions are IGNORED by antispam
});

module.exports = mongoose.model('AntiSpam', antiSpamSchema);
