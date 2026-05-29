const { Schema, model, models } = require('mongoose');

const economyMetricsSchema = new Schema({
    timestamp: { type: Date, default: Date.now },
    totalBaubles: { type: Number, required: true },
    activeUsers: { type: Number, required: true },
    transactionVolume: { type: Number, default: 0 },
    multiplier: { type: Number, required: true },
    status: { type: String, required: true } // e.g. "Bull Market", "Bear Market", "Stable"
});

module.exports = models.EconomyMetrics || model('EconomyMetrics', economyMetricsSchema);
