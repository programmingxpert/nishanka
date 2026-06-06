const mongoose = require('mongoose');

const serverLogSchema = new mongoose.Schema({
    guildId: { type: String, required: true, index: true },
    action: { type: String, required: true },
    details: { type: String, required: true },
    executorId: { type: String, default: null },
    executorTag: { type: String, default: null },
    targetId: { type: String, default: null },
    targetTag: { type: String, default: null },
    timestamp: { type: Date, default: Date.now, index: true },
    extra: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} }
});

module.exports = mongoose.models.ServerLog || mongoose.model('ServerLog', serverLogSchema);
