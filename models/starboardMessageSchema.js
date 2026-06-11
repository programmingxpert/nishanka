const mongoose = require('mongoose');

const starboardMessageSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    channelId: { type: String, required: true }, // original message channel ID
    messageId: { type: String, required: true, unique: true }, // original message ID
    starboardMessageId: { type: String, required: true }, // the ID of the posted starboard message
    stars: { type: Number, required: true }
});

module.exports = mongoose.models.StarboardMessage || mongoose.model('StarboardMessage', starboardMessageSchema);
