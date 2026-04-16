const { Schema, model } = require('mongoose');

const afkSchema = new Schema({
    userId:      { type: String, required: true },
    guildId:     { type: String, required: true },
    reason:      { type: String, default: 'AFK' },
    timestamp:   { type: Number, default: () => Date.now() },
    displayName: { type: String, default: '' },
});

// Compound index so each user has one AFK record per guild
afkSchema.index({ userId: 1, guildId: 1 }, { unique: true });

const mongoose = require('mongoose');
module.exports = mongoose.models.Afk || mongoose.model('Afk', afkSchema);
