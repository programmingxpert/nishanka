const { Schema, model } = require('mongoose');

const aiUsageSchema = new Schema({
    userId: { type: String, required: true, unique: true },
    apuBalance: { type: Number, default: 100 }, // Current daily AI Power Units
    lastResetAt: { type: Date, default: Date.now }
});

const mongoose = require('mongoose');
module.exports = mongoose.models.AIUsage || mongoose.model('AIUsage', aiUsageSchema);
