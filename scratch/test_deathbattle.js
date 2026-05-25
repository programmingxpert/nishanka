const { EmbedBuilder } = require('discord.js');

// Mock user objects
const user1 = { id: '123', username: 'Player1', displayAvatarURL: () => 'http://avatar1' };
const user2 = { id: '456', username: 'Player2', displayAvatarURL: () => 'http://avatar2', bot: false };

async function runSingleGame() {
    let p1 = {
        user: user1,
        hp: 100,
        defending: false,
        confused: false,
        soggyTurns: 0
    };
    let p2 = {
        user: user2,
        hp: 100,
        defending: false,
        confused: false,
        soggyTurns: 0
    };

    let turnPlayer = p1;
    let idlePlayer = p2;
    let turnCount = 1;
    let lastActionText = `The death battle has begun!`;

    const actions = ['attack', 'defend', 'chaos', 'item'];

    let gameEnded = false;
    let turnsRun = 0;

    while (!gameEnded && turnsRun < 100) {
        turnsRun++;
        
        if (turnPlayer.confused) {
            turnPlayer.confused = false;
            lastActionText = `💫 **${turnPlayer.user.username}** is too confused to move and skips their turn!`;
            turnCount++;
            let temp = turnPlayer;
            turnPlayer = idlePlayer;
            idlePlayer = temp;
            continue;
        }

        // Decrement soggy turns if any
        if (turnPlayer.soggyTurns > 0) {
            turnPlayer.soggyTurns--;
        }

        // Pick action
        const rand = Math.random();
        let chosenAction = 'attack';
        if (rand < 0.25) chosenAction = 'attack';
        else if (rand < 0.50) chosenAction = 'defend';
        else if (rand < 0.75) chosenAction = 'chaos';
        else chosenAction = 'item';

        turnPlayer.defending = false;

        let damage = 0;
        let healAmount = 0;

        if (chosenAction === 'attack') {
            damage = Math.floor(Math.random() * 9) + 12; // 12-20
            if (idlePlayer.defending) damage = Math.floor(damage / 2);
            if (turnPlayer.soggyTurns > 0) damage = Math.floor(damage * 0.7);

            idlePlayer.hp = Math.max(0, idlePlayer.hp - damage);

            const templates = [
                (att, def) => `⚔️ **${att}** slaps **${def}** for **${damage} damage**!`,
                (att, def) => `⚔️ **${att}** throws keyboard at **${def}** for **${damage} damage**!`
            ];
            const t = templates[Math.floor(Math.random() * templates.length)];
            lastActionText = t(turnPlayer.user.username, idlePlayer.user.username);
        } 
        else if (chosenAction === 'defend') {
            turnPlayer.defending = true;
            healAmount = Math.floor(Math.random() * 6) + 5; // 5-10
            turnPlayer.hp = Math.min(100, turnPlayer.hp + healAmount);
            lastActionText = `🛡️ **${turnPlayer.user.username}** hides behind cardboard box!`;
        }
        else if (chosenAction === 'chaos') {
            const outcome = Math.random();
            if (outcome < 0.35) {
                damage = Math.floor(Math.random() * 21) + 30; // 30-50
                if (idlePlayer.defending) damage = Math.floor(damage / 2);
                if (turnPlayer.soggyTurns > 0) damage = Math.floor(damage * 0.7);
                idlePlayer.hp = Math.max(0, idlePlayer.hp - damage);
                lastActionText = `🌀 **${turnPlayer.user.username}** super blasts **${idlePlayer.user.username}** for **${damage} damage**!`;
            } else if (outcome < 0.70) {
                damage = Math.floor(Math.random() * 11) + 15; // 15-25
                turnPlayer.hp = Math.max(0, turnPlayer.hp - damage);
                lastActionText = `🌀 **${turnPlayer.user.username}**'s spell backfired for **${damage} damage**!`;
            } else if (outcome < 0.85) {
                const tempHp = turnPlayer.hp;
                turnPlayer.hp = idlePlayer.hp;
                idlePlayer.hp = tempHp;
                lastActionText = `🌀 **${turnPlayer.user.username}** swaps HP with **${idlePlayer.user.username}**!`;
            } else {
                turnPlayer.hp = Math.min(100, turnPlayer.hp + 15);
                idlePlayer.hp = Math.min(100, idlePlayer.hp + 15);
                lastActionText = `🌀 summoned tea set. Both players heal **15 HP**!`;
            }
        }
        else if (chosenAction === 'item') {
            const itemOptions = ['nokia', 'duck', 'shark', 'towel', 'system32'];
            const chosenItem = itemOptions[Math.floor(Math.random() * itemOptions.length)];

            if (chosenItem === 'nokia') {
                damage = Math.floor(Math.random() * 11) + 20; // 20-30
                if (turnPlayer.soggyTurns > 0) damage = Math.floor(damage * 0.7);
                idlePlayer.hp = Math.max(0, idlePlayer.hp - damage);
                lastActionText = `📦 Nokia for **${damage} damage**!`;
            } 
            else if (chosenItem === 'duck') {
                damage = 5;
                idlePlayer.hp = Math.max(0, idlePlayer.hp - damage);
                idlePlayer.confused = true;
                lastActionText = `📦 Rubber Duck stuns **${idlePlayer.user.username}**!`;
            }
            else if (chosenItem === 'shark') {
                damage = 15;
                if (idlePlayer.defending) damage = Math.floor(damage / 2);
                if (turnPlayer.soggyTurns > 0) damage = Math.floor(damage * 0.7);
                healAmount = 10;
                
                idlePlayer.hp = Math.max(0, idlePlayer.hp - damage);
                turnPlayer.hp = Math.min(100, turnPlayer.hp + healAmount);
                lastActionText = `📦 Baby Shark loop: **${damage} damage**, heals **${healAmount} HP**!`;
            }
            else if (chosenItem === 'towel') {
                damage = 10;
                if (idlePlayer.defending) damage = Math.floor(damage / 2);
                if (turnPlayer.soggyTurns > 0) damage = Math.floor(damage * 0.7);
                
                idlePlayer.hp = Math.max(0, idlePlayer.hp - damage);
                idlePlayer.soggyTurns = 2;
                lastActionText = `📦 Wet towel: **${damage} damage**, soggy status applied!`;
            }
            else if (chosenItem === 'system32') {
                if (Math.random() < 0.8) {
                    damage = 35;
                    if (idlePlayer.defending) damage = Math.floor(damage / 2);
                    if (turnPlayer.soggyTurns > 0) damage = Math.floor(damage * 0.7);
                    idlePlayer.hp = Math.max(0, idlePlayer.hp - damage);
                    lastActionText = `📦 System32 deleted: **${damage} damage**!`;
                } else {
                    lastActionText = `📦 System32 failed!`;
                }
            }
        }

        if (idlePlayer.hp <= 0) {
            gameEnded = true;
            break;
        }

        turnCount++;
        let temp = turnPlayer;
        turnPlayer = idlePlayer;
        idlePlayer = temp;
    }
}

async function runMassiveTest() {
    console.log('Running 10,000 simulated games...');
    for (let i = 0; i < 10000; i++) {
        await runSingleGame();
    }
    console.log('Successfully completed 10,000 games with no errors!');
}

runMassiveTest().catch(err => console.error('Test failed:', err));
