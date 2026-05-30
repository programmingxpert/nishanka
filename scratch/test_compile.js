try {
    console.log("Checking commands/fun/truthordare.js...");
    const tod = require('../commands/fun/truthordare.js');
    console.log("✅ truthordare.js loaded successfully.");

    console.log("Checking commands/economy/bauble.js...");
    const bauble = require('../commands/economy/bauble.js');
    console.log("✅ bauble.js loaded successfully.");

    console.log("Checking models/baubleSchema.js...");
    const schema = require('../models/baubleSchema.js');
    console.log("✅ baubleSchema.js loaded successfully.");

    console.log("Checking commands/fun/animebattle.js...");
    const ab = require('../commands/fun/animebattle.js');
    console.log("✅ animebattle.js loaded successfully.");

    console.log("🎉 All files loaded and compiled successfully!");
} catch (err) {
    console.error("❌ Compilation check failed:", err);
    process.exit(1);
}
