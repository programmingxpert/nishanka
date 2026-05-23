require('dotenv').config();
const mongoose = require('mongoose');
const GuildSettings = require('./models/guildSettingsSchema');

async function test() {
    await mongoose.connect(process.env.MONGO_URI);
    await GuildSettings.findOneAndUpdate({ guildId: '984620021303865424' }, { bot: { prefix: '!' } }, { upsert: true });
    const settings = await GuildSettings.findOne({ guildId: '984620021303865424' }); // Find first settings
    console.log(settings?.bot);
    mongoose.disconnect();
}

test();
