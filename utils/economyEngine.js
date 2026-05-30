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
async function calculateEconomy(client) {
    try {
        let { total: currentTotal, count: userCount } = await getTotalBaubles();

        // --- AUTOMATED WEALTH TAX (MONEY SINK) ---
        // Find users with over 150k baubles and apply a wealth tax
        const wealthyUsers = await Bauble.find({ baubles: { $gte: 150000 } });
        let totalTaxCollected = 0;
        const now = new Date();
        
        for (const u of wealthyUsers) {
            let taxPercent = 0.02; // 2% for Tier 1 (150k-500k)
            if (u.baubles >= 500000) {
                taxPercent = 0.05; // 5% for Tier 2 (500k+)
            }
            const previousBaubles = u.baubles;
            const taxAmount = Math.floor(u.baubles * taxPercent);
            u.baubles -= taxAmount;
            u.lastTaxPaid = taxAmount;
            u.lastTaxDate = now;
            await u.save();
            totalTaxCollected += taxAmount;

            // Notify user via Discord DM if client is provided
            if (client) {
                try {
                    const discordUser = await client.users.fetch(u.userId);
                    if (discordUser) {
                        const { EmbedBuilder } = require('discord.js');
                        const embed = new EmbedBuilder()
                            .setColor(0xd9534f) // Crimson/Red
                            .setTitle('📉 Wealth Tax Deducted')
                            .setDescription(
                                `Hello **${discordUser.username}**,\n\n` +
                                `Your daily wealth tax has been collected and deposited into the server's Tax Fund.\n\n` +
                                `• **Previous Balance:** ${previousBaubles.toLocaleString()} Baubles\n` +
                                `• **Tax Collected:** -${taxAmount.toLocaleString()} Baubles (${(taxPercent * 100).toFixed(0)}%)\n` +
                                `• **New Balance:** ${u.baubles.toLocaleString()} Baubles\n\n` +
                                `*Wealth taxes keep our server economy balanced and fight inflation. Keep up the hustle!*`
                            )
                            .setTimestamp();
                        await discordUser.send({ embeds: [embed] }).catch(() => {
                            console.log(`[Economy Engine] Could not DM user ${u.userId} about tax.`);
                        });
                    }
                } catch (dmErr) {
                    console.error(`[Economy Engine] Error notifying user ${u.userId}:`, dmErr);
                }
            }
        }

        // Adjust the current total by the amount of tax destroyed
        currentTotal -= totalTaxCollected;
        console.log(`[Economy Engine] Collected and burned ${totalTaxCollected.toLocaleString()} baubles in wealth taxes.`);
        // ------------------------------------------

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

        // Calculate average baubles per active user
        const averagePerUser = userCount > 0 ? currentTotal / userCount : 0;
        
        // Define a healthy target average wealth per user
        const TARGET_AVERAGE = 75000; // 75k baubles per person is considered "stable/normal"
        
        let newMultiplier = 1.0;
        
        if (averagePerUser > 0) {
            // Adaptive Wealth Curve: 
            // Instead of punishing raw growth, it balances around the target average.
            // Using a square root curve softens the impact so it doesn't swing wildly.
            newMultiplier = Math.sqrt(TARGET_AVERAGE / averagePerUser);
        }
        
        // Hard caps to prevent extreme values
        if (newMultiplier < 0.5) newMultiplier = 0.5;
        if (newMultiplier > 2.0) newMultiplier = 2.0;

        let status = "⚖️ Stable Market";
        if (newMultiplier >= 1.5) {
            status = "🚀 Booming Market (High Rewards)";
        } else if (newMultiplier >= 1.1) {
            status = "📈 Growing Market (Good Rewards)";
        } else if (newMultiplier >= 0.9) {
            status = "⚖️ Stable Market";
        } else if (newMultiplier >= 0.7) {
            status = "📉 Cooling Market (Slowing Rewards)";
        } else {
            status = "🔥 High Inflation (Minimal Rewards)";
        }
        
        // Update live state
        currentGlobal.currentMultiplier = Number(newMultiplier.toFixed(2));
        currentGlobal.marketStatus = status;
        currentGlobal.totalBaublesInCirculation = currentTotal;
        currentGlobal.activeUsersCount = userCount;
        currentGlobal.taxFund = (currentGlobal.taxFund || 0) + totalTaxCollected;
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
async function checkCatchUpEconomy(client) {
    try {
        const lastSnapshot = await EconomyMetrics.findOne().sort({ timestamp: -1 });
        if (!lastSnapshot) {
            console.log('[Economy Engine] No previous snapshots found. Generating initial snapshot...');
            return calculateEconomy(client);
        }

        const lastDate = new Date(lastSnapshot.timestamp);
        const today = new Date();
        
        // If the last snapshot was taken on a different day, take one now
        if (lastDate.getUTCFullYear() !== today.getUTCFullYear() ||
            lastDate.getUTCMonth() !== today.getUTCMonth() ||
            lastDate.getUTCDate() !== today.getUTCDate()) {
            console.log('[Economy Engine] Missed today\'s snapshot (or was offline). Running catch-up...');
            return calculateEconomy(client);
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
