function getMultiplierConstantEdge(totalTiles, minesCount, revealedCount) {
    if (revealedCount === 0) return 1.0;
    
    // Constant house edge of 5%
    const houseEdge = 0.05;
    
    let waysTotal = 1;
    let waysWinning = 1;
    for (let i = 0; i < revealedCount; i++) {
        waysTotal *= (totalTiles - i);
        waysWinning *= (totalTiles - minesCount - i);
    }
    const mult = (1 - houseEdge) * (waysTotal / waysWinning);
    return Math.round(mult * 100) / 100;
}

for (let m = 1; m <= 15; m++) {
    let clickMults = [];
    const maxDiamonds = 16 - m;
    const clicksToPrint = Math.min(5, maxDiamonds);
    for (let c = 1; c <= clicksToPrint; c++) {
        clickMults.push(`${c} click: ${getMultiplierConstantEdge(16, m, c)}x`);
    }
    console.log(`Mines: ${m} | ${clickMults.join(' | ')}`);
}
