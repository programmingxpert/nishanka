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
    }
});

module.exports = mongoose.models.GuildSettings || mongoose.model('GuildSettings', guildSettingsSchema);
