const { Schema, model } = require('mongoose');

const profileSchema = new Schema({
    userId: { type: String, required: true, unique: true },
    guildId: { type: String, default: '' },
    bio: { type: String, default: 'This is my bio!' },
    bannerColor: { type: String, default: '#7289DA' },
    customDisplayName: { type: String, default: '' },
    pfpUrl: { type: String, default: '' },
    bannerUrl: { type: String, default: '' },
    private: { type: Boolean, default: false },
    showBaubles: { type: Boolean, default: true },
});

module.exports = model('Profile', profileSchema);
