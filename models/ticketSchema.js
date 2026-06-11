const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
    guildId: { type: String, required: true, index: true },
    ticketNumber: { type: Number, required: true },
    userId: { type: String, required: true, index: true },
    channelId: { type: String, required: true, index: true },
    status: { type: String, enum: ['open', 'closed'], default: 'open' },
    topic: { type: String, default: 'General Support' },
    createdAt: { type: Date, default: Date.now },
    closedAt: { type: Date, default: null },
    closedBy: { type: String, default: null },
    transcript: [{
        senderId: String,
        senderTag: String,
        senderAvatar: String,
        content: String,
        timestamp: { type: Date, default: Date.now }
    }]
});

module.exports = mongoose.models.Ticket || mongoose.model('Ticket', ticketSchema);
