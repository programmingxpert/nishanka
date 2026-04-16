const { Schema, model } = require('mongoose');

const warnSchema = new Schema({
    userId:      { type: String, required: true },
    guildId:     { type: String, required: true },
    warnId:      { type: Number, required: true },
    moderatorId: { type: String, required: true },
    reason:      { type: String, default: 'No reason provided.' },
    timestamp:   { type: Date, default: Date.now },
});

const mongoose = require('mongoose');
module.exports = mongoose.models.Warn || mongoose.model('Warn', warnSchema);
