const { Schema, model } = require('mongoose');

const premiumUserSchema = new Schema({
    userId: { type: String, required: true, unique: true },
    tier: { type: String, required: true }, // 'lite', 'pro', 'network', 'lifetime'
    expiresAt: { type: Date, default: null }, // null means lifetime
    activatedAt: { type: Date, default: Date.now },
    orderId: { type: String, default: '' },
    paymentId: { type: String, default: '' },
    lifetimeBaublesClaimed: { type: Number, default: 0 },
    premiumGuilds: { type: [String], default: [] }
});

const mongoose = require('mongoose');
module.exports = mongoose.models.PremiumUser || mongoose.model('PremiumUser', premiumUserSchema);
