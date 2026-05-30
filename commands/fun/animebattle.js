/* eslint-disable */
const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    StringSelectMenuBuilder,
    ButtonStyle, 
    ComponentType 
} = require('discord.js');
const Bauble = require('../../models/baubleSchema');
const { getGlobalMultiplier } = require('../../utils/economyEngine');

// Helper to generate random number within a range
function randRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// RPG-style stat bar builder
function buildProgressBar(current, max, colorEmoji, emptyEmoji = '⬛', length = 12, suffix = '') {
    const filledCount = Math.min(length, Math.max(0, Math.round((current / max) * length)));
    const emptyCount = length - filledCount;
    const percentage = Math.round((current / max) * 100);
    return `${colorEmoji.repeat(filledCount)}${emptyEmoji.repeat(emptyCount)} **${current}/${max}${suffix}** (${percentage}%)`;
}

// Dynamic Giphy search scraper to parse direct GIF links
async function fetchGiphyGifs(query) {
    const formattedQuery = encodeURIComponent(query.replace(/\s+/g, '-'));
    const url = `https://giphy.com/search/${formattedQuery}`;
    
    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
            }
        });
        
        if (!res.ok) return [];
        const html = await res.text();
        
        // Matches Giphy direct CDN media URLs
        const regex = /https:\/\/media\d+\.giphy\.com\/media\/[a-zA-Z0-9_.\-\/]+\/giphy\.gif/g;
        const matches = html.match(regex) || [];
        
        return [...new Set(matches)];
    } catch (e) {
        console.error("Giphy scraper error:", e);
        return [];
    }
}

// Shared combat math helper to handle damage, critical hits, and buff multipliers
function executeAttack(p, o, minDmg, maxDmg, ignoreShield = false) {
    let baseDmg = randRange(minDmg, maxDmg);
    let isCrit = Math.random() < 0.10;
    let finalDmg = baseDmg;

    // Critical Hit multiplier (1.5x)
    if (isCrit) {
        finalDmg = Math.floor(finalDmg * 1.5);
    }

    // Character specific attack buffs
    if (p.ssjBuff) finalDmg = Math.floor(finalDmg * 1.4);
    if (p.kuramaBuff) finalDmg = Math.floor(finalDmg * 1.3);
    if (p.sageBuff) finalDmg = Math.floor(finalDmg * 1.3);
    if (p.goldBuff) finalDmg = Math.floor(finalDmg * 1.4);

    // Defender shield reduction
    if (o.shield && !ignoreShield) {
        finalDmg = Math.floor(finalDmg * (1 - o.shieldRate));
    }

    finalDmg = Math.max(0, finalDmg);
    o.hp = Math.max(0, o.hp - finalDmg);

    return { damage: finalDmg, isCrit };
}

// ─── Playable Characters ─────────────────────────────────────────────────────
const PLAYABLE_CHARACTERS = [
    {
        name: 'Goku',
        emoji: '🔥',
        series: 'Dragon Ball',
        maxHp: 125,
        avatar: 'https://i.imgur.com/Kz8Jp58.png',
        abilities: [
            { 
                name: 'Kamehameha', 
                cost: 25, 
                query: 'goku-kamehameha',
                style: ButtonStyle.Primary,
                desc: '💥 Fires a powerful energy wave dealing 18-28 damage.', 
                execute: (p, o) => {
                    const { damage, isCrit } = executeAttack(p, o, 18, 28);
                    const ssjUsed = p.ssjBuff;
                    if (p.ssjBuff) p.ssjBuff = false; // consume buff
                    
                    let log = `🗣️ Goku: *"Ka... me... ha... me... HA!"*\n` +
                              `💥 **Goku** fired a massive **Kamehameha** at **${o.name}** dealing **${damage}** damage!`;
                    if (isCrit) log = `✨ **CRITICAL HIT!** ✨\n` + log;
                    if (ssjUsed) log += `\n⚡ *(Super Saiyan Boosted!)*`;
                    return log;
                }
            },
            { 
                name: 'Super Saiyan', 
                cost: 0, 
                query: 'goku-super-saiyan-power-up',
                style: ButtonStyle.Success,
                desc: '⚡ Powers up! Gains +30 Energy, heals 15 HP, and boosts next attack by 40%.', 
                execute: (p, o) => {
                    p.ssjBuff = true;
                    p.energy = Math.min(100, p.energy + 30);
                    p.hp = Math.min(p.maxHp, p.hp + 15);
                    return `🗣️ Goku: *"And this... is to go even further beyond!"*\n` +
                           `⚡ **Goku** powered up into **Super Saiyan**! Heals **15 HP**, gains **+30 Energy**, and boosts his next attack's damage by **40%**!`;
                }
            },
            { 
                name: 'Instant Transmission', 
                cost: 15, 
                query: 'goku-instant-transmission',
                style: ButtonStyle.Primary,
                desc: '🌀 Evades the next attack and counters for 10 damage.', 
                execute: (p, o) => {
                    p.dodge = true;
                    p.dodgeCounter = 10;
                    return `🗣️ Goku: *"You can't catch me!"*\n` +
                           `🌀 **Goku** vanishes using **Instant Transmission**, preparing to evade the next attack and counter-attack!`;
                }
            },
            { 
                name: 'Spirit Bomb', 
                cost: 60, 
                query: 'goku-spirit-bomb',
                style: ButtonStyle.Danger,
                desc: '🌟 Gathers planetary energy to hurl a colossal Spirit Bomb dealing 40-60 damage.', 
                execute: (p, o) => {
                    const { damage, isCrit } = executeAttack(p, o, 40, 60);
                    const ssjUsed = p.ssjBuff;
                    if (p.ssjBuff) p.ssjBuff = false;
                    
                    let log = `🗣️ Goku: *"People of Earth! Share your energy with me!"*\n` +
                              `🌟 **Goku** hurls a colossal **Spirit Bomb** at **${o.name}** for **${damage}** massive damage!`;
                    if (isCrit) log = `✨ **CRITICAL HIT!** ✨\n` + log;
                    if (ssjUsed) log += `\n⚡ *(Super Saiyan Boosted!)*`;
                    return log;
                }
            }
        ]
    },
    {
        name: 'Gojo Satoru',
        emoji: '👁️',
        series: 'Jujutsu Kaisen',
        maxHp: 100,
        avatar: 'https://i.imgur.com/6a6Q46L.png',
        abilities: [
            { 
                name: 'Reversal Red', 
                cost: 20, 
                query: 'gojo-reversal-red',
                style: ButtonStyle.Primary,
                desc: '🔴 Deals 16-24 repelling damage.', 
                execute: (p, o) => {
                    const { damage, isCrit } = executeAttack(p, o, 16, 24);
                    let log = `🗣️ Gojo: *"Curse Technique Reversal: Red."*\n` +
                              `🔴 **Gojo** released Curse Technique Reversal **Red** dealing **${damage}** damage to **${o.name}**!`;
                    if (isCrit) log = `✨ **CRITICAL HIT!** ✨\n` + log;
                    return log;
                }
            },
            { 
                name: 'Infinity Shield', 
                cost: 10, 
                query: 'gojo-infinity',
                style: ButtonStyle.Success,
                desc: '🛡️ Deploys Infinity. Reduces incoming damage by 80% for 2 turns and heals 10 HP.', 
                execute: (p, o) => {
                    p.shield = true;
                    p.shieldTurns = 2;
                    p.shieldRate = 0.8;
                    p.hp = Math.min(p.maxHp, p.hp + 10);
                    return `🗣️ Gojo: *"My Infinity exists everywhere around me."*\n` +
                           `🛡️ **Gojo** deployed his **Infinity** shield! Incoming damage reduced by **80%** for 2 turns. Heals **10 HP**.`;
                }
            },
            { 
                name: 'Curse Lapse Blue', 
                cost: 25, 
                query: 'gojo-lapse-blue',
                style: ButtonStyle.Primary,
                desc: '🔵 Deals 10 damage and stuns the opponent for 1 turn.', 
                execute: (p, o) => {
                    const { damage, isCrit } = executeAttack(p, o, 10, 10);
                    o.stunned = true;
                    let log = `🗣️ Gojo: *"Curse Technique Lapse: Blue!"*\n` +
                              `🔵 **Gojo** uses **Blue** to pull **${o.name}** in, dealing **${damage}** damage and **stunning** them for 1 turn!`;
                    if (isCrit) log = `✨ **CRITICAL HIT!** ✨\n` + log;
                    return log;
                }
            },
            { 
                name: 'Unlimited Void', 
                cost: 70, 
                query: 'gojo-satoru-unlimited-void',
                style: ButtonStyle.Danger,
                desc: '🌌 Expands domain. Deals 35-45 absolute damage (ignores shield) and stuns for 1 turn.', 
                execute: (p, o) => {
                    const { damage, isCrit } = executeAttack(p, o, 35, 45, true);
                    o.stunned = true;
                    let log = `🗣️ Gojo: *"Domain Expansion: Unlimited Void."*\n` +
                              `🌌 **Gojo** expands **Unlimited Void**! Brain-overloading **${o.name}**, dealing **${damage}** absolute damage and **stunning** them for 1 turn!`;
                    if (isCrit) log = `✨ **CRITICAL HIT!** ✨\n` + log;
                    return log;
                }
            }
        ]
    },
    {
        name: 'Saitama',
        emoji: '🥚',
        series: 'One Punch Man',
        maxHp: 95,
        avatar: 'https://i.imgur.com/8Q8W17Y.png',
        abilities: [
            { 
                name: 'Normal Punch', 
                cost: 0, 
                query: 'saitama-normal-punch',
                style: ButtonStyle.Primary,
                desc: '✊ Standard punch dealing 12-16 damage. Gains +20 Energy.', 
                execute: (p, o) => {
                    const { damage, isCrit } = executeAttack(p, o, 12, 16);
                    p.energy = Math.min(100, p.energy + 20);
                    let log = `🗣️ Saitama: *"I'll just use a normal punch."*\n` +
                              `✊ **Saitama** threw a **Normal Punch** at **${o.name}** dealing **${damage}** damage and gaining **+20 Energy**!`;
                    if (isCrit) log = `✨ **CRITICAL HIT!** ✨\n` + log;
                    return log;
                }
            },
            { 
                name: 'Serious Dodge', 
                cost: 10, 
                query: 'saitama-serious-side-steps',
                style: ButtonStyle.Success,
                desc: '💨 Evades all attacks next turn, gains +30 Energy, and heals 10 HP.', 
                execute: (p, o) => {
                    p.dodge = true;
                    p.dodgeCounter = 0;
                    p.energy = Math.min(100, p.energy + 30);
                    p.hp = Math.min(p.maxHp, p.hp + 10);
                    return `🗣️ Saitama: *"Serious Series... Serious Side-Steps!"*\n` +
                           `💨 **Saitama** executed a **Serious Dodge** side-step! Evading all attacks next turn, gaining **+30 Energy**, and healing **10 HP**.`;
                }
            },
            { 
                name: 'Consecutive Punches', 
                cost: 20, 
                query: 'saitama-consecutive-normal-punches',
                style: ButtonStyle.Primary,
                desc: '👊 Rapid punches dealing 16-30 damage.', 
                execute: (p, o) => {
                    let hits = randRange(4, 6);
                    let baseTotal = 0;
                    let hasCrit = false;
                    for (let k = 0; k < hits; k++) {
                        const { damage, isCrit } = executeAttack(p, o, 4, 5);
                        baseTotal += damage;
                        if (isCrit) hasCrit = true;
                    }
                    let log = `🗣️ Saitama: *"Consecutive Normal Punches."*\n` +
                              `👊 **Saitama** landed **${hits} Consecutive Normal Punches** on **${o.name}** for **${baseTotal}** total damage!`;
                    if (hasCrit) log = `✨ **CRITICAL HITS!** ✨\n` + log;
                    return log;
                }
            },
            { 
                name: 'Serious Punch', 
                cost: 80, 
                query: 'saitama-serious-punch',
                style: ButtonStyle.Danger,
                desc: '💥 Serious Series: Serious Punch! Deals 60-80 apocalyptic damage.', 
                execute: (p, o) => {
                    const { damage, isCrit } = executeAttack(p, o, 60, 80);
                    let log = `🗣️ Saitama: *"Serious Series... SERIOUS PUNCH!"*\n` +
                              `💥 **Saitama** unleashed a **Serious Punch**! The shockwave blasts **${o.name}** for **${damage}** colossal damage, parting the clouds!`;
                    if (isCrit) log = `✨ **CRITICAL HIT!** ✨\n` + log;
                    return log;
                }
            }
        ]
    },
    {
        name: 'Naruto Uzumaki',
        emoji: '🍥',
        series: 'Naruto',
        maxHp: 110,
        avatar: 'https://i.imgur.com/gK9C1lS.png',
        abilities: [
            { 
                name: 'Rasengan', 
                cost: 20, 
                query: 'naruto-rasengan',
                style: ButtonStyle.Primary,
                desc: '🌀 Swirling sphere of chakra dealing 16-26 damage.', 
                execute: (p, o) => {
                    const { damage, isCrit } = executeAttack(p, o, 16, 26);
                    let log = `🗣️ Naruto: *"Rasengan!"*\n` +
                              `🌀 **Naruto** charges forward with a **Rasengan**, smashing **${o.name}** for **${damage}** damage!`;
                    if (isCrit) log = `✨ **CRITICAL HIT!** ✨\n` + log;
                    return log;
                }
            },
            { 
                name: 'Shadow Clone Jutsu', 
                cost: 15, 
                query: 'naruto-shadow-clone-jutsu',
                style: ButtonStyle.Primary,
                desc: '👥 Summons clones. Evades the next attack completely and counters for 10 damage.', 
                execute: (p, o) => {
                    p.dodge = true;
                    p.dodgeCounter = 10;
                    return `🗣️ Naruto: *"Shadow Clone Jutsu!"*\n` +
                           `👥 **Naruto** creates a squad of **Shadow Clones**! They prepare to shield the real Naruto and counter-attack.`;
                }
            },
            { 
                name: 'Kurama Sage Mode', 
                cost: 0, 
                query: 'naruto-kurama-link-mode',
                style: ButtonStyle.Success,
                desc: '🦊 Heals 20 HP, gains +40 Energy, and boosts all damage by 30% for 3 turns.', 
                execute: (p, o) => {
                    p.kuramaBuff = true;
                    p.kuramaBuffTurns = 3;
                    p.energy = Math.min(100, p.energy + 40);
                    p.hp = Math.min(p.maxHp, p.hp + 20);
                    return `🗣️ Naruto: *"Let's do this, Kurama! Combined power!"*\n` +
                           `🦊 **Naruto** enters **Kurama Sage Mode**! Heals **20 HP**, gains **+40 Energy**, and gains a **30% damage boost** for 3 turns!`;
                }
            },
            { 
                name: 'Rasenshuriken', 
                cost: 60, 
                query: 'naruto-rasenshuriken',
                style: ButtonStyle.Danger,
                desc: '🌪️ Throws a wind-shuriken of dense Tailed Beast chakra dealing 38-50 damage.', 
                execute: (p, o) => {
                    const { damage, isCrit } = executeAttack(p, o, 38, 50);
                    let log = `🗣️ Naruto: *"Wind Style: Rasenshuriken!"*\n` +
                              `🌪️ **Naruto** hurls a **Tailed Beast Rasenshuriken**! The wind vortex shreds **${o.name}** for **${damage}** massive damage!`;
                    if (isCrit) log = `✨ **CRITICAL HIT!** ✨\n` + log;
                    return log;
                }
            }
        ]
    },
    {
        name: 'Monkey D. Luffy',
        emoji: '👒',
        series: 'One Piece',
        maxHp: 115,
        avatar: 'https://i.imgur.com/E16J5xK.png',
        abilities: [
            { 
                name: 'Gum-Gum Pistol', 
                cost: 0, 
                query: 'luffy-gum-gum-pistol',
                style: ButtonStyle.Primary,
                desc: '🥊 Stretches his arm for a quick punch dealing 14-18 damage. Gains +25 Energy.', 
                execute: (p, o) => {
                    const { damage, isCrit } = executeAttack(p, o, 14, 18);
                    p.energy = Math.min(100, p.energy + 25);
                    let log = `🗣️ Luffy: *"Gum-Gum... PISTOL!"*\n` +
                              `🥊 **Luffy** stretches his arm and lands a **Gum-Gum Pistol** on **${o.name}** for **${damage}** damage, gaining **+25 Energy**!`;
                    if (isCrit) log = `✨ **CRITICAL HIT!** ✨\n` + log;
                    return log;
                }
            },
            { 
                name: 'Gear 2nd Speed', 
                cost: 30, 
                query: 'luffy-gear-second',
                style: ButtonStyle.Primary,
                desc: '⚡ Deals 10 damage and grants an immediate extra turn!', 
                execute: (p, o) => {
                    const { damage, isCrit } = executeAttack(p, o, 10, 10);
                    p.extraTurn = true;
                    let log = `🗣️ Luffy: *"Gear... SECOND!"*\n` +
                              `⚡ **Luffy** activates **Gear 2nd**! Strikes **${o.name}** for **${damage}** damage and speeds up, gaining an immediate extra turn!`;
                    if (isCrit) log = `✨ **CRITICAL HIT!** ✨\n` + log;
                    return log;
                }
            },
            { 
                name: 'Rubber Haki Defense', 
                cost: 10, 
                query: 'luffy-armament-haki',
                style: ButtonStyle.Success,
                desc: '🛡️ Reduces damage by 60% and reflects 30% of incoming damage next turn.', 
                execute: (p, o) => {
                    p.shield = true;
                    p.shieldTurns = 1;
                    p.shieldRate = 0.6;
                    p.reflect = true;
                    return `🗣️ Luffy: *"Busoshoku Haki!"*\n` +
                           `🛡️ **Luffy** hardens with Armament Haki! Reduces damage taken by **60%** and reflects **30%** of incoming damage!`;
                }
            },
            { 
                name: 'Bajrang Gun', 
                cost: 70, 
                query: 'luffy-gear-5-bajrang-gun',
                style: ButtonStyle.Danger,
                desc: '☀️ Sun God Nika! Deals 35-55 damage and stuns the target for 1 turn.', 
                execute: (p, o) => {
                    const { damage, isCrit } = executeAttack(p, o, 35, 55);
                    o.stunned = true;
                    let log = `🗣️ Luffy: *"This is my peak! Bajrang Gun!"*\n` +
                              `☀️ **Luffy** laughs joyfully in **Gear 5th** and crushes **${o.name}** with a giant **Bajrang Gun** for **${damage}** damage, **stunning** them!`;
                    if (isCrit) log = `✨ **CRITICAL HIT!** ✨\n` + log;
                    return log;
                }
            }
        ]
    },
    {
        name: 'Rimuru Tempest',
        emoji: '💧',
        series: 'Slime',
        maxHp: 105,
        avatar: 'https://i.imgur.com/KqW426A.png',
        abilities: [
            { 
                name: 'Water Blade', 
                cost: 15, 
                query: 'rimuru-tempest-water-blade',
                style: ButtonStyle.Primary,
                desc: '🌊 Sharp water blades dealing 15-22 damage.', 
                execute: (p, o) => {
                    const { damage, isCrit } = executeAttack(p, o, 15, 22);
                    let log = `🗣️ Rimuru: *"Water Blade!"*\n` +
                              `🌊 **Rimuru** fires sharp, slicing **Water Blades** at **${o.name}** dealing **${damage}** damage!`;
                    if (isCrit) log = `✨ **CRITICAL HIT!** ✨\n` + log;
                    return log;
                }
            },
            { 
                name: 'Gluttony', 
                cost: 25, 
                query: 'rimuru-tempest-gluttony',
                style: ButtonStyle.Primary,
                desc: '😈 Devours enemy energy. Deals 15-20 damage and heals Rimuru for the same amount.', 
                execute: (p, o) => {
                    const { damage, isCrit } = executeAttack(p, o, 15, 20);
                    p.hp = Math.min(p.maxHp, p.hp + damage);
                    let log = `🗣️ Rimuru: *"Devour everything... Beelzebuth!"*\n` +
                              `😈 **Rimuru** devours **${o.name}**'s lifeforce. Deals **${damage}** damage and heals Rimuru for that amount!`;
                    if (isCrit) log = `✨ **CRITICAL HIT!** ✨\n` + log;
                    return log;
                }
            },
            { 
                name: 'Great Sage Analysis', 
                cost: 0, 
                query: 'rimuru-tempest-great-sage',
                style: ButtonStyle.Success,
                desc: '🧠 Gains +35 Energy, heals 10 HP, and next attack deals +30% damage.', 
                execute: (p, o) => {
                    p.sageBuff = true;
                    p.energy = Math.min(100, p.energy + 35);
                    p.hp = Math.min(p.maxHp, p.hp + 10);
                    return `🗣️ Rimuru: *"Great Sage, analyze the opponent!"*\n` +
                           `🧠 **Rimuru** consults **Great Sage**! Analyzes weakness, gains **+35 Energy**, heals **10 HP**, and boosts next attack by **30%**!`;
                }
            },
            { 
                name: 'Megiddo', 
                cost: 65, 
                query: 'rimuru-tempest-megiddo',
                style: ButtonStyle.Danger,
                desc: '☀️ Solar rays deal 35-45 damage and burn for 6 damage/turn for 2 turns.', 
                execute: (p, o) => {
                    const { damage, isCrit } = executeAttack(p, o, 35, 45);
                    const sageUsed = p.sageBuff;
                    if (p.sageBuff) p.sageBuff = false;
                    o.burned = true;
                    o.burnTurns = 2;
                    o.burnDmg = 6;
                    
                    let log = `🗣️ Rimuru: *"May the wrath of the gods pierce you. Megiddo!"*\n` +
                              `☀️ **Rimuru** executes **Megiddo**! Solar rays pierce **${o.name}** dealing **${damage}** damage and leaving them **burned**!`;
                    if (isCrit) log = `✨ **CRITICAL HIT!** ✨\n` + log;
                    if (sageUsed) log += `\n🧠 *(Great Sage Boosted!)*`;
                    return log;
                }
            }
        ]
    }
];

// ─── Boss Opponents ──────────────────────────────────────────────────────────
const BOSSES = [
    {
        name: 'Sukuna',
        emoji: '💀',
        maxHp: 120,
        avatar: 'https://i.imgur.com/eB0rNpe.png',
        abilities: [
            { 
                name: 'Dismantle', 
                cost: 0, 
                query: 'sukuna-dismantle', 
                execute: (p, o) => {
                    const { damage, isCrit } = executeAttack(p, o, 14, 19);
                    let log = `🗣️ Sukuna: *"Dismantle."*\n` +
                              `⚔️ **Sukuna** casts **Dismantle** dealing **${damage}** slashing damage to **${o.name}**!`;
                    if (isCrit) log = `✨ **CRITICAL HIT!** ✨\n` + log;
                    return log;
                }
            },
            { 
                name: 'Cleave', 
                cost: 25, 
                query: 'sukuna-cleave', 
                execute: (p, o) => {
                    const { damage, isCrit } = executeAttack(p, o, 20, 26);
                    let log = `🗣️ Sukuna: *"Cleave!"*\n` +
                              `⚔️ **Sukuna** casts **Cleave** on **${o.name}** dealing **${damage}** high-slashing damage!`;
                    if (isCrit) log = `✨ **CRITICAL HIT!** ✨\n` + log;
                    return log;
                }
            },
            { 
                name: 'Flame Arrow', 
                cost: 35, 
                query: 'sukuna-fire-arrow', 
                execute: (p, o) => {
                    const { damage, isCrit } = executeAttack(p, o, 22, 30);
                    let log = `🗣️ Sukuna: *"Open (Fuga)."*\n` +
                              `🔥 **Sukuna** fires his **Flame Arrow (Fuga)** hitting **${o.name}** for **${damage}** fire damage!`;
                    if (isCrit) log = `✨ **CRITICAL HIT!** ✨\n` + log;
                    return log;
                }
            },
            { 
                name: 'Malevolent Shrine', 
                cost: 60, 
                query: 'sukuna-malevolent-shrine', 
                execute: (p, o) => {
                    const { damage, isCrit } = executeAttack(p, o, 35, 45, true);
                    let log = `🗣️ Sukuna: *"Domain Expansion: Malevolent Shrine."*\n` +
                              `⛩️ **Sukuna** expands his domain: **Malevolent Shrine**! A storm of cuts shreds **${o.name}** for **${damage}** absolute damage!`;
                    if (isCrit) log = `✨ **CRITICAL HIT!** ✨\n` + log;
                    return log;
                }
            }
        ]
    },
    {
        name: 'Madara Uchiha',
        emoji: '☄️',
        maxHp: 130,
        avatar: 'https://i.imgur.com/X4yD3mB.png',
        abilities: [
            { 
                name: 'Susanoo Strike', 
                cost: 0, 
                query: 'madara-susanoo', 
                execute: (p, o) => {
                    const { damage, isCrit } = executeAttack(p, o, 15, 20);
                    let log = `🗣️ Madara: *"This is the power of a god."*\n` +
                              `⚔️ **Madara** swings his **Susanoo Blade** dealing **${damage}** slash damage to **${o.name}**!`;
                    if (isCrit) log = `✨ **CRITICAL HIT!** ✨\n` + log;
                    return log;
                }
            },
            { 
                name: 'Destroyer Flame', 
                cost: 25, 
                query: 'madara-majestic-destroyer-flame', 
                execute: (p, o) => {
                    const { damage, isCrit } = executeAttack(p, o, 20, 27);
                    let log = `🗣️ Madara: *"Fire Style: Majestic Destroyer Flame!"*\n` +
                              `🔥 **Madara** spews a sea of fire, burning **${o.name}** for **${damage}** fire damage!`;
                    if (isCrit) log = `✨ **CRITICAL HIT!** ✨\n` + log;
                    return log;
                }
            },
            { 
                name: 'Deep Forest Emergence', 
                cost: 35, 
                query: 'madara-wood-style', 
                execute: (p, o) => {
                    const { damage, isCrit } = executeAttack(p, o, 10, 10);
                    o.stunned = true;
                    let log = `🗣️ Madara: *"Deep Forest Emergence!"*\n` +
                              `🪵 **Madara** uses Wood Style, trapping **${o.name}** for **${damage}** damage and **stunning** them for 1 turn!`;
                    if (isCrit) log = `✨ **CRITICAL HIT!** ✨\n` + log;
                    return log;
                }
            },
            { 
                name: 'Shattered Heaven', 
                cost: 60, 
                query: 'madara-shattered-heaven', 
                execute: (p, o) => {
                    const { damage, isCrit } = executeAttack(p, o, 35, 48);
                    let log = `🗣️ Madara: *"What will you do about the second one, Ohnoki?"*\n` +
                              `☄️ **Madara** summons a colossal meteor: **Shattered Heaven**! The sky falls upon **${o.name}** dealing **${damage}** devastating damage!`;
                    if (isCrit) log = `✨ **CRITICAL HIT!** ✨\n` + log;
                    return log;
                }
            }
        ]
    },
    {
        name: 'Kaido',
        emoji: '🐲',
        maxHp: 135,
        avatar: 'https://i.imgur.com/w2LdO9A.png',
        abilities: [
            { 
                name: 'Kanabo Strike', 
                cost: 0, 
                query: 'kaido-club-strike', 
                execute: (p, o) => {
                    const { damage, isCrit } = executeAttack(p, o, 14, 18);
                    let log = `🗣️ Kaido: *"Is that all you've got?"*\n` +
                              `🥊 **Kaido** swings his spiked club dealing **${damage}** blunt damage to **${o.name}**!`;
                    if (isCrit) log = `✨ **CRITICAL HIT!** ✨\n` + log;
                    return log;
                }
            },
            { 
                name: 'Bolo Breath', 
                cost: 25, 
                query: 'kaido-bolo-breath', 
                execute: (p, o) => {
                    const { damage, isCrit } = executeAttack(p, o, 18, 25);
                    let log = `🗣️ Kaido: *"Bolo Breath!"*\n` +
                              `🔥 **Kaido** releases **Bolo Breath** scorching **${o.name}** for **${damage}** fire damage!`;
                    if (isCrit) log = `✨ **CRITICAL HIT!** ✨\n` + log;
                    return log;
                }
            },
            { 
                name: 'Dragon Scale Fortify', 
                cost: 35, 
                query: 'kaido-dragon-scales', 
                execute: (p, o) => {
                    p.shield = true;
                    p.shieldTurns = 2;
                    p.shieldRate = 0.5;
                    p.hp = Math.min(p.maxHp, p.hp + 12);
                    return `🗣️ Kaido: *"My scales are indestructible!"*\n` +
                           `🐲 **Kaido** hardens his scales! Heals **12 HP** and reduces incoming damage by **50%** for 2 turns.`;
                }
            },
            { 
                name: 'Thunder Bagua', 
                cost: 60, 
                query: 'kaido-thunder-bagua', 
                execute: (p, o) => {
                    const { damage, isCrit } = executeAttack(p, o, 36, 46);
                    let log = `🗣️ Kaido: *"Raimei Hakke!"*\n` +
                              `⚡ **Kaido** blitzes forward at god speed, unleashing **Thunder Bagua** and smashing **${o.name}** for **${damage}** lightning damage!`;
                    if (isCrit) log = `✨ **CRITICAL HIT!** ✨\n` + log;
                    return log;
                }
            }
        ]
    },
    {
        name: 'Frieza',
        emoji: '🛸',
        maxHp: 115,
        avatar: 'https://i.imgur.com/7KylvE6.png',
        abilities: [
            { 
                name: 'Death Beam', 
                cost: 0, 
                query: 'frieza-death-beam', 
                execute: (p, o) => {
                    const { damage, isCrit } = executeAttack(p, o, 15, 20);
                    let log = `🗣️ Frieza: *"Why don't you just die?"*\n` +
                              `👉 **Frieza** fires a piercing **Death Beam** dealing **${damage}** damage to **${o.name}**!`;
                    if (isCrit) log = `✨ **CRITICAL HIT!** ✨\n` + log;
                    return log;
                }
            },
            { 
                name: 'Death Psycho Bomb', 
                cost: 25, 
                query: 'frieza-death-psycho-bomb', 
                execute: (p, o) => {
                    const { damage, isCrit } = executeAttack(p, o, 20, 26);
                    let log = `🗣️ Frieza: *"I'll blow you to pieces!"*\n` +
                              `🌀 **Frieza** detonates **${o.name}** with a **Death Psycho Bomb** for **${damage}** damage!`;
                    if (isCrit) log = `✨ **CRITICAL HIT!** ✨\n` + log;
                    return log;
                }
            },
            { 
                name: 'Golden Evolution', 
                cost: 35, 
                query: 'golden-frieza-transformation', 
                execute: (p, o) => {
                    p.hp = Math.min(p.maxHp, p.hp + 15);
                    p.goldBuff = true;
                    return `🗣️ Frieza: *"Behold... my Golden Form!"*\n` +
                           `✨ **Frieza** transforms into **Golden Frieza**! Heals **15 HP** and his next attack deals **40% more damage**!`;
                }
            },
            { 
                name: 'Supernova', 
                cost: 60, 
                query: 'frieza-supernova', 
                execute: (p, o) => {
                    const { damage, isCrit } = executeAttack(p, o, 38, 48);
                    const goldUsed = p.goldBuff;
                    if (p.goldBuff) p.goldBuff = false;
                    
                    let log = `🗣️ Frieza: *"I will reduce this planet to cosmic dust!"*\n` +
                              `☄️ **Frieza** drops the **Supernova** on **${o.name}** for **${damage}** absolute damage!`;
                    if (isCrit) log = `✨ **CRITICAL HIT!** ✨\n` + log;
                    if (goldUsed) log += `\n✨ *(Golden Evolution Boosted!)*`;
                    return log;
                }
            }
        ]
    }
];

module.exports = {
    category: 'fun',
    cooldown: 10,
    aliases: ['ab', 'animefight', 'fight'],
    data: new SlashCommandBuilder()
        .setName('animebattle')
        .setDescription('An epic interactive turn-based anime fighting minigame wagered with baubles!')
        .addIntegerOption(option =>
            option.setName('bet')
                .setDescription('The amount of Glimmering Baubles to bet (0 for free/fun).')
                .setRequired(true)
                .setMinValue(0)
        ),

    async execute(interaction) {
        const bet = interaction.options.getInteger('bet');
        await runAnimeBattle({
            context: interaction,
            userId: interaction.user.id,
            user: interaction.user,
            bet,
            isSlash: true
        });
    },

    async executePrefix(message, args) {
        let betArg = args[0] || '0';
        const bet = parseInt(betArg);

        if (isNaN(bet) || bet < 0) {
            return message.reply('❌ Please enter a valid non-negative integer for your bet. (Example: `-ab 500` or `-ab 0` for fun!)');
        }

        if (bet > 0 && bet < 200) {
            return message.reply('❌ The minimum bet to gamble is **200** Baubles. Set your bet to **0** to play for free!');
        }

        await runAnimeBattle({
            context: message,
            userId: message.author.id,
            user: message.author,
            bet,
            isSlash: false
        });
    }
};

async function runAnimeBattle({ context, userId, user, bet, isSlash }) {
    try {
        // 1. Database Balance Checks
        let baubleData = await Bauble.findOne({ userId });
        if (!baubleData) {
            baubleData = new Bauble({ userId, baubles: 0 });
            await baubleData.save();
        }

        if (bet > 0 && baubleData.baubles < bet) {
            const errorMsg = `❌ You only have **${baubleData.baubles}** Baubles. You cannot bet **${bet}** Baubles.`;
            return isSlash 
                ? context.reply({ content: errorMsg, ephemeral: true })
                : context.reply(errorMsg);
        }

        // 2. Character Selection Phase
        const selectEmbed = new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle('🎮 CHOOSE YOUR ANIME FIGHTER')
            .setDescription('Select the character you want to lead into battle!')
            .addFields(
                PLAYABLE_CHARACTERS.map(c => ({
                    name: `${c.emoji} ${c.name} (${c.series})`,
                    value: `**HP:** ${c.maxHp} | **Abilities:**\n` + c.abilities.map((a, i) => `${i+1}. ${a.name} *(Energy: ${a.cost})*`).join('\n'),
                    inline: true
                }))
            )
            .setFooter({ text: 'Selection expires in 30 seconds.' });

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('ab_select_char')
            .setPlaceholder('Choose your champion...')
            .addOptions(
                PLAYABLE_CHARACTERS.map((c, i) => ({
                    label: c.name,
                    value: i.toString(),
                    description: `Play as ${c.name} from ${c.series}`,
                    emoji: c.emoji
                }))
            );

        const selectRow = new ActionRowBuilder().addComponents(selectMenu);

        let initialMsg;
        const msgOptions = { embeds: [selectEmbed], components: [selectRow], fetchReply: true };
        if (isSlash) {
            initialMsg = await context.reply(msgOptions);
        } else {
            initialMsg = await context.reply(msgOptions);
        }

        let selectedCharIdx;
        try {
            const menuInteraction = await initialMsg.awaitMessageComponent({
                filter: i => i.user.id === userId && i.customId === 'ab_select_char',
                componentType: ComponentType.StringSelect,
                time: 30000
            });

            await menuInteraction.deferUpdate();
            selectedCharIdx = parseInt(menuInteraction.values[0]);
        } catch (e) {
            const timeoutEmbed = new EmbedBuilder()
                .setColor(0x747f8d)
                .setTitle('⏰ SELECTION TIMED OUT')
                .setDescription('You took too long to pick a fighter. Battle cancelled.');
            return await initialMsg.edit({ embeds: [timeoutEmbed], components: [] });
        }

        // Refetch baubleData
        baubleData = await Bauble.findOne({ userId });
        if (bet > 0 && (!baubleData || baubleData.baubles < bet)) {
            const errEmbed = new EmbedBuilder()
                .setColor(0xff0000)
                .setTitle('❌ TRANSACTION FAILED')
                .setDescription(`You no longer have enough Baubles to complete this bet.`);
            return await initialMsg.edit({ embeds: [errEmbed], components: [] });
        }

        // Deduct bet immediately
        if (bet > 0) {
            baubleData.baubles -= bet;
            await baubleData.save();
        }

        // 3. Initialize Battle State
        const chosenChar = PLAYABLE_CHARACTERS[selectedCharIdx];
        const chosenBoss = BOSSES[Math.floor(Math.random() * BOSSES.length)];

        let player = {
            name: chosenChar.name,
            maxHp: chosenChar.maxHp,
            hp: chosenChar.maxHp,
            energy: 0,
            maxEnergy: 100,
            avatar: chosenChar.avatar,
            abilities: chosenChar.abilities,
            // Buff states
            ssjBuff: false,
            kuramaBuff: false,
            kuramaBuffTurns: 0,
            reflect: false,
            sageBuff: false,
            shield: false,
            shieldTurns: 0,
            shieldRate: 0,
            dodge: false,
            dodgeCounter: 0,
            stunned: false,
            burned: false,
            burnTurns: 0,
            burnDmg: 0,
            extraTurn: false
        };

        let boss = {
            name: chosenBoss.name,
            maxHp: chosenBoss.maxHp,
            hp: chosenBoss.maxHp,
            energy: 0,
            maxEnergy: 100,
            avatar: chosenBoss.avatar,
            abilities: chosenBoss.abilities,
            // Buff states
            goldBuff: false,
            shield: false,
            shieldTurns: 0,
            shieldRate: 0,
            dodge: false,
            dodgeCounter: 0,
            stunned: false,
            burned: false,
            burnTurns: 0,
            burnDmg: 0
        };

        let turn = 'player';
        let turnCount = 1;
        let lastActionLog = `⚔️ The arena vibrates! **${player.name}** faces off against the legendary **${boss.name}**!\nYour bet of **${bet.toLocaleString()} Baubles** has been locked.`;
        let lastActionGif = player.avatar;
        let lastActionAnime = chosenChar.series;

        // Visual battle game UI generator
        function buildBattleEmbed(footerText = `Anime: ${lastActionAnime} | Turn ${turnCount}`) {
            const pStatus = [];
            if (player.shield) pStatus.push('🛡️ Shielded');
            if (player.dodge) pStatus.push('💨 Evading');
            if (player.ssjBuff) pStatus.push('⚡ Super Saiyan');
            if (player.kuramaBuff) pStatus.push(`🦊 Sage (${player.kuramaBuffTurns}t)`);
            if (player.sageBuff) pStatus.push('🧠 Analyzed');
            if (player.stunned) pStatus.push('💫 Stunned');
            if (player.burned) pStatus.push(`🔥 Burned (${player.burnTurns}t)`);

            const bStatus = [];
            if (boss.shield) bStatus.push('🛡️ Shielded');
            if (boss.dodge) bStatus.push('💨 Evading');
            if (boss.goldBuff) bStatus.push('✨ Golden Form');
            if (boss.stunned) bStatus.push('💫 Stunned');
            if (boss.burned) bStatus.push(`🔥 Burned (${boss.burnTurns}t)`);

            const pStatusStr = pStatus.length > 0 ? `\n*(${pStatus.join(', ')})*` : '';
            const bStatusStr = bStatus.length > 0 ? `\n*(${bStatus.join(', ')})*` : '';

            return new EmbedBuilder()
                .setColor(0x992d22) // Crimson battle theme
                .setTitle(`⚔️ ANIME SHOWDOWN — Turn ${turnCount}`)
                .setDescription(`> ${lastActionLog}\n\n${turn === 'player' ? `🟢 **It is your turn!** Select an ability.` : `🔴 **${boss.name}** is preparing their attack...`}`)
                .addFields(
                    {
                        name: `${chosenChar.emoji} ${player.name} (You)`,
                        value: `❤️ **HP:** ${buildProgressBar(player.hp, player.maxHp, '🟩', '⬛', 12, ' HP')}${pStatusStr}\n⚡ **Energy:** ${buildProgressBar(player.energy, 100, '🟦', '⬛', 12, '')}`,
                        inline: false
                    },
                    {
                        name: `${chosenBoss.emoji} ${boss.name} (Boss)`,
                        value: `❤️ **HP:** ${buildProgressBar(boss.hp, boss.maxHp, '🟥', '⬛', 12, ' HP')}${bStatusStr}\n⚡ **Energy:** ${buildProgressBar(boss.energy, 100, '🟧', '⬛', 12, '')}`,
                        inline: false
                    }
                )
                .setImage(lastActionGif)
                .setFooter({ text: footerText, iconURL: user.displayAvatarURL({ dynamic: true }) })
                .setTimestamp();
        }

        // Buttons generator
        function buildBattleButtons(disabled = false) {
            const row = new ActionRowBuilder();
            player.abilities.forEach((a, idx) => {
                const button = new ButtonBuilder()
                    .setCustomId(`ab_move_${idx}`)
                    .setLabel(`${a.name} (${a.cost})`)
                    .setStyle(a.style || ButtonStyle.Primary)
                    .setDisabled(disabled || player.energy < a.cost);
                row.addComponents(button);
            });

            // Add Forfeit button
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId('ab_forfeit')
                    .setLabel('Forfeit')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🏳️')
                    .setDisabled(disabled)
            );

            return row;
        }

        let isGameOver = false;
        let gameWinner = null;
        let gameForfeit = false;

        // 4. Main Battle Loop
        while (!isGameOver) {
            // Apply Burn damage at the start of the turn
            if (turn === 'player' && player.burned) {
                player.hp = Math.max(0, player.hp - player.burnDmg);
                lastActionLog = `🔥 **${player.name}** takes **${player.burnDmg}** burn damage at the start of their turn!`;
                player.burnTurns--;
                if (player.burnTurns <= 0) player.burned = false;

                if (player.hp <= 0) {
                    isGameOver = true;
                    gameWinner = 'boss';
                    break;
                }
            } else if (turn === 'boss' && boss.burned) {
                boss.hp = Math.max(0, boss.hp - boss.burnDmg);
                lastActionLog = `🔥 **${boss.name}** takes **${boss.burnDmg}** burn damage at the start of their turn!`;
                boss.burnTurns--;
                if (boss.burnTurns <= 0) boss.burned = false;

                if (boss.hp <= 0) {
                    isGameOver = true;
                    gameWinner = 'player';
                    break;
                }
            }

            // Check for Stun status
            if (turn === 'player' && player.stunned) {
                player.stunned = false;
                player.energy = Math.min(100, player.energy + 20); // Still gain energy
                lastActionLog = `💫 **${player.name}** is stunned/confused and skips their turn!`;
                lastActionGif = 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExd2ptMXR6aGl6YTVicGRrcG13b2phd3plcnEydnE5eXUwcTFscWFqbyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7bu3XilJ5BOiSGic/giphy.gif';
                lastActionAnime = 'Jujutsu Kaisen';

                await initialMsg.edit({ embeds: [buildBattleEmbed('Stunned!')], components: [] });
                await new Promise(resolve => setTimeout(resolve, 2500));
                
                // Tick down shields
                if (player.shield) {
                    player.shieldTurns--;
                    if (player.shieldTurns <= 0) player.shield = false;
                }
                if (player.kuramaBuff) {
                    player.kuramaBuffTurns--;
                    if (player.kuramaBuffTurns <= 0) player.kuramaBuff = false;
                }

                turn = 'boss';
                turnCount++;
                continue;
            } else if (turn === 'boss' && boss.stunned) {
                boss.stunned = false;
                boss.energy = Math.min(100, boss.energy + 20);
                lastActionLog = `💫 **${boss.name}** is stunned/confused and skips their turn!`;
                lastActionGif = 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExd2ptMXR6aGl6YTVicGRrcG13b2phd3plcnEydnE5eXUwcTFscWFqbyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7bu3XilJ5BOiSGic/giphy.gif';
                lastActionAnime = 'Jujutsu Kaisen';

                await initialMsg.edit({ embeds: [buildBattleEmbed('Stunned!')], components: [] });
                await new Promise(resolve => setTimeout(resolve, 2500));

                if (boss.shield) {
                    boss.shieldTurns--;
                    if (boss.shieldTurns <= 0) boss.shield = false;
                }

                turn = 'player';
                turnCount++;
                continue;
            }

            // ─── Player Turn ─────────────────────────────────────────────────
            if (turn === 'player') {
                player.energy = Math.min(100, player.energy + 20);

                await initialMsg.edit({ 
                    embeds: [buildBattleEmbed()], 
                    components: [buildBattleButtons(false)] 
                });

                let chosenMoveIdx = null;
                try {
                    const btnInteraction = await initialMsg.awaitMessageComponent({
                        filter: i => i.user.id === userId && i.customId.startsWith('ab_'),
                        componentType: ComponentType.Button,
                        time: 60000
                    });

                    await btnInteraction.deferUpdate();

                    if (btnInteraction.customId === 'ab_forfeit') {
                        isGameOver = true;
                        gameForfeit = true;
                        break;
                    }

                    chosenMoveIdx = parseInt(btnInteraction.customId.replace('ab_move_', ''));
                } catch (e) {
                    isGameOver = true;
                    gameForfeit = true;
                    break;
                }

                const ability = player.abilities[chosenMoveIdx];
                player.energy -= ability.cost;

                // Handle Boss Evade / Dodge
                if (boss.dodge && ability.cost > 0) {
                    boss.dodge = false;
                    let evadeText = `💨 **${boss.name}** completely evaded **${player.name}**'s **${ability.name}**!`;
                    if (boss.dodgeCounter > 0) {
                        player.hp = Math.max(0, player.hp - boss.dodgeCounter);
                        evadeText += ` and counter-attacked for **${boss.dodgeCounter}** damage!`;
                    }
                    lastActionLog = evadeText;
                    
                    // Fetch dodge gif
                    const gifs = await fetchGiphyGifs(`${boss.name.toLowerCase()} dodge`);
                    lastActionGif = gifs.length > 0 ? gifs[0] : boss.avatar;
                    lastActionAnime = boss.name === 'Sukuna' ? 'Jujutsu Kaisen' : boss.name === 'Madara Uchiha' ? 'Naruto' : boss.name === 'Kaido' ? 'One Piece' : 'Dragon Ball';
                } else {
                    lastActionLog = ability.execute(player, boss);
                    
                    // Fetch dynamic GIF from Giphy matching the exact move query
                    const gifs = await fetchGiphyGifs(ability.query);
                    lastActionGif = gifs.length > 0 
                        ? gifs[Math.floor(Math.random() * Math.min(8, gifs.length))] 
                        : player.avatar;
                    lastActionAnime = chosenChar.series;
                }

                await initialMsg.edit({
                    embeds: [buildBattleEmbed(`Cast: ${ability.name}`)],
                    components: [buildBattleButtons(true)]
                });

                await new Promise(resolve => setTimeout(resolve, 2500));

                if (boss.hp <= 0) {
                    isGameOver = true;
                    gameWinner = 'player';
                    break;
                }

                // Tick down shields & buffs
                if (player.shield) {
                    player.shieldTurns--;
                    if (player.shieldTurns <= 0) {
                        player.shield = false;
                        player.reflect = false;
                    }
                }
                if (player.kuramaBuff) {
                    player.kuramaBuffTurns--;
                    if (player.kuramaBuffTurns <= 0) player.kuramaBuff = false;
                }

                if (player.extraTurn) {
                    player.extraTurn = false;
                    lastActionLog = `⚡ **${player.name}** speed blitzes and gains an extra turn immediately!`;
                } else {
                    turn = 'boss';
                }

                turnCount++;
            } 
            // ─── Boss Turn ───────────────────────────────────────────────────
            else {
                boss.energy = Math.min(100, boss.energy + 20);

                await initialMsg.edit({
                    embeds: [buildBattleEmbed(`Boss ${boss.name} is planning...`)],
                    components: [buildBattleButtons(true)]
                });

                await new Promise(resolve => setTimeout(resolve, 1500));

                let bossAbility;
                if (boss.energy >= 60 && Math.random() < 0.7) {
                    bossAbility = boss.abilities[3];
                } else if (boss.energy >= 35 && Math.random() < 0.5) {
                    bossAbility = boss.abilities[2];
                } else if (boss.energy >= 25 && Math.random() < 0.6) {
                    bossAbility = boss.abilities[1];
                } else {
                    bossAbility = boss.abilities[0];
                }

                boss.energy -= bossAbility.cost;

                // Handle Player Evade / Dodge
                if (player.dodge) {
                    player.dodge = false;
                    let evadeText = `💨 **${player.name}** completely evaded **${boss.name}**'s **${bossAbility.name}**!`;
                    if (player.dodgeCounter > 0) {
                        boss.hp = Math.max(0, boss.hp - player.dodgeCounter);
                        evadeText += ` and counter-attacked for **${player.dodgeCounter}** damage!`;
                    }
                    lastActionLog = evadeText;

                    const gifs = await fetchGiphyGifs(`${player.name.toLowerCase()} dodge`);
                    lastActionGif = gifs.length > 0 ? gifs[0] : player.avatar;
                    lastActionAnime = chosenChar.series;
                } else {
                    let logText = bossAbility.execute(boss, player);
                    
                    if (player.reflect && bossAbility.cost > 0) {
                        let reflectedDmg = Math.floor(randRange(14, 18) * 0.3);
                        boss.hp = Math.max(0, boss.hp - reflectedDmg);
                        logText += `\n⚡ **${player.name}** reflected **${reflectedDmg}** damage back at **${boss.name}**!`;
                    }
                    lastActionLog = logText;

                    const gifs = await fetchGiphyGifs(bossAbility.query);
                    lastActionGif = gifs.length > 0 
                        ? gifs[Math.floor(Math.random() * Math.min(8, gifs.length))] 
                        : boss.avatar;
                    lastActionAnime = boss.name === 'Sukuna' ? 'Jujutsu Kaisen' : boss.name === 'Madara Uchiha' ? 'Naruto' : boss.name === 'Kaido' ? 'One Piece' : 'Dragon Ball';
                }

                await initialMsg.edit({
                    embeds: [buildBattleEmbed(`Cast: ${bossAbility.name}`)],
                    components: [buildBattleButtons(true)]
                });

                await new Promise(resolve => setTimeout(resolve, 2500));

                if (player.hp <= 0) {
                    isGameOver = true;
                    gameWinner = 'boss';
                    break;
                }

                if (boss.shield) {
                    boss.shieldTurns--;
                    if (boss.shieldTurns <= 0) boss.shield = false;
                }

                turn = 'player';
                turnCount++;
            }
        }

        // 5. Final Battle Results Processing
        baubleData = await Bauble.findOne({ userId });
        const previousStreak = baubleData.animebattleStreak || 0;

        let finalEmbed = new EmbedBuilder().setTimestamp();
        let payoutInfo = '';

        if (gameForfeit) {
            baubleData.animebattleStreak = 0;
            await baubleData.save();

            finalEmbed.setColor(0xe74c3c)
                .setTitle('🏳️ BATTLE FORFEITED')
                .setDescription(`You abandoned the fight! **${boss.name}** claims victory by default.\n\n❌ **Lost:** **${bet.toLocaleString()} Baubles**\n🔥 **Streak:** Reset to 0 (Best: \`${baubleData.animebattleMaxStreak || 0}\`)`);
        } 
        else if (gameWinner === 'player') {
            const globalMultiplier = await getGlobalMultiplier();
            const winnings = Math.floor(bet * 2 * globalMultiplier);

            baubleData.animebattleStreak = (baubleData.animebattleStreak || 0) + 1;
            if (baubleData.animebattleStreak > (baubleData.animebattleMaxStreak || 0)) {
                baubleData.animebattleMaxStreak = baubleData.animebattleStreak;
            }

            if (bet > 0) {
                baubleData.baubles += winnings;
                payoutInfo = `\n\n💰 **Wager Winnings:** \`+${winnings.toLocaleString()} Baubles\`\n👛 **New Balance:** \`${baubleData.baubles.toLocaleString()} Baubles\``;
            } else {
                payoutInfo = `\n\n🎮 *Played for fun without wagering baubles.*`;
            }

            await baubleData.save();

            finalEmbed.setColor(0x2ecc71)
                .setTitle('🏆 VICTORY FOR THE HERO!')
                .setDescription(`👑 **${player.name}** defeated **${boss.name}** in a legendary showdown!\n\n` +
                    `💖 **Your HP:** \`${player.hp}/${player.maxHp}\` | 💀 **Boss HP:** \`0/${boss.maxHp}\`` +
                    `${payoutInfo}\n🔥 **Win Streak:** \`${baubleData.animebattleStreak}\` (Best: \`${baubleData.animebattleMaxStreak}\`)`)
                .setThumbnail(player.avatar);
        } 
        else {
            baubleData.animebattleStreak = 0;
            await baubleData.save();

            if (bet > 0) {
                payoutInfo = `\n\n💸 **Lost:** \`-${bet.toLocaleString()} Baubles\`\n👛 **New Balance:** \`${baubleData.baubles.toLocaleString()} Baubles\``;
            } else {
                payoutInfo = `\n\n🎮 *Played for fun without wagering baubles.*`;
            }

            finalEmbed.setColor(0xe74c3c)
                .setTitle('💀 YOU WERE DEFEATED')
                .setDescription(`💀 **${boss.name}** has crushed **${player.name}** in the arena!\n\n` +
                    `💖 **Your HP:** \`0/${player.maxHp}\` | 💀 **Boss HP:** \`${boss.hp}/${boss.maxHp}\`` +
                    `${payoutInfo}\n🔥 **Win Streak:** Reset to 0 (Best: \`${baubleData.animebattleMaxStreak || 0}\`)`)
                .setThumbnail(boss.avatar);
        }

        // Add Play Again Button
        const playAgainRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('ab_play_again')
                .setLabel('Play Again')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🔄')
        );

        await initialMsg.edit({ embeds: [finalEmbed], components: [playAgainRow] });

        // Setup Collector for Play Again
        const playAgainCollector = initialMsg.createMessageComponentCollector({
            filter: i => i.user.id === userId && i.customId === 'ab_play_again',
            componentType: ComponentType.Button,
            time: 20000
        });

        playAgainCollector.on('collect', async (i) => {
            playAgainCollector.stop();
            await i.deferUpdate();

            const disabledRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('ab_play_again_disabled')
                    .setLabel('Play Again')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔄')
                    .setDisabled(true)
            );
            await initialMsg.edit({ components: [disabledRow] }).catch(() => {});

            await runAnimeBattle({
                context: i,
                userId,
                user,
                bet,
                isSlash: true
            });
        });

        playAgainCollector.on('end', async (collected, reason) => {
            if (reason === 'time') {
                const disabledRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('ab_play_again_disabled')
                        .setLabel('Play Again')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🔄')
                        .setDisabled(true)
                );
                await initialMsg.edit({ components: [disabledRow] }).catch(() => {});
            }
        });

    } catch (error) {
        console.error('Error during animebattle minigame:', error);
        const errMsg = '❌ An unexpected error occurred during the battle showdown.';
        if (isSlash) {
            await context.followUp({ content: errMsg, ephemeral: true }).catch(() => {});
        } else {
            await context.reply(errMsg).catch(() => {});
        }
    }
}
