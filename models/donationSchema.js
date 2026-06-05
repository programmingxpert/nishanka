const { Schema, model } = require('mongoose');

const donationSchema = new Schema({
    userId: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    gateway: { type: String, required: true }, // 'razorpay' | 'paypal'
    paymentId: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const mongoose = require('mongoose');
module.exports = mongoose.models.Donation || mongoose.model('Donation', donationSchema);
