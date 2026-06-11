const { Schema } = require('mongoose');
const mongoose = require('mongoose');

const giftSchema = new Schema({
    senderId:    { type: String, required: true },
    recipientId: { type: String, required: true },
    guildId:     { type: String, required: true },
    giftType:    { type: String, enum: ['baubles', 'item'], required: true },
    itemId:      { type: String, default: null },
    quantity:    { type: Number, default: 0 },
    amount:      { type: Number, default: 0 },
    message:     { type: String, default: null },
    extraTax:    { type: Number, default: 0 },
    claimed:     { type: Boolean, default: false },
    claimedAt:   { type: Date, default: null },
    timestamp:   { type: Date, default: Date.now }
});

module.exports = mongoose.models.Gift || mongoose.model('Gift', giftSchema);
