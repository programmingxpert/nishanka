const { Schema, model } = require('mongoose');

const warnCounterSchema = new Schema({
    guildId: { type: String, required: true, unique: true },
    count:   { type: Number, default: 0 },
});

const mongoose = require('mongoose');
module.exports = mongoose.models.WarnCounter || mongoose.model('WarnCounter', warnCounterSchema);
