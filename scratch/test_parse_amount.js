const assert = require('assert');
const { parseAmount } = require('../utils/economyEngine');

console.log('Running parseAmount unit tests...');

const testCases = [
    { input: '10K', expected: 10000 },
    { input: '10k', expected: 10000 },
    { input: ' 10 k ', expected: 10000 }, // spacing handling
    { input: '1.5K', expected: 1500 },
    { input: '2.5M', expected: 2500000 },
    { input: '2.5m', expected: 2500000 },
    { input: '1B', expected: 1000000000 },
    { input: '1b', expected: 1000000000 },
    { input: '100', expected: 100 },
    { input: '1,000', expected: 1000 },
    { input: '1,500K', expected: 1500000 },
    { input: 120, expected: 120 },
    { input: 'invalid', expected: NaN }
];

for (const t of testCases) {
    const result = parseAmount(t.input);
    if (isNaN(t.expected)) {
        assert(isNaN(result), `Expected parseAmount(${JSON.stringify(t.input)}) to return NaN, got ${result}`);
    } else {
        assert.strictEqual(result, t.expected, `Expected parseAmount(${JSON.stringify(t.input)}) to return ${t.expected}, got ${result}`);
    }
}

console.log('✅ All parseAmount tests passed successfully!');
