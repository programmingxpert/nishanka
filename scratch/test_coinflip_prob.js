let headsCount = 0;
let tailsCount = 0;
let drawCount = 0;
const simulations = 10000000;

for (let i = 0; i < simulations; i++) {
    const rand = Math.random();
    let outcome;
    if (rand < 0.001) {
        outcome = 'draw';
        drawCount++;
    } else if (rand < 0.5005) {
        outcome = 'heads';
        headsCount++;
    } else {
        outcome = 'tails';
        tailsCount++;
    }
}

console.log(`Out of ${simulations.toLocaleString()} flips:`);
console.log(`Heads: ${headsCount.toLocaleString()} (${((headsCount / simulations) * 100).toFixed(4)}%)`);
console.log(`Tails: ${tailsCount.toLocaleString()} (${((tailsCount / simulations) * 100).toFixed(4)}%)`);
console.log(`Draw:  ${drawCount.toLocaleString()} (${((drawCount / simulations) * 100).toFixed(4)}%)`);
