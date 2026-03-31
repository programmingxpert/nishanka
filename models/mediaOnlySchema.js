const mongoose = require('mongoose');

const mediaOnlySchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    channelId: { type: String, required: true },
    enabled: { type: Boolean, default: true }
});

// Compound index to ensure uniqueness per guild/channel
mediaOnlySchema.index({ guildId: 1, channelId: 1 }, { unique: true });

module.exports = mongoose.model('MediaOnly', mediaOnlySchema);
