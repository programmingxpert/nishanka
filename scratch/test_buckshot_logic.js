const assert = require('assert');
const fs = require('fs');

console.log('Running Buckshot logic verification...');

const code = fs.readFileSync(__dirname + '/../commands/economy/buckshot.js', 'utf8');

// Extract reloadShotgun
const reloadShotgunStart = code.indexOf('function reloadShotgun(');
const reloadShotgunEnd = code.indexOf('function giveItems(', reloadShotgunStart);
const reloadShotgunCode = code.substring(reloadShotgunStart, reloadShotgunEnd);

const reloadShotgun = eval(`(function() {
    return ${reloadShotgunCode.trim()};
})()`);

console.log('Verifying reloadShotgun balanced shells generation across 1000 runs...');
for (let i = 0; i < 1000; i++) {
    const result = reloadShotgun();
    assert(result.shells.length >= 2 && result.shells.length <= 8, `Expected shells count to be 2-8, got ${result.shells.length}`);
    const diff = Math.abs(result.live - result.blank);
    assert(diff <= 1, `Expected difference between live (${result.live}) and blank (${result.blank}) to be <= 1`);
    assert.strictEqual(result.live + result.blank, result.shells.length, 'Sum of live and blank should equal shells array length');
}
console.log('✅ reloadShotgun balanced shells verification passed!');

// Extract giveItems
const giveItemsStart = code.indexOf('function giveItems(');
const giveItemsEnd = code.indexOf('module.exports = {', giveItemsStart);
const giveItemsCode = code.substring(giveItemsStart, giveItemsEnd);

const mockItems = [
    { id: 'magnifier', name: 'Magnifying Glass', emoji: '🔍', desc: 'Check the current shell secretly.' },
    { id: 'beer', name: 'Energy Drink', emoji: '🍺', desc: 'Rack the shotgun, ejecting the current shell.' },
    { id: 'cigar', name: 'Cigar', emoji: '🚬', desc: 'Heals you for 1 HP.' },
    { id: 'saw', name: 'Handsaw', emoji: '🪚', desc: 'Your next shot deals 2 damage.' },
    { id: 'handcuffs', name: 'Handcuffs', emoji: '🔗', desc: 'Opponent skips their next turn.' },
    { id: 'inverter', name: 'Inverter', emoji: '🔄', desc: 'Inverts the current shell in the chamber (live becomes blank, blank becomes live).' }
];

const giveItems = eval(`(function() {
    const ITEMS = ${JSON.stringify(mockItems)};
    function getRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
    return ${giveItemsCode.trim()};
})()`);

console.log('Verifying giveItems item allotment across 1000 runs...');
for (let i = 0; i < 1000; i++) {
    const p1 = { items: [] };
    const p2 = { items: [] };
    const amount = Math.floor(Math.random() * 3) + 2;
    giveItems(p1, amount);
    giveItems(p2, amount);
    assert.strictEqual(p1.items.length, amount, `Expected p1 to have ${amount} items, got ${p1.items.length}`);
    assert.strictEqual(p2.items.length, amount, `Expected p2 to have ${amount} items, got ${p2.items.length}`);
    
    // Verify each item is a valid item from mockItems
    for (const item of p1.items) {
        assert(mockItems.some(mi => mi.id === item.id), `Invalid item id found: ${item.id}`);
    }
}
console.log('✅ giveItems item allotment verification passed!');
