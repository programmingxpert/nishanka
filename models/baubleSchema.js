const { Schema, model } = require('mongoose');

const baubleSchema = new Schema({
    userId: { type: String, required: true, unique: true },
    baubles: { type: Number, default: 0 },
    coinflipStreak: { type: Number, default: 0 },
    coinflipMaxStreak: { type: Number, default: 0 },
    gambleStreak: { type: Number, default: 0 },
    gambleMaxStreak: { type: Number, default: 0 },
    slotsStreak: { type: Number, default: 0 },
    slotsMaxStreak: { type: Number, default: 0 },
    dailyStreak: { type: Number, default: 0 },
    dailyMaxStreak: { type: Number, default: 0 },
    dailyLastClaimed: { type: Date, default: null },
    weeklyLastClaimed: { type: Date, default: null },
    inventory: {
        type: [{
            itemId: { type: String, required: true },
            quantity: { type: Number, default: 1 }
        }],
        default: []
    },
    coffeeExpiresAt: { type: Date, default: null },
    luckExpiresAt: { type: Date, default: null },
    dailyWorkLastCompleted: { type: Date, default: null },
    dailyGameLastCompleted: { type: Date, default: null },
    dailyGambleLastCompleted: { type: Date, default: null },
    dailyTasksClaimedAt: { type: Date, default: null },
    passiveMode: { type: Boolean, default: false },
    passiveModeToggledAt: { type: Date, default: null },
    robLastAttemptedAt: { type: Date, default: null },
});

const mongoose = require('mongoose');
module.exports = mongoose.models.Bauble || mongoose.model('Bauble', baubleSchema);
