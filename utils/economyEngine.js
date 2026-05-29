const Bauble = require('../models/baubleSchema');
const EconomyMetrics = require('../models/EconomyMetrics');
const GlobalEconomy = require('../models/GlobalEconomy');

/**
 * Calculates the total baubles across all users.
 */
async function getTotalBaubles() {
    const result = await Bauble.aggregate([
        { $group: { _id: null, total: { $sum: '$baubles' }, count: { $sum: 1 } } }
    ]);
    if (result.length > 0) {
        return { total: result[0].total, count: result[0].count };
    }
    return { total: 0, count: 0 };
}

/**
 * Recalculates the Global Economy Multiplier.
 * Should be run daily via a scheduled task.
 */
async function calculateEconomy() {
    try {
        const { total: currentTotal, count: userCount } = await getTotalBaubles();

        // Get the latest metrics snapshot to compare
        const lastSnapshot = await EconomyMetrics.findOne().sort({ timestamp: -1 });

        let currentGlobal = await GlobalEconomy.findOne();
        if (!currentGlobal) {
            currentGlobal = await GlobalEconomy.create({
                currentMultiplier: 1.0,
                marketStatus: "⚖️ Stable Market",
                totalBaublesInCirculation: currentTotal,
                activeUsersCount: userCount
            });
        }

        let newMultiplier = currentGlobal.currentMultiplier;
        let inflationRate = 0;

        if (lastSnapshot && lastSnapshot.totalBaubles > 0) {
            const previousTotal = lastSnapshot.totalBaubles;
            inflationRate = (currentTotal - previousTotal) / previousTotal;

            // Simple adaptive algorithm:
            // If inflation is positive (more money in system), we decrease the multiplier to slow down earning.
            // If inflation is negative (deflation, money sink), we increase the multiplier to stimulate the economy.
            // Weighting factor: 1.5x of the inflation rate.
            const adjustment = inflationRate * 1.5; 
            newMultiplier -= adjustment;

            // Hard caps to prevent extreme values
            if (newMultiplier < 0.5) newMultiplier = 0.5;
            if (newMultiplier > 2.0) newMultiplier = 2.0;
        }

        let status = "⚖️ Stable Market";
        if (newMultiplier >= 1.3) status = "🚀 Booming Market (High Rewards)";
        else if (newMultiplier <= 0.7) status = "📉 Bear Market (Low Rewards)";
        else if (inflationRate > 0.05) status = "🔥 Inflation Warning (Slowing Rewards)";
        
        // Update live state
        currentGlobal.currentMultiplier = Number(newMultiplier.toFixed(2));
        currentGlobal.marketStatus = status;
        currentGlobal.totalBaublesInCirculation = currentTotal;
        currentGlobal.activeUsersCount = userCount;
        currentGlobal.lastCalculated = new Date();
        await currentGlobal.save();

        // Log snapshot for history (graph data)
        await EconomyMetrics.create({
            totalBaubles: currentTotal,
            activeUsers: userCount,
            transactionVolume: 0, // Could be calculated if we tracked every single transaction
            multiplier: Number(newMultiplier.toFixed(2)),
            status: status
        });

        console.log(`[Economy Engine] Recalculated: Total=${currentTotal.toLocaleString()}, Multiplier=${newMultiplier.toFixed(2)}x, Status=${status}`);
        return currentGlobal;
    } catch (err) {
        console.error('[Economy Engine] Error calculating economy:', err);
    }
}

/**
 * Returns the current active global multiplier.
 */
async function getGlobalMultiplier() {
    try {
        const globalEco = await GlobalEconomy.findOne();
        if (globalEco) return globalEco.currentMultiplier;
    } catch (e) {
        console.error('[Economy Engine] Failed to get multiplier:', e);
    }
    return 1.0;
}

/**
 * Checks if we missed today's economy snapshot and recalculates if needed.
 */
async function checkCatchUpEconomy() {
    try {
        const lastSnapshot = await EconomyMetrics.findOne().sort({ timestamp: -1 });
        if (!lastSnapshot) {
            console.log('[Economy Engine] No previous snapshots found. Generating initial snapshot...');
            return calculateEconomy();
        }

        const lastDate = new Date(lastSnapshot.timestamp);
        const today = new Date();
        
        // If the last snapshot was taken on a different day, take one now
        if (lastDate.getUTCFullYear() !== today.getUTCFullYear() ||
            lastDate.getUTCMonth() !== today.getUTCMonth() ||
            lastDate.getUTCDate() !== today.getUTCDate()) {
            console.log('[Economy Engine] Missed today\'s snapshot (or was offline). Running catch-up...');
            return calculateEconomy();
        } else {
            console.log('[Economy Engine] Today\'s economy snapshot already exists. Skipping catch-up.');
        }
    } catch (err) {
        console.error('[Economy Engine] Error during catch-up check:', err);
    }
}

module.exports = {
    calculateEconomy,
    getGlobalMultiplier,
    checkCatchUpEconomy
};
