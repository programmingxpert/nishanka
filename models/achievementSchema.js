const { Schema, model } = require('mongoose');

const achievementSchema = new Schema({
    userId: { type: String, required: true },
    achievementId: { type: String, required: true },
    unlockedAt: { type: Date, default: Date.now }
});

// Compound index to ensure a user only unlocks an achievement once
achievementSchema.index({ userId: 1, achievementId: 1 }, { unique: true });

const mongoose = require('mongoose');
module.exports = mongoose.models.Achievement || mongoose.model('Achievement', achievementSchema);
