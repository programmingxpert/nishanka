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
});

const mongoose = require('mongoose');
module.exports = mongoose.models.Bauble || mongoose.model('Bauble', baubleSchema);
