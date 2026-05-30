require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const EconomyMetrics = require('../models/EconomyMetrics');
const { calculateEconomy } = require('../utils/economyEngine');

async function run() {
    console.log('Connecting to DB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected.');

    // Find today's date start and end
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setUTCDate(today.getUTCDate() + 1);

    const deleted = await EconomyMetrics.deleteMany({
        timestamp: {
            $gte: today,
            $lt: end
        }
    });

    console.log(`Deleted ${deleted.deletedCount} snapshots from today.`);

    console.log('Forcing recalculation (which includes Wealth Tax)...');
    await calculateEconomy();
    
    console.log('Done!');
    process.exit(0);
}

run().catch(console.error);
