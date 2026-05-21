const mongoose = require('mongoose');

const triggerSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    triggerWord: { type: String, required: true },
    matchType: { type: String, default: 'exact' }, // 'exact', 'includes', 'startsWith'
    response: {
        text: { type: String, default: '' },
        embed: {
            title: { type: String, default: '' },
            description: { type: String, default: '' },
            color: { type: String, default: '#5865F2' },
            author: { type: String, default: '' },
            footer: { type: String, default: '' }
        }
    }
}, { timestamps: true });

// A guild cannot have duplicate trigger words
triggerSchema.index({ guildId: 1, triggerWord: 1 }, { unique: true });

module.exports = mongoose.models.Trigger || mongoose.model('Trigger', triggerSchema);
