const { Schema, model } = require('mongoose');

const warnCounterSchema = new Schema({
    guildId: { type: String, required: true, unique: true },
    count:   { type: Number, default: 0 },
});

module.exports = model('WarnCounter', warnCounterSchema);
