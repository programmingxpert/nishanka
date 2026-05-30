require('dotenv').config();
const mongoose = require('mongoose');
const Bauble = require('../models/baubleSchema');
const GlobalEconomy = require('../models/GlobalEconomy');

async function estimate() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        
        // Query total baubles and user count
        const result = await Bauble.aggregate([
            { $group: { _id: null, total: { $sum: '$baubles' }, count: { $sum: 1 } } }
        ]);
        
        let total = 0;
        let count = 0;
        if (result.length > 0) {
            total = result[0].total;
            count = result[0].count;
        }
        
        const averagePerUser = count > 0 ? total / count : 0;
        const TARGET_AVERAGE = 75000;
        
        let estimatedMultiplier = 1.0;
        if (averagePerUser > 0) {
            estimatedMultiplier = Math.sqrt(TARGET_AVERAGE / averagePerUser);
        }
        
        const rawEstimated = estimatedMultiplier;
        let cappedMultiplier = estimatedMultiplier;
        if (cappedMultiplier < 0.5) cappedMultiplier = 0.5;
        if (cappedMultiplier > 2.0) cappedMultiplier = 2.0;
        
        const currentGlobal = await GlobalEconomy.findOne();
        
        console.log(JSON.stringify({
            totalBaubles: total,
            userCount: count,
            averagePerUser: averagePerUser,
            rawEstimated: rawEstimated,
            cappedMultiplier: Number(cappedMultiplier.toFixed(2)),
            currentMultiplier: currentGlobal ? currentGlobal.currentMultiplier : 'N/A',
            currentStatus: currentGlobal ? currentGlobal.marketStatus : 'N/A'
        }, null, 2));
        
    } catch (err) {
        console.error('Error running estimation:', err);
    } finally {
        await mongoose.disconnect();
    }
}

estimate();
