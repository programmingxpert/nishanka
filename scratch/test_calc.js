require('dotenv').config();
const mongoose = require('mongoose');
const { calculateEconomy } = require('../utils/economyEngine');

(async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/nishanka');
        console.log("Connected to MongoDB.");

        console.log("Recalculating economy...");
        const result = await calculateEconomy();
        console.log("Calculation Result:", result);

        mongoose.connection.close();
    } catch (err) {
        console.error("Error during calculation:", err);
    }
})();
