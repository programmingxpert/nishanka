// Scan all economy + fun commands to find which ones DON'T use getGlobalMultiplier
const fs = require('fs');
const path = require('path');

const dirs = ['commands/economy', 'commands/fun'];
const results = [];

for (const dir of dirs) {
    const entries = fs.readdirSync(path.join(__dirname, '..', dir));
    for (const file of entries) {
        if (!file.endsWith('.js')) continue;
        const fullPath = path.join(__dirname, '..', dir, file);
        const content = fs.readFileSync(fullPath, 'utf8');
        const usesMultiplier = content.includes('getGlobalMultiplier') || content.includes('globalMultiplier');
        const hasEarnings = content.includes('earnings') || content.includes('reward') || content.includes('baubles +=') || content.includes('baubles +');
        
        results.push({
            file: `${dir}/${file}`,
            usesMultiplier,
            hasEarnings,
            MISSING: hasEarnings && !usesMultiplier
        });
    }
}

const missing = results.filter(r => r.MISSING);
const ok = results.filter(r => r.usesMultiplier);
const noEarnings = results.filter(r => !r.hasEarnings && !r.usesMultiplier);

console.log(`\n✅ Commands using the economy multiplier (${ok.length}):`);
ok.forEach(r => console.log(`   - ${r.file}`));

console.log(`\n❌ Commands with earnings but MISSING the multiplier (${missing.length}):`);
missing.forEach(r => console.log(`   - ${r.file}`));

console.log(`\nℹ️  Commands with no direct payout logic (${noEarnings.length}):`);
noEarnings.forEach(r => console.log(`   - ${r.file}`));
