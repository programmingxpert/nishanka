// Simulates what happens to interaction.options when economy commands
// are accessed as subcommands under /economy

// The problem: when /gamble was standalone, Discord sends:
//   interaction.commandName = "gamble"
//   interaction.options.getInteger("amount") = 500
//
// Now that /economy gamble is a subcommand, Discord sends:
//   interaction.commandName = "economy"
//   interaction.options.getSubcommand() = "gamble"
//   interaction.options.getInteger("amount") = 500  <- STILL WORKS!
//
// This is because Discord.js getInteger() etc. automatically look INSIDE
// the resolved subcommand layer. So options access is NOT the root cause.
//
// The REAL question is: why does the user say the economy "stopped working"?
//
// Let's check: does getGlobalMultiplier() silently return 1.0 as a fallback?
// Looking at economyEngine.js:
//   async function getGlobalMultiplier() {
//       try {
//           const globalEco = await GlobalEconomy.findOne();
//           if (globalEco) return globalEco.currentMultiplier;
//       } catch (e) {
//           console.error('[Economy Engine] Failed to get multiplier:', e);
//       }
//       return 1.0;  // <-- Silent fallback!
//   }
//
// If GlobalEconomy.findOne() fails (e.g. DB connection issue, model not found),
// it silently returns 1.0 -- which looks like the algorithm "stopped working"
// because all payouts are exactly base value, not 2.0x.
//
// ALSO: Let's check if EconomyMetrics/GlobalEconomy models have a caching issue.
// The models are required with mongoose caching, but during the slashCommandsBundler
// refactor, we do: delete require.cache[require.resolve(fullPath)] for COMMAND files.
// This could indirectly cause model re-registrations.

require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/nishanka');
    console.log('Connected.\n');

    // Test 1: Does getGlobalMultiplier() return the right value?
    const { getGlobalMultiplier } = require('../utils/economyEngine');
    const mult = await getGlobalMultiplier();
    console.log(`getGlobalMultiplier() = ${mult}`);
    console.log(`Expected: ~2.0. Is it working? ${mult >= 1.9 ? 'YES ✅' : 'NO ❌ (returning fallback 1.0)'}\n`);

    // Test 2: Simulate gamble win calculation
    const amount = 500;
    const riskMultiplier = 2; // medium risk
    const earnings = Math.floor(amount * riskMultiplier * mult);
    console.log(`Gamble simulation: amount=${amount}, risk=${riskMultiplier}x, globalMult=${mult}x`);
    console.log(`  Expected earnings (with economy): ${earnings} baubles`);
    console.log(`  Without economy multiplier: ${Math.floor(amount * riskMultiplier)} baubles`);
    console.log(`  Difference: ${earnings - Math.floor(amount * riskMultiplier)} baubles\n`);

    // Test 3: Simulate shop pricing  
    const basePrice = 5000; // example item
    const dynamicPrice = Math.floor(basePrice / mult);
    console.log(`Shop simulation: basePrice=${basePrice}, globalMult=${mult}x`);
    console.log(`  Dynamic price (cheaper with 2.0x): ${dynamicPrice} baubles`);
    console.log(`  Without economy (base price): ${basePrice} baubles`);
    console.log(`  Discount: ${basePrice - dynamicPrice} baubles (${((1 - dynamicPrice/basePrice)*100).toFixed(0)}% cheaper)\n`);

    mongoose.connection.close();
})().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
