const mongoose = require('mongoose');

const reactionRoleSchema = new mongoose.Schema({
    guildId: { type: String, required: true, index: true },
    channelId: { type: String, required: true },
    messageId: { type: String, required: true, index: true },
    emoji: { type: String, required: true }, // Unicode emoji or Custom Emoji ID
    roleId: { type: String, required: true }
});

module.exports = mongoose.models.ReactionRole || mongoose.model('ReactionRole', reactionRoleSchema);
