/* eslint-disable */
const mongoose = require('mongoose');

const tempRoleSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    roleId: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now }
});

// Compound index for unique entries (one temp role per user-guild-role combo)
tempRoleSchema.index({ guildId: 1, userId: 1, roleId: 1 }, { unique: true });

module.exports = mongoose.models.TempRole || mongoose.model('TempRole', tempRoleSchema);
