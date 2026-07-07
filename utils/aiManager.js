const AIUsage = require('../models/aiUsageSchema');
const Bauble = require('../models/baubleSchema');
const config = require('../config.json');
const { getUserPremiumTier } = require('./premiumPromo');

const TIER_APU_LIMITS = {
    free: 20,
    lite: 500,
    pro: 1500,
    network: 5000,
    lifetime: 10000
};

const APU_RECHARGE_AMOUNT = 100;
const APU_RECHARGE_COST = 500000; // 500k Baubles for 100 APU

/**
 * Checks if the usage needs a reset and returns the current APU record.
 */
async function getOrCreateUsage(userId) {
    const isDev = userId === config.devId;
    const tier = isDev ? 'lifetime' : getUserPremiumTier(userId);
    const maxApu = TIER_APU_LIMITS[tier] || TIER_APU_LIMITS.free;
    
    let usage = await AIUsage.findOne({ userId });
    
    const now = new Date();
    
    if (!usage) {
        usage = new AIUsage({
            userId,
            apuBalance: maxApu,
            lastResetAt: now
        });
        await usage.save();
    } else {
        const lastReset = new Date(usage.lastResetAt);
        // Reset if it's a new UTC day
        if (now.getUTCDate() !== lastReset.getUTCDate() || 
            now.getUTCMonth() !== lastReset.getUTCMonth() || 
            now.getUTCFullYear() !== lastReset.getUTCFullYear()) {
            
            usage.apuBalance = maxApu;
            usage.lastResetAt = now;
            await usage.save();
        }
    }
    
    return usage;
}

/**
 * Gets user's current APU balance.
 */
async function getUserAPU(userId) {
    const usage = await getOrCreateUsage(userId);
    return usage.apuBalance;
}

/**
 * Consumes APU for a command.
 * Returns { success: boolean, remaining: number, max: number }
 */
async function consumeAPU(userId, amount) {
    const usage = await getOrCreateUsage(userId);
    const isDev = userId === config.devId;
    const tier = isDev ? 'lifetime' : getUserPremiumTier(userId);
    const maxApu = TIER_APU_LIMITS[tier] || TIER_APU_LIMITS.free;
    
    if (usage.apuBalance < amount) {
        return { success: false, remaining: usage.apuBalance, max: maxApu };
    }
    
    usage.apuBalance -= amount;
    await usage.save();
    
    return { success: true, remaining: usage.apuBalance, max: maxApu };
}

/**
 * Recharges user APU by 100 using Baubles.
 */
async function rechargeAPU(userId) {
    const usage = await getOrCreateUsage(userId);
    
    let baubleData = await Bauble.findOne({ userId });
    if (!baubleData || baubleData.baubles < APU_RECHARGE_COST) {
        return { success: false, reason: 'insufficient_baubles', currentBaubles: baubleData ? baubleData.baubles : 0 };
    }
    
    baubleData.baubles -= APU_RECHARGE_COST;
    await baubleData.save();
    
    usage.apuBalance += APU_RECHARGE_AMOUNT;
    await usage.save();
    
    return { 
        success: true, 
        apuBalance: usage.apuBalance, 
        baublesLeft: baubleData.baubles, 
        rechargedAmount: APU_RECHARGE_AMOUNT,
        cost: APU_RECHARGE_COST
    };
}

module.exports = {
    getUserAPU,
    consumeAPU,
    rechargeAPU,
    TIER_APU_LIMITS,
    FREE_DAILY_APU: TIER_APU_LIMITS.free,
    PREMIUM_DAILY_APU: TIER_APU_LIMITS.pro, // compatibility
    APU_RECHARGE_AMOUNT,
    APU_RECHARGE_COST
};
