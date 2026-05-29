const { Schema, model, models } = require('mongoose');

const globalEconomySchema = new Schema({
    currentMultiplier: { type: Number, default: 1.0 },
    marketStatus: { type: String, default: "Stable Market ⚖️" },
    lastCalculated: { type: Date, default: Date.now },
    totalBaublesInCirculation: { type: Number, default: 0 },
    activeUsersCount: { type: Number, default: 0 }
});

module.exports = models.GlobalEconomy || model('GlobalEconomy', globalEconomySchema);
