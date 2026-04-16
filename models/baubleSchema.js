const { Schema, model } = require('mongoose');

const baubleSchema = new Schema({
    userId: { type: String, required: true, unique: true },
    baubles: { type: Number, default: 0 },
});

const mongoose = require('mongoose');
module.exports = mongoose.models.Bauble || mongoose.model('Bauble', baubleSchema);
