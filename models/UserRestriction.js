const { Schema, model, models } = require('mongoose');

const userRestrictionSchema = new Schema({
    userId: { type: String, required: true, unique: true },
    isBanned: { type: Boolean, default: false },
    banReason: { type: String, default: null },
    bannedAt: { type: Date, default: null },
    bannedBy: { type: String, default: null },
    isSoftBanned: { type: Boolean, default: false },
    lockoutExpiresAt: { type: Date, default: null },
    suspicionScore: { type: Number, default: 0 },
    suspicionWarnings: { type: Number, default: 0 },
    lastActionTime: { type: Date, default: null },
    macroViolationsCount: { type: Number, default: 0 }
});

module.exports = models.UserRestriction || model('UserRestriction', userRestrictionSchema);
