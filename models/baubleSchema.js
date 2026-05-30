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
    blackjackStreak: { type: Number, default: 0 },
    blackjackMaxStreak: { type: Number, default: 0 },
    animebattleStreak: { type: Number, default: 0 },
    animebattleMaxStreak: { type: Number, default: 0 },
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
    lastTaxPaid: { type: Number, default: 0 },
    lastTaxDate: { type: Date, default: null },
    activeTitle: { type: String, default: null },
    titles: { type: [String], default: [] },
    completedCollections: { type: [String], default: [] },
    activeExpedition: {
        startedAt: { type: Date, default: null },
        endTime: { type: Date, default: null },
        status: { type: String, default: 'idle' }
    },
    workStenchExpiresAt: { type: Date, default: null },
    invisibilityExpiresAt: { type: Date, default: null },
    luckPenaltyExpiresAt: { type: Date, default: null },
    grailIncomeExpiresAt: { type: Date, default: null },
    divineDuckExpiresAt: { type: Date, default: null },
    blindedExpiresAt: { type: Date, default: null },
    bribedLockoutExpiresAt: { type: Date, default: null },
    shieldExpiresAt: { type: Date, default: null },
    padlockedExpiresAt: { type: Date, default: null },
    beamedExpiresAt: { type: Date, default: null },
    spaceDuckExpiresAt: { type: Date, default: null },
    itemLockoutExpiresAt: { type: Date, default: null }
});

const mongoose = require('mongoose');
module.exports = mongoose.models.Bauble || mongoose.model('Bauble', baubleSchema);
