const fs = require('fs');

let lines = fs.readFileSync('commands/economy/shop.js', 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
    // Import
    if (lines[i].includes(`const Bauble = require('../../models/baubleSchema');`)) {
        lines[i] = `const Bauble = require('../../models/baubleSchema');\nconst { getGlobalMultiplier } = require('../../utils/economyEngine');`;
    }
    // Rename price to basePrice in ITEMS
    if (lines[i].match(/^\s+price: \d+,$/)) {
        lines[i] = lines[i].replace('price:', 'basePrice:');
    }
    // Update executePurchase
    if (lines[i].includes(`async function executePurchase(userId, itemId, quantity, baubleData) {`)) {
        lines[i] = `async function executePurchase(userId, itemId, quantity, baubleData, globalMultiplier) {`;
    }
    if (lines[i].includes(`const totalPrice = item.price * quantity;`)) {
        lines[i] = `    const dynamicPrice = Math.floor(item.basePrice / globalMultiplier);\n    const totalPrice = dynamicPrice * quantity;`;
    }
    // Embed params
    if (lines[i].includes(`function getHomePageEmbed(baubles) {`)) {
        lines[i] = `function getHomePageEmbed(baubles, globalMultiplier) {`;
    }
    if (lines[i].includes(`\`💰 **Your Balance:** **\${baubles.toLocaleString()}** Baubles\\n\\n\` +`)) {
        lines[i] = `            \`💰 **Your Balance:** **\${baubles.toLocaleString()}** Baubles\\n\` +\n            \`📈 **Economy Multiplier:** **\${globalMultiplier.toFixed(2)}x** (Prices scale inversely with the multiplier)\\n\\n\` +`;
    }
    if (lines[i].includes(`function getBoostersPageEmbed(baubles) {`)) {
        lines[i] = `function getBoostersPageEmbed(baubles, globalMultiplier) {`;
    }
    if (lines[i].includes(`function getBoostersComponents() {`)) {
        lines[i] = `function getBoostersComponents(globalMultiplier) {`;
    }
    if (lines[i].includes(`function getCosmeticsPageEmbed(baubles) {`)) {
        lines[i] = `function getCosmeticsPageEmbed(baubles, globalMultiplier) {`;
    }
    if (lines[i].includes(`function getCosmeticsComponents() {`)) {
        lines[i] = `function getCosmeticsComponents(globalMultiplier) {`;
    }
    if (lines[i].includes(`function getHelpPageEmbed(baubles) {`)) {
        lines[i] = `function getHelpPageEmbed(baubles, globalMultiplier) {`;
    }
    // Replace item.price with Math.floor(item.basePrice / globalMultiplier)
    if (lines[i].includes(`Price: **\${item.price.toLocaleString()}** Baubles`)) {
        lines[i] = lines[i].replace(`item.price.toLocaleString()`, `Math.floor(item.basePrice / globalMultiplier).toLocaleString()`);
    }
    if (lines[i].includes(`\${item.price.toLocaleString()} Baubles - \${item.description.substring(0, 50)}`)) {
        lines[i] = lines[i].replace(`item.price.toLocaleString()`, `Math.floor(item.basePrice / globalMultiplier).toLocaleString()`);
    }

    // Function signatures
    if (lines[i].includes(`function getPageData(page, baubles) {`)) {
        lines[i] = `            function getPageData(page, baubles, globalMultiplier) {`;
    }
    if (lines[i].includes(`case 'home':`)) {
        lines[i] = lines[i].replace(`getHomePageEmbed(baubles)`, `getHomePageEmbed(baubles, globalMultiplier)`);
    }
    if (lines[i].includes(`case 'boosters':`)) {
        lines[i] = lines[i].replace(`getBoostersPageEmbed(baubles)`, `getBoostersPageEmbed(baubles, globalMultiplier)`).replace(`getBoostersComponents()`, `getBoostersComponents(globalMultiplier)`);
    }
    if (lines[i].includes(`case 'cosmetics':`)) {
        lines[i] = lines[i].replace(`getCosmeticsPageEmbed(baubles)`, `getCosmeticsPageEmbed(baubles, globalMultiplier)`).replace(`getCosmeticsComponents()`, `getCosmeticsComponents(globalMultiplier)`);
    }
    if (lines[i].includes(`case 'help':`)) {
        lines[i] = lines[i].replace(`getHelpPageEmbed(baubles)`, `getHelpPageEmbed(baubles, globalMultiplier)`);
    }
    
    // Inject globalMultiplier into interaction execute and prefix execute
    if (lines[i].includes(`let baubleData = await Bauble.findOne({ userId });`)) {
        lines[i] = `            const globalMultiplier = await getGlobalMultiplier();\n` + lines[i];
    }
    
    // executePurchase calls
    if (lines[i].includes(`const result = await executePurchase(userId, cleanId, quantityOption, baubleData);`)) {
        lines[i] = `                const result = await executePurchase(userId, cleanId, quantityOption, baubleData, globalMultiplier);`;
    }
    if (lines[i].includes(`const result = await executePurchase(userId, itemId, quantity, baubleData);`)) {
        lines[i] = `                const result = await executePurchase(userId, itemId, quantity, baubleData, globalMultiplier);`;
    }
    
    if (lines[i].includes(`const initialData = getPageData(currentPage, baubleData.baubles);`)) {
        lines[i] = `            const initialData = getPageData(currentPage, baubleData.baubles, globalMultiplier);`;
    }
    
    // Inside collectors, we need to fetch fresh multiplier or reuse. We will fetch fresh.
    if (lines[i].includes(`const freshData = await Bauble.findOne({ userId }) || { baubles: 0 };`)) {
        lines[i] = `                    const freshMultiplier = await getGlobalMultiplier();\n` + lines[i];
    }
    if (lines[i].includes(`const freshData = await Bauble.findOne({ userId });`)) {
        lines[i] = `                    const freshMultiplier = await getGlobalMultiplier();\n` + lines[i];
    }
    
    if (lines[i].includes(`const pageData = getPageData(currentPage, freshData.baubles);`)) {
        lines[i] = `                    const pageData = getPageData(currentPage, freshData.baubles, freshMultiplier);`;
    }
    if (lines[i].includes(`const result = await executePurchase(userId, selectedId, 1, freshData);`)) {
        lines[i] = `                    const result = await executePurchase(userId, selectedId, 1, freshData, freshMultiplier);`;
    }
}

fs.writeFileSync('commands/economy/shop.js', lines.join('\n'));
console.log("Updated shop.js");
