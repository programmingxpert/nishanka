const { Schema, model } = require('mongoose');

const familySchema = new Schema({
    userId: { type: String, required: true, unique: true },
    spouseId: { type: String, default: null },
    parents: { type: [String], default: [] },
    children: { type: [String], default: [] },
    pendingSpouseProposal: { type: String, default: null },
    pendingSpouseRing: { type: String, default: null },
    pendingAdoptionProposals: { type: [String], default: [] }
});

const mongoose = require('mongoose');
module.exports = mongoose.models.Family || mongoose.model('Family', familySchema);
