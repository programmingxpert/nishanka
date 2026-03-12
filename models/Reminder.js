/* eslint-disable */
const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    channelId: { type: String, required: true },
    messageId: { type: String, default: null }, // Optional: to reply to the invocation
    reminderText: { type: String, required: true },
    remindAt: { type: Date, required: true }
});

module.exports = mongoose.model('Reminder', reminderSchema);
