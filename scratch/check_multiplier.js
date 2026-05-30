require('dotenv').config();
const mongoose = require('mongoose');
const GlobalEconomy = require('../models/GlobalEconomy');
const EconomyMetrics = require('../models/EconomyMetrics');
const Bauble = require('../models/baubleSchema');

(async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/nishanka');
        console.log("Connected to MongoDB.");

        const currentEco = await GlobalEconomy.findOne();
        console.log("Global Economy Doc:", currentEco);

        const count = await Bauble.countDocuments();
        const totalSum = await Bauble.aggregate([
            { $group: { _id: null, total: { $sum: '$baubles' } } }
        ]);
        console.log(`Bauble Accounts Count: ${count}`);
        console.log(`Total Baubles Sum:`, totalSum);

        const lastSnapshot = await EconomyMetrics.findOne().sort({ timestamp: -1 });
        console.log("Last Snapshot:", lastSnapshot);

        mongoose.connection.close();
    } catch (err) {
        console.error("Error:", err);
    }
})();
