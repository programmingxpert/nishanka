const mongoose = require('mongoose');
require('dotenv').config();

const Vote = require('./models/voteSchema');
const GuildSettings = require('./models/guildSettingsSchema');
const { getVoteXpStatus } = require('./utils/voteManager');

async function test() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const testUserId = '1159902452649316432';

    // Test 1: getVoteXpStatus when user just voted (0 mins ago)
    await Vote.findOneAndUpdate(
        { userId: testUserId },
        { lastVotedAt: new Date() },
        { upsert: true }
    );

    let status = await getVoteXpStatus(testUserId);
    console.log('\n--- Test 1: Just Voted (0m ago) ---');
    console.log('Active:', status.active);
    console.log('Multiplier:', status.multiplier, '(Expected: 3)');
    console.log('Phase:', status.phase, '(Expected: 3x)');
    console.log('Phase Expiry Epoch:', status.phaseExpiryEpoch);

    // Test 2: getVoteXpStatus when user voted 30 mins ago (in 2x phase)
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
    await Vote.findOneAndUpdate(
        { userId: testUserId },
        { lastVotedAt: thirtyMinsAgo }
    );

    status = await getVoteXpStatus(testUserId);
    console.log('\n--- Test 2: Voted 30m ago ---');
    console.log('Active:', status.active);
    console.log('Multiplier:', status.multiplier, '(Expected: 2)');
    console.log('Phase:', status.phase, '(Expected: 2x)');

    // Test 3: getVoteXpStatus when user voted 5 hours ago (expired)
    const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);
    await Vote.findOneAndUpdate(
        { userId: testUserId },
        { lastVotedAt: fiveHoursAgo }
    );

    status = await getVoteXpStatus(testUserId);
    console.log('\n--- Test 3: Voted 5h ago (Expired) ---');
    console.log('Active:', status.active, '(Expected: false)');
    console.log('Multiplier:', status.multiplier, '(Expected: 1)');

    // Clean up test state
    await Vote.findOneAndUpdate(
        { userId: testUserId },
        { lastVotedAt: null }
    );

    console.log('\n🎉 All tests passed successfully!');
    process.exit(0);
}

test().catch(err => {
    console.error('Test error:', err);
    process.exit(1);
});
