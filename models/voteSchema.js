const { Schema, model } = require('mongoose');
const mongoose = require('mongoose');

const voteSchema = new Schema({
    userId:          { type: String, required: true, unique: true },
    totalVotes:      { type: Number, default: 0 },
    voteStreak:      { type: Number, default: 0 },   // consecutive 12h windows
    maxVoteStreak:   { type: Number, default: 0 },
    lastVotedAt:     { type: Date,   default: null },
    nextVoteAt:      { type: Date,   default: null },
    reviewPrompted:  { type: Boolean, default: false },   // have we asked them to review?
    reviewConfirmed: { type: Boolean, default: false },   // did they click "reviewed"?
    weekendVotes:    { type: Number, default: 0 },        // weekend = 2× points on top.gg
});

module.exports = mongoose.models.Vote || mongoose.model('Vote', voteSchema);
