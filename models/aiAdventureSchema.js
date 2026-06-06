const { Schema, model, models } = require('mongoose');

const aiAdventureSchema = new Schema({
    userId: { type: String, required: true, unique: true },
    scenario: { type: String, required: true },
    characterName: { type: String, required: true },
    characterClass: { type: String, required: true },
    tone: { type: String, default: 'Balanced' },
    history: [
        {
            role: { type: String, required: true },
            content: { type: String, required: true }
        }
    ],
    updatedAt: { type: Date, default: Date.now }
});

module.exports = models.AIAdventure || model('AIAdventure', aiAdventureSchema);
