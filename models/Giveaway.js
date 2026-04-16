const { Schema, model } = require('mongoose');

const giveawaySchema = new Schema({
    messageId:   { type: String, required: true, unique: true },
    channelId:   { type: String, required: true },
    guildId:     { type: String, required: true },
    prize:       { type: String, required: true },
    winnerCount: { type: Number, required: true },
    endTime:     { type: Date,   required: true },
    hostId:      { type: String, required: true },
    ended:       { type: Boolean, default: false },
});

const mongoose = require('mongoose');
module.exports = mongoose.models.Giveaway || mongoose.model('Giveaway', giveawaySchema);
