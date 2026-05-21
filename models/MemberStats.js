const { Schema, model } = require('mongoose');

const memberStatsSchema = new Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    messagesCount: { type: Number, default: 0 },
    invitesCount: { type: Number, default: 0 },
});

// Composite index for fast lookups by guild and user
memberStatsSchema.index({ guildId: 1, userId: 1 }, { unique: true });

const mongoose = require('mongoose');
module.exports = mongoose.models.MemberStats || mongoose.model('MemberStats', memberStatsSchema);
