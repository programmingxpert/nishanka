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

// Dynamic Giphy search scraper to parse direct Fastly CDN hotlink URLs (i.giphy.com)
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
        
        // Match Giphy direct CDN media URLs and capture the unique ID group
        const regex = /https:\/\/media\d+\.giphy\.com\/media\/[a-zA-Z0-9_.\-\/]+\/([a-zA-Z0-9]+)\/giphy\.gif/g;
        const gifs = [];
        let match;
        while ((match = regex.exec(html)) !== null) {
            const id = match[1];
            gifs.push(`https://i.giphy.com/media/${id}/giphy.gif`);
        }
        
        return [...new Set(gifs)];
    } catch (e) {
        console.error("Giphy scraper error:", e);
        return [];
    }
}

// Hand-picked curated GIFs for ultimate accuracy and randomization
const CURATED_GIFS = {
    'goku-kamehameha': [
        'https://media.giphy.com/media/EbRIxoUny8GJKkRZ8S/giphy.gif',
        'https://media.giphy.com/media/jIgyPWFtAiwr3YLhgS/giphy.gif',
        'https://media.giphy.com/media/dmFXUZ5up1T896HP8B/giphy.gif'
    ],
    'goku-super-saiyan-power-up': [
        'https://media.giphy.com/media/MO2owFzRR1UVt6v5qT/giphy.gif',
        'https://media.giphy.com/media/wFwE4eFeJPjPA0qk48/giphy.gif',
        'https://media.giphy.com/media/H3FWsVbJipyXDxb01k/giphy.gif'
    ],
    'goku-instant-transmission': [
        'https://media.giphy.com/media/UG3ZEtxdjevg1JZqNw/giphy.gif',
        'https://media.giphy.com/media/B6SyssSlTgPXq/giphy.gif',
        'https://media.giphy.com/media/BWZslVd1zXsHK/giphy.gif'
    ],
    'goku-spirit-bomb': [
        'https://media.giphy.com/media/4Cpgf1zzMMy4w/giphy.gif',
        'https://media.giphy.com/media/4GL9tIgSeKBxiJmQPN/giphy.gif',
        'https://media.giphy.com/media/pudlTW65M2qDGzYdvd/giphy.gif'
    ],
    'gojo-reversal-red': [
        'https://media.giphy.com/media/CkzASXWphfkQ5CF6ny/giphy.gif',
        'https://media.giphy.com/media/u4G75tJV0RtqJWjrpg/giphy.gif',
        'https://media.giphy.com/media/HARTNiFs9XM7DqfUtc/giphy.gif'
    ],
    'gojo-infinity': [
        'https://media.giphy.com/media/HARTNiFs9XM7DqfUtc/giphy.gif',
        'https://media.giphy.com/media/9Xx1OMQIiA9feabm70/giphy.gif',
        'https://media.giphy.com/media/ykskFiNdEJI3xUOUso/giphy.gif'
    ],
    'gojo-lapse-blue': [
        'https://media.giphy.com/media/CkzASXWphfkQ5CF6ny/giphy.gif',
        'https://media.giphy.com/media/u4G75tJV0RtqJWjrpg/giphy.gif',
        'https://media.giphy.com/media/HARTNiFs9XM7DqfUtc/giphy.gif'
    ],
    'gojo-satoru-unlimited-void': [
        'https://media.giphy.com/media/jOSVfsfl6cMhrWyoWG/giphy.gif',
        'https://media.giphy.com/media/iTDA3afE82s87NWVee/giphy.gif',
        'https://media.giphy.com/media/mhfqfSii6aBk3AUWY3/giphy.gif'
    ],
    'saitama-normal-punch': [
        'https://media.giphy.com/media/9D3hrntdTv1BAweMbW/giphy.gif',
        'https://media.giphy.com/media/U9G6mhCvaw4qVRBCUv/giphy.gif',
        'https://media.giphy.com/media/hWdCiKGt2eWGEDAmHo/giphy.gif'
    ],
    'saitama-serious-side-steps': [
        'https://media.giphy.com/media/8L1Ks4Tbwp1uGpWcpu/giphy.gif',
        'https://media.giphy.com/media/6VAaFtY6x1dXRZOp3A/giphy.gif',
        'https://media.giphy.com/media/5QS0lUL4z61x32rEkc/giphy.gif'
    ],
    'saitama-consecutive-normal-punches': [
        'https://media.giphy.com/media/25GIZ43xeTpQkSf3Il/giphy.gif',
        'https://media.giphy.com/media/6VAaFtY6x1dXRZOp3A/giphy.gif',
        'https://media.giphy.com/media/wMR4dFOtB91sq2Ll8T/giphy.gif'
    ],
    'saitama-serious-punch': [
        'https://media.giphy.com/media/E3xWsHoZueBUl2Btyd/giphy.gif',
        'https://media.giphy.com/media/U9G6mhCvaw4qVRBCUv/giphy.gif',
        'https://media.giphy.com/media/6VAaFtY6x1dXRZOp3A/giphy.gif'
    ],
    'naruto-rasengan': [
        'https://media.giphy.com/media/OU6tgBi0YJ4HK/giphy.gif',
        'https://media.giphy.com/media/YD8BdrZl0aXpS/giphy.gif',
        'https://media.giphy.com/media/A8UFISckEbokw/giphy.gif'
    ],
    'naruto-shadow-clone-jutsu': [
        'https://media.giphy.com/media/4zur2JOAWcatZyK2ub/giphy.gif',
        'https://media.giphy.com/media/xyuBl6Mxs2jbiWJicT/giphy.gif',
        'https://media.giphy.com/media/ZTyc58rdwZ6C7RTFtX/giphy.gif'
    ],
    'naruto-kurama-link-mode': [
        'https://media.giphy.com/media/JCHM2csigByOLgpwYf/giphy.gif',
        'https://media.giphy.com/media/qMnhxcHyeBJDFlxnZa/giphy.gif',
        'https://media.giphy.com/media/QeqTT6YyA9duYWqZKD/giphy.gif'
    ],
    'naruto-rasenshuriken': [
        'https://media.giphy.com/media/tWev5cS9QHeKnWRUcU/giphy.gif',
        'https://media.giphy.com/media/7JqCZCuwEYdry/giphy.gif',
        'https://media.giphy.com/media/K4rDu65eHSsNO/giphy.gif'
    ],
    'luffy-gum-gum-pistol': [
        'https://media.giphy.com/media/7caW5waFywBAQ/giphy.gif',
        'https://media.giphy.com/media/noOo1kWba5NNKe8rVH/giphy.gif',
        'https://media.giphy.com/media/EIUE5ay7Lt8cN4juFp/giphy.gif'
    ],
    'luffy-gear-second': [
        'https://media.giphy.com/media/DwZ392mpIdkvrvTnjm/giphy.gif',
        'https://media.giphy.com/media/S98RiiVlRUC03R5cX3/giphy.gif',
        'https://media.giphy.com/media/YDMZ4OfrWuExzZE1up/giphy.gif'
    ],
    'luffy-armament-haki': [
        'https://media.giphy.com/media/hgsPEyU4B3wZ8nffCi/giphy.gif',
        'https://media.giphy.com/media/dmqnEU3LCyOkM/giphy.gif',
        'https://media.giphy.com/media/drbq2TQK8UkG4OLLAj/giphy.gif'
    ],
    'luffy-gear-5-bajrang-gun': [
        'https://media.giphy.com/media/j0DWZloeosVkAOKuFI/giphy.gif',
        'https://media.giphy.com/media/TUOSneOOtImPurKwph/giphy.gif',
        'https://media.giphy.com/media/lTWrURRi8Di59m4x8f/giphy.gif'
    ],
    'goku-dodge': [
        'https://media.giphy.com/media/JGCjVD4LzIY981qoZW/giphy.gif',
        'https://media.giphy.com/media/kvn0FeqyOXgohYNBNa/giphy.gif',
        'https://media.giphy.com/media/9wSeWPdg5T3Uv9d624/giphy.gif'
    ],
    'gojo-dodge': [
        'https://media.giphy.com/media/HARTNiFs9XM7DqfUtc/giphy.gif',
        'https://media.giphy.com/media/9Xx1OMQIiA9feabm70/giphy.gif',
        'https://media.giphy.com/media/ykskFiNdEJI3xUOUso/giphy.gif'
    ],
    'saitama-dodge': [
        'https://media.giphy.com/media/JGCjVD4LzIY981qoZW/giphy.gif',
        'https://media.giphy.com/media/qdxmKHDrVIFWZyqmNW/giphy.gif',
        'https://media.giphy.com/media/AufdOhpzZRuHLutc2Y/giphy.gif'
    ],
    'naruto-dodge': [
        'https://media.giphy.com/media/Nzz86dByLtYTS/giphy.gif',
        'https://media.giphy.com/media/7DtA5riKTwHljx4Fdr/giphy.gif',
        'https://media.giphy.com/media/JoLIe41YKd3Xj4sX8s/giphy.gif'
    ],
    'luffy-dodge': [
        'https://media.giphy.com/media/1K8NlomCFNuKcGlHxT/giphy.gif',
        'https://media.giphy.com/media/0sxbHUgX22Tv6Shubn/giphy.gif',
        'https://media.giphy.com/media/drbq2TQK8UkG4OLLAj/giphy.gif'
    ],
    'rimuru-dodge': [
        'https://media.giphy.com/media/Op8FGber9HSfdIYWR6/giphy.gif',
        'https://media.giphy.com/media/riAnEhoDPDs9gwZ6bm/giphy.gif',
        'https://media.giphy.com/media/FeAxKYM3TUjaCr3y0T/giphy.gif'
    ]
};

async function getGifsForMove(query) {
    const normalizedKey = query.toLowerCase().trim().replace(/\s+/g, '-');
    if (CURATED_GIFS[normalizedKey] && CURATED_GIFS[normalizedKey].length > 0) {
        return CURATED_GIFS[normalizedKey];
    }
    return await fetchGiphyGifs(query);
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
        avatar: 'https://cdn.myanimelist.net/images/characters/14/401183.jpg',
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
                           `⚡ **Goku** powered up into **Super Saiyan**! Heals **15 HP**, gains **+30 Energy**, and boosts next attack's damage by **40%**!`;
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
        avatar: 'https://cdn.myanimelist.net/images/characters/15/422168.jpg',
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
        avatar: 'https://cdn.myanimelist.net/images/characters/11/294388.jpg',
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
        avatar: 'https://cdn.myanimelist.net/images/characters/2/284121.jpg',
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
        avatar: 'https://cdn.myanimelist.net/images/characters/9/310307.jpg',
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
        avatar: 'https://cdn.myanimelist.net/images/characters/4/495795.jpg',
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

// ─── Boss Opponents (PvE) ───────────────────────────────────────────────────
const BOSSES = [
    {
        name: 'Sukuna',
        emoji: '💀',
        maxHp: 120,
        avatar: 'https://cdn.myanimelist.net/images/characters/6/431152.jpg',
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
        avatar: 'https://cdn.myanimelist.net/images/characters/12/450359.jpg',
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
        avatar: 'https://cdn.myanimelist.net/images/characters/13/631359.jpg',
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
        avatar: 'https://cdn.myanimelist.net/images/characters/16/561778.jpg',
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
    category: 'minigames',
    cooldown: 10,
    aliases: ['ab', 'animefight', 'fight'],
    data: new SlashCommandBuilder()
        .setName('animebattle')
        .setDescription('An epic interactive turn-based anime fighting minigame wagered with baubles!')
        .addIntegerOption(option =>
            option.setName('bet')
                .setDescription('The amount of Glimmering Baubles to bet (minimum 200).')
                .setRequired(true)
                .setMinValue(200)
        )
        .addUserOption(option =>
            option.setName('opponent')
                .setDescription('Challenge a friend to a 1v1 fight (leave blank to fight a CPU Boss).')
                .setRequired(false)
        ),

    async execute(interaction) {
        const bet = interaction.options.getInteger('bet');
        const opponent = interaction.options.getUser('opponent');
        await runAnimeBattle({
            context: interaction,
            userId: interaction.user.id,
            user: interaction.user,
            bet,
            opponent,
            isSlash: true
        });
    },

    async executePrefix(message, args) {
        // Find mentioned opponent
        const opponent = message.mentions.users.first() || null;
        
        // Remove mention from args to find the bet number
        const argsWithoutMentions = args.filter(arg => !arg.match(/^<@!?\d+>$/));
        let betArg = argsWithoutMentions[0] || '0';
        const bet = parseInt(betArg);

        if (isNaN(bet) || bet < 200) {
            return message.reply('❌ The minimum bet to play is **200** Baubles. Free play is not allowed! (Example: `-ab 500` or `-ab @friend 500`)');
        }

        await runAnimeBattle({
            context: message,
            userId: message.author.id,
            user: message.author,
            bet,
            opponent,
            isSlash: false
        });
    }
};

async function runAnimeBattle({ context, userId, user, bet, opponent, isSlash }) {
    try {
        if (bet < 200) {
            const minBetMsg = `❌ The minimum bet to play is **200** Baubles. Free play is not allowed!`;
            return isSlash 
                ? context.reply({ content: minBetMsg, ephemeral: true })
                : context.reply(minBetMsg);
        }

        let baubleData = await Bauble.findOne({ userId });
        if (!baubleData) {
            baubleData = new Bauble({ userId, baubles: 0 });
            await baubleData.save();
        }

        if (baubleData.baubles < bet) {
            const errorMsg = `❌ You only have **${baubleData.baubles}** Baubles. You cannot bet **${bet}** Baubles.`;
            return isSlash 
                ? context.reply({ content: errorMsg, ephemeral: true })
                : context.reply(errorMsg);
        }

        // 2. Distinguish PvE and PvP
        const isPvP = opponent !== null;

        let opponentData = null;
        if (isPvP) {
            if (opponent.id === userId) {
                const selfMsg = `❌ You cannot challenge yourself to a battle! 😹`;
                return isSlash 
                    ? context.reply({ content: selfMsg, ephemeral: true })
                    : context.reply(selfMsg);
            }
            if (opponent.bot) {
                const botMsg = `❌ You cannot challenge bots! Leave the opponent blank to battle a CPU Boss.`;
                return isSlash 
                    ? context.reply({ content: botMsg, ephemeral: true })
                    : context.reply(botMsg);
            }

            opponentData = await Bauble.findOne({ userId: opponent.id });
            if (!opponentData) {
                opponentData = new Bauble({ userId: opponent.id, baubles: 0 });
                await opponentData.save();
            }

            if (opponentData.baubles < bet) {
                const oppBetMsg = `❌ **${opponent.username}** does not have enough Baubles (**${opponentData.baubles}**) to match your bet of **${bet}**!`;
                return isSlash 
                    ? context.reply({ content: oppBetMsg, ephemeral: true })
                    : context.reply(oppBetMsg);
            }
        }

        // 3. Challenge Phase (For PvP)
        let battleMsg;
        if (isPvP) {
            const challengeEmbed = new EmbedBuilder()
                .setColor(0x2b2d42)
                .setTitle('⚔️ Anime Showdown — Lobby')
                .setDescription(
                    `**Host:** ${user.username}\n` +
                    `**Opponent:** ${opponent.username}\n\n` +
                    `💰 **Wager:** **${bet.toLocaleString()}** Baubles\n\n` +
                    `*Waiting for opponent to accept...*`
                )
                .setFooter({ text: 'Showdown expires in 45 seconds.' });

            const challengeRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('ab_accept')
                    .setLabel('Accept')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('⚔️'),
                new ButtonBuilder()
                    .setCustomId('ab_decline')
                    .setLabel('Decline')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🏳️')
            );

            const msgOptions = { content: `${opponent}`, embeds: [challengeEmbed], components: [challengeRow], withResponse: true };
            battleMsg = await context.reply(msgOptions);

            try {
                const challengeInteraction = await battleMsg.awaitMessageComponent({
                    filter: i => i.user.id === opponent.id && ['ab_accept', 'ab_decline'].includes(i.customId),
                    componentType: ComponentType.Button,
                    time: 45000
                });

                await challengeInteraction.deferUpdate();

                if (challengeInteraction.customId === 'ab_decline') {
                    const decEmbed = new EmbedBuilder()
                        .setColor(0x2b2d42)
                        .setTitle('❌ Anime Showdown — Cancelled')
                        .setDescription(`Declined by ${opponent.username}.`);
                    await battleMsg.edit({ content: '', embeds: [decEmbed], components: [] });
                    return;
                }
            } catch (e) {
                const expEmbed = new EmbedBuilder()
                    .setColor(0x2b2d42)
                    .setTitle('❌ Anime Showdown — Cancelled')
                    .setDescription('Showdown expired.');
                await battleMsg.edit({ content: '', embeds: [expEmbed], components: [] });
                return;
            }
        }

        // 4. Character Selection Phase
        // Step A: Player 1 Selection
        const p1Embed = new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle(`🎮 PLAYER 1 SELECTION: ${user.username}`)
            .setDescription('Select the character you want to lead into battle!')
            .addFields(
                PLAYABLE_CHARACTERS.map(c => ({
                    name: `${c.emoji} ${c.name}`,
                    value: `**HP:** ${c.maxHp} | **Abilities:**\n` + c.abilities.map((a, i) => `${i+1}. ${a.name}`).join('\n'),
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
                    emoji: c.emoji
                }))
            );

        const selectRow = new ActionRowBuilder().addComponents(selectMenu);

        if (isPvP) {
            await battleMsg.edit({ content: '', embeds: [p1Embed], components: [selectRow] });
        } else {
            const msgOptions = { embeds: [p1Embed], components: [selectRow], withResponse: true };
            battleMsg = await context.reply(msgOptions);
        }

        let p1CharIdx;
        try {
            const menuInteraction = await battleMsg.awaitMessageComponent({
                filter: i => i.user.id === userId && i.customId === 'ab_select_char',
                componentType: ComponentType.StringSelect,
                time: 30000
            });
            await menuInteraction.deferUpdate();
            p1CharIdx = parseInt(menuInteraction.values[0]);
        } catch (e) {
            const timeoutEmbed = new EmbedBuilder()
                .setColor(0x747f8d)
                .setTitle('⏰ SELECTION TIMED OUT')
                .setDescription(`**${user.username}** took too long to pick a champion.`);
            return await battleMsg.edit({ embeds: [timeoutEmbed], components: [] });
        }

        // Step B: Player 2 Selection (if PvP)
        let p2CharIdx;
        if (isPvP) {
            const p2Embed = new EmbedBuilder()
                .setColor(0x3498db)
                .setTitle(`🎮 PLAYER 2 SELECTION: ${opponent.username}`)
                .setDescription('Select the character you want to lead into battle!')
                .addFields(
                    PLAYABLE_CHARACTERS.map(c => ({
                        name: `${c.emoji} ${c.name}`,
                        value: `**HP:** ${c.maxHp} | **Abilities:**\n` + c.abilities.map((a, i) => `${i+1}. ${a.name}`).join('\n'),
                        inline: true
                    }))
                )
                .setFooter({ text: 'Selection expires in 30 seconds.' });

            await battleMsg.edit({ embeds: [p2Embed], components: [selectRow] });

            try {
                const menuInteraction2 = await battleMsg.awaitMessageComponent({
                    filter: i => i.user.id === opponent.id && i.customId === 'ab_select_char',
                    componentType: ComponentType.StringSelect,
                    time: 30000
                });
                await menuInteraction2.deferUpdate();
                p2CharIdx = parseInt(menuInteraction2.values[0]);
            } catch (e) {
                const timeoutEmbed = new EmbedBuilder()
                    .setColor(0x747f8d)
                    .setTitle('⏰ SELECTION TIMED OUT')
                    .setDescription(`**${opponent.username}** took too long to pick a champion.`);
                
                // Return Player 1 bet since game was cancelled
                if (bet > 0) {
                    baubleData = await Bauble.findOne({ userId });
                    baubleData.baubles += bet;
                    await baubleData.save();
                }
                return await battleMsg.edit({ embeds: [timeoutEmbed], components: [] });
            }
        }

        // Refetch balances and deduct stakes
        baubleData = await Bauble.findOne({ userId });
        if (isPvP) {
            opponentData = await Bauble.findOne({ userId: opponent.id });
        }

        if (bet > 0) {
            if (baubleData.baubles < bet || (isPvP && opponentData.baubles < bet)) {
                const errEmbed = new EmbedBuilder()
                    .setColor(0xff0000)
                    .setTitle('❌ TRANSACTION FAILED')
                    .setDescription(`One of the players no longer has enough Baubles to match the bet.`);
                return await battleMsg.edit({ embeds: [errEmbed], components: [] });
            }

            baubleData.baubles -= bet;
            await baubleData.save();

            if (isPvP) {
                opponentData.baubles -= bet;
                await opponentData.save();
            }
        }

        // 5. Initialize Battle State
        const chosenChar = PLAYABLE_CHARACTERS[p1CharIdx];
        
        let p1State = {
            id: userId,
            name: user.username,
            maxHp: chosenChar.maxHp,
            hp: chosenChar.maxHp,
            energy: 0,
            maxEnergy: 100,
            avatar: chosenChar.avatar,
            abilities: chosenChar.abilities,
            emoji: chosenChar.emoji,
            series: chosenChar.series,
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

        let p2State;
        if (isPvP) {
            const chosenChar2 = PLAYABLE_CHARACTERS[p2CharIdx];
            p2State = {
                id: opponent.id,
                name: opponent.username,
                maxHp: chosenChar2.maxHp,
                hp: chosenChar2.maxHp,
                energy: 0,
                maxEnergy: 100,
                avatar: chosenChar2.avatar,
                abilities: chosenChar2.abilities,
                emoji: chosenChar2.emoji,
                series: chosenChar2.series,
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
        } else {
            const chosenBoss = BOSSES[Math.floor(Math.random() * BOSSES.length)];
            p2State = {
                id: 'bot',
                name: chosenBoss.name,
                maxHp: chosenBoss.maxHp,
                hp: chosenBoss.maxHp,
                energy: 0,
                maxEnergy: 100,
                avatar: chosenBoss.avatar,
                abilities: chosenBoss.abilities,
                emoji: chosenBoss.emoji,
                series: 'Boss Opponent',
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
        }

        let turnPlayer = p1State;
        let idlePlayer = p2State;
        let turnCount = 1;
        
        let lastActionLog = isPvP 
            ? `⚔️ The PvP Arena is set! **${p1State.name}** vs **${p2State.name}**!\nTotal stakes: **${(bet * 2).toLocaleString()} Baubles**`
            : `⚔️ The arena vibrates! **${p1State.name}** faces off against the legendary **${p2State.name}**!\nYour bet of **${bet.toLocaleString()} Baubles** has been locked.`;
        
        let lastActionGif = p1State.avatar;
        let lastActionAnime = p1State.series;
        let battleLog = [lastActionLog];

        // Visual battle UI generator
        function buildBattleEmbed(footerText = `Anime: ${lastActionAnime} | Turn ${turnCount}`) {
            const p1Status = [];
            if (p1State.shield) p1Status.push('🛡️ Shielded');
            if (p1State.dodge) p1Status.push('💨 Evading');
            if (p1State.ssjBuff) p1Status.push('⚡ Super Saiyan');
            if (p1State.kuramaBuff) p1Status.push(`🦊 Sage (${p1State.kuramaBuffTurns}t)`);
            if (p1State.sageBuff) p1Status.push('🧠 Analyzed');
            if (p1State.stunned) p1Status.push('💫 Stunned');
            if (p1State.burned) p1Status.push(`🔥 Burned (${p1State.burnTurns}t)`);

            const p2Status = [];
            if (p2State.shield) p2Status.push('🛡️ Shielded');
            if (p2State.dodge) p2Status.push('💨 Evading');
            if (p2State.ssjBuff) p2Status.push('⚡ Super Saiyan'); // or goldBuff for Frieza
            if (p2State.kuramaBuff) p2Status.push(`🦊 Sage (${p2State.kuramaBuffTurns}t)`);
            if (p2State.sageBuff) p2Status.push('🧠 Analyzed');
            if (p2State.goldBuff) p2Status.push('✨ Golden Form');
            if (p2State.stunned) p2Status.push('💫 Stunned');
            if (p2State.burned) p2Status.push(`🔥 Burned (${p2State.burnTurns}t)`);

            const p1StatusStr = p1Status.length > 0 ? `\n*(${p1Status.join(', ')})*` : '';
            const p2StatusStr = p2Status.length > 0 ? `\n*(${p2Status.join(', ')})*` : '';

            const logStr = battleLog.map(line => `• ${line}`).join('\n');

            return new EmbedBuilder()
                .setColor(0x992d22) // Crimson battle theme
                .setTitle(`⚔️ ANIME SHOWDOWN — Turn ${turnCount}`)
                .setDescription(`📜 **Recent Actions:**\n${logStr}\n\n🗣️ It is **${turnPlayer.name}**'s turn! Select an ability.`)
                .addFields(
                    {
                        name: `${p1State.emoji} ${p1State.name} (${isPvP ? 'P1' : 'You'})`,
                        value: `❤️ **HP:** ${buildProgressBar(p1State.hp, p1State.maxHp, '🟩', '⬛', 12, ' HP')}${p1StatusStr}\n⚡ **Energy:** ${buildProgressBar(p1State.energy, 100, '🟦', '⬛', 12, '')}`,
                        inline: false
                    },
                    {
                        name: `${p2State.emoji} ${p2State.name} (${isPvP ? 'P2' : 'Boss'})`,
                        value: `❤️ **HP:** ${buildProgressBar(p2State.hp, p2State.maxHp, isPvP ? '🟩' : '🟥', '⬛', 12, ' HP')}${p2StatusStr}\n⚡ **Energy:** ${buildProgressBar(p2State.energy, 100, isPvP ? '🟦' : '🟧', '⬛', 12, '')}`,
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
            turnPlayer.abilities.forEach((a, idx) => {
                const button = new ButtonBuilder()
                    .setCustomId(`ab_move_${idx}`)
                    .setLabel(`${a.name} (${a.cost})`)
                    .setStyle(a.style || ButtonStyle.Primary)
                    .setDisabled(disabled || turnPlayer.energy < a.cost);
                row.addComponents(button);
            });

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
        let gameWinner = null; // 'p1State' or 'p2State'
        let gameForfeit = false;
        let forfeitUser = null;

        // 6. Main Battle Loop
        while (!isGameOver) {
            // Apply Burn damage
            if (turnPlayer.burned) {
                turnPlayer.hp = Math.max(0, turnPlayer.hp - turnPlayer.burnDmg);
                lastActionLog = `🔥 **${turnPlayer.name}** takes **${turnPlayer.burnDmg}** burn damage at the start of their turn!`;
                battleLog.push(lastActionLog);
                if (battleLog.length > 4) battleLog.shift();
                turnPlayer.burnTurns--;
                if (turnPlayer.burnTurns <= 0) turnPlayer.burned = false;

                if (turnPlayer.hp <= 0) {
                    isGameOver = true;
                    gameWinner = (turnPlayer.id === p1State.id) ? p2State : p1State;
                    break;
                }
            }

            // Check for Stun status
            if (turnPlayer.stunned) {
                turnPlayer.stunned = false;
                turnPlayer.energy = Math.min(100, turnPlayer.energy + 20); // Still gain energy
                lastActionLog = `💫 **${turnPlayer.name}** is stunned/confused and skips their turn!`;
                battleLog.push(lastActionLog);
                if (battleLog.length > 4) battleLog.shift();
                lastActionGif = 'https://i.giphy.com/media/3o7bu3XilJ5BOiSGic/giphy.gif';
                lastActionAnime = 'Jujutsu Kaisen';

                await battleMsg.edit({ embeds: [buildBattleEmbed('Stunned!')], components: [] });
                await new Promise(resolve => setTimeout(resolve, 2500));
                
                // Tick down shields & buffs
                if (turnPlayer.shield) {
                    turnPlayer.shieldTurns--;
                    if (turnPlayer.shieldTurns <= 0) {
                        turnPlayer.shield = false;
                        turnPlayer.reflect = false;
                    }
                }
                if (turnPlayer.kuramaBuff) {
                    turnPlayer.kuramaBuffTurns--;
                    if (turnPlayer.kuramaBuffTurns <= 0) turnPlayer.kuramaBuff = false;
                }

                // Swap turns
                let temp = turnPlayer;
                turnPlayer = idlePlayer;
                idlePlayer = temp;
                turnCount++;
                continue;
            }

            // ─── Human Player Turn (P1 always, or P2 if PvP) ─────────────────
            if (turnPlayer.id !== 'bot') {
                turnPlayer.energy = Math.min(100, turnPlayer.energy + 20);

                await battleMsg.edit({ 
                    embeds: [buildBattleEmbed()], 
                    components: [buildBattleButtons(false)] 
                });

                let chosenMoveIdx = null;
                try {
                    const btnInteraction = await battleMsg.awaitMessageComponent({
                        filter: i => {
                            if (i.user.id !== turnPlayer.id) {
                                i.reply({ content: `❌ It is not your turn! Only **${turnPlayer.name}** can move.`, ephemeral: true });
                                return false;
                            }
                            return i.customId.startsWith('ab_');
                        },
                        componentType: ComponentType.Button,
                        time: 60000
                    });

                    await btnInteraction.deferUpdate();

                    if (btnInteraction.customId === 'ab_forfeit') {
                        isGameOver = true;
                        gameForfeit = true;
                        forfeitUser = turnPlayer;
                        break;
                    }

                    chosenMoveIdx = parseInt(btnInteraction.customId.replace('ab_move_', ''));
                } catch (e) {
                    isGameOver = true;
                    gameForfeit = true;
                    forfeitUser = turnPlayer;
                    break;
                }

                const ability = turnPlayer.abilities[chosenMoveIdx];
                turnPlayer.energy -= ability.cost;

                // Handle defender evade/dodge
                if (idlePlayer.dodge && ability.cost > 0) {
                    idlePlayer.dodge = false;
                    let evadeText = `💨 **${idlePlayer.name}** completely evaded **${turnPlayer.name}**'s **${ability.name}**!`;
                    if (idlePlayer.dodgeCounter > 0) {
                        turnPlayer.hp = Math.max(0, turnPlayer.hp - idlePlayer.dodgeCounter);
                        evadeText += ` and counter-attacked for **${idlePlayer.dodgeCounter}** damage!`;
                    }
                    lastActionLog = evadeText;
                    battleLog.push(lastActionLog);
                    if (battleLog.length > 4) battleLog.shift();
                    
                    const gifs = await getGifsForMove(`${idlePlayer.name.toLowerCase()} dodge`);
                    lastActionGif = gifs.length > 0 ? gifs[0] : idlePlayer.avatar;
                    lastActionAnime = idlePlayer.series;
                } else {
                    lastActionLog = ability.execute(turnPlayer, idlePlayer);
                    battleLog.push(lastActionLog);
                    if (battleLog.length > 4) battleLog.shift();
                    
                    // Fetch dynamic GIF from Giphy matching the exact move query
                    const gifs = await getGifsForMove(ability.query);
                    lastActionGif = gifs.length > 0 
                        ? gifs[Math.floor(Math.random() * Math.min(8, gifs.length))] 
                        : turnPlayer.avatar;
                    lastActionAnime = turnPlayer.series;
                }

                await battleMsg.edit({
                    embeds: [buildBattleEmbed(`Cast: ${ability.name}`)],
                    components: [buildBattleButtons(true)]
                });

                await new Promise(resolve => setTimeout(resolve, 2500));

                if (idlePlayer.hp <= 0) {
                    isGameOver = true;
                    gameWinner = turnPlayer;
                    break;
                }

                // Tick down shields & buffs
                if (turnPlayer.shield) {
                    turnPlayer.shieldTurns--;
                    if (turnPlayer.shieldTurns <= 0) {
                        turnPlayer.shield = false;
                        turnPlayer.reflect = false;
                    }
                }
                if (turnPlayer.kuramaBuff) {
                    turnPlayer.kuramaBuffTurns--;
                    if (turnPlayer.kuramaBuffTurns <= 0) turnPlayer.kuramaBuff = false;
                }

                if (turnPlayer.extraTurn) {
                    turnPlayer.extraTurn = false;
                    lastActionLog = `⚡ **${turnPlayer.name}** speed blitzes and gains an extra turn immediately!`;
                    battleLog.push(lastActionLog);
                    if (battleLog.length > 4) battleLog.shift();
                } else {
                    // Swap roles
                    let temp = turnPlayer;
                    turnPlayer = idlePlayer;
                    idlePlayer = temp;
                }

                turnCount++;
            } 
            // ─── CPU Boss Turn (PvE only) ────────────────────────────────────
            else {
                turnPlayer.energy = Math.min(100, turnPlayer.energy + 20);

                await battleMsg.edit({
                    embeds: [buildBattleEmbed(`Boss ${turnPlayer.name} is planning...`)],
                    components: [buildBattleButtons(true)]
                });

                await new Promise(resolve => setTimeout(resolve, 1500));

                let bossAbility;
                if (turnPlayer.energy >= 60 && Math.random() < 0.7) {
                    bossAbility = turnPlayer.abilities[3];
                } else if (turnPlayer.energy >= 35 && Math.random() < 0.5) {
                    bossAbility = turnPlayer.abilities[2];
                } else if (turnPlayer.energy >= 25 && Math.random() < 0.6) {
                    bossAbility = turnPlayer.abilities[1];
                } else {
                    bossAbility = turnPlayer.abilities[0];
                }

                turnPlayer.energy -= bossAbility.cost;

                // Handle Player Evade / Dodge
                if (idlePlayer.dodge) {
                    idlePlayer.dodge = false;
                    let evadeText = `💨 **${idlePlayer.name}** completely evaded **${turnPlayer.name}**'s **${bossAbility.name}**!`;
                    if (idlePlayer.dodgeCounter > 0) {
                        turnPlayer.hp = Math.max(0, turnPlayer.hp - idlePlayer.dodgeCounter);
                        evadeText += ` and counter-attacked for **${idlePlayer.dodgeCounter}** damage!`;
                    }
                    lastActionLog = evadeText;
                    battleLog.push(lastActionLog);
                    if (battleLog.length > 4) battleLog.shift();

                    const gifs = await getGifsForMove(`${idlePlayer.name.toLowerCase()} dodge`);
                    lastActionGif = gifs.length > 0 ? gifs[0] : idlePlayer.avatar;
                    lastActionAnime = idlePlayer.series;
                } else {
                    let logText = bossAbility.execute(turnPlayer, idlePlayer);
                    
                    if (idlePlayer.reflect && bossAbility.cost > 0) {
                        let reflectedDmg = Math.floor(randRange(14, 18) * 0.3);
                        turnPlayer.hp = Math.max(0, turnPlayer.hp - reflectedDmg);
                        logText += `\n⚡ **${idlePlayer.name}** reflected **${reflectedDmg}** damage back at **${turnPlayer.name}**!`;
                    }
                    lastActionLog = logText;
                    battleLog.push(lastActionLog);
                    if (battleLog.length > 4) battleLog.shift();

                    const gifs = await getGifsForMove(bossAbility.query);
                    lastActionGif = gifs.length > 0 
                        ? gifs[Math.floor(Math.random() * Math.min(8, gifs.length))] 
                        : turnPlayer.avatar;
                    lastActionAnime = turnPlayer.name === 'Sukuna' ? 'Jujutsu Kaisen' : turnPlayer.name === 'Madara Uchiha' ? 'Naruto' : turnPlayer.name === 'Kaido' ? 'One Piece' : 'Dragon Ball';
                }

                await battleMsg.edit({
                    embeds: [buildBattleEmbed(`Cast: ${bossAbility.name}`)],
                    components: [buildBattleButtons(true)]
                });

                await new Promise(resolve => setTimeout(resolve, 2500));

                if (idlePlayer.hp <= 0) {
                    isGameOver = true;
                    gameWinner = turnPlayer;
                    break;
                }

                if (turnPlayer.shield) {
                    turnPlayer.shieldTurns--;
                    if (turnPlayer.shieldTurns <= 0) turnPlayer.shield = false;
                }

                // Swap roles
                let temp = turnPlayer;
                turnPlayer = idlePlayer;
                idlePlayer = temp;
                turnCount++;
            }
        }

        // 7. Final Battle Results Processing
        // Reload player database data
        baubleData = await Bauble.findOne({ userId });
        if (baubleData) {
            baubleData.dailyGameLastCompleted = new Date();
            baubleData.dailyGambleLastCompleted = new Date();
        }
        if (isPvP) {
            opponentData = await Bauble.findOne({ userId: opponent.id });
            if (opponentData) {
                opponentData.dailyGameLastCompleted = new Date();
                opponentData.dailyGambleLastCompleted = new Date();
            }
        }

        let finalEmbed = new EmbedBuilder().setTimestamp();
        let payoutInfo = '';

        if (gameForfeit) {
            const loserState = forfeitUser;
            const winnerState = (forfeitUser.id === p1State.id) ? p2State : p1State;

            // Reset loser streak
            if (loserState.id === userId) {
                baubleData.animebattleStreak = 0;
                await baubleData.save();
            } else if (isPvP && loserState.id === opponent.id) {
                opponentData.animebattleStreak = 0;
                await opponentData.save();
            }

            // Award winnings to winner
            if (winnerState.id === userId) {
                baubleData.animebattleStreak = (baubleData.animebattleStreak || 0) + 1;
                if (baubleData.animebattleStreak > (baubleData.animebattleMaxStreak || 0)) {
                    baubleData.animebattleMaxStreak = baubleData.animebattleStreak;
                }
                if (bet > 0) {
                    const winnings = isPvP ? (bet * 2) : Math.floor(bet * 2 * (await getGlobalMultiplier()));
                    baubleData.baubles += winnings;
                    payoutInfo = `\n\n👑 **Winner:** **${winnerState.name}**\n💰 **Winnings:** \`+${winnings.toLocaleString()} Baubles\`\n👛 **New Balance:** \`${baubleData.baubles.toLocaleString()} Baubles\``;
                }
                await baubleData.save();
            } else if (isPvP && winnerState.id === opponent.id) {
                opponentData.animebattleStreak = (opponentData.animebattleStreak || 0) + 1;
                if (opponentData.animebattleStreak > (opponentData.animebattleMaxStreak || 0)) {
                    opponentData.animebattleMaxStreak = opponentData.animebattleStreak;
                }
                if (bet > 0) {
                    const winnings = isPvP ? (bet * 2) : Math.floor(bet * 2 * (await getGlobalMultiplier()));
                    opponentData.baubles += winnings;
                    payoutInfo = `\n\n👑 **Winner:** **${winnerState.name}**\n💰 **Winnings:** \`+${winnings.toLocaleString()} Baubles\`\n👛 **New Balance:** \`${opponentData.baubles.toLocaleString()} Baubles\``;
                }
                await opponentData.save();
            }

            finalEmbed.setColor(0xe74c3c)
                .setTitle('🏳️ BATTLE FORFEITED')
                .setDescription(`**${loserState.name}** has forfeited the match!\n\n👑 **Winner:** **${winnerState.name}** by default.${payoutInfo}`);
        } 
        else {
            // Normal Win/Loss
            const winState = gameWinner;
            const loseState = (gameWinner.id === p1State.id) ? p2State : p1State;

            // Reset loser streak
            if (loseState.id === userId) {
                baubleData.animebattleStreak = 0;
                await baubleData.save();
            } else if (isPvP && loseState.id === opponent.id) {
                opponentData.animebattleStreak = 0;
                await opponentData.save();
            }

            // Award winner
            if (winState.id === userId) {
                baubleData.animebattleStreak = (baubleData.animebattleStreak || 0) + 1;
                if (baubleData.animebattleStreak > (baubleData.animebattleMaxStreak || 0)) {
                    baubleData.animebattleMaxStreak = baubleData.animebattleStreak;
                }
                if (bet > 0) {
                    const winnings = isPvP ? (bet * 2) : Math.floor(bet * 2 * (await getGlobalMultiplier()));
                    baubleData.baubles += winnings;
                    payoutInfo = `\n\n💰 **Winnings:** \`+${winnings.toLocaleString()} Baubles\`\n👛 **New Balance:** \`${baubleData.baubles.toLocaleString()} Baubles\`\n🔥 **Your Win Streak:** \`${baubleData.animebattleStreak}\` (Best: \`${baubleData.animebattleMaxStreak}\`)`;
                } else {
                    payoutInfo = `\n\n🎮 *Played for fun! Your Win Streak is now \`${baubleData.animebattleStreak}\`.*`;
                }
                await baubleData.save();
            } else if (isPvP && winState.id === opponent.id) {
                opponentData.animebattleStreak = (opponentData.animebattleStreak || 0) + 1;
                if (opponentData.animebattleStreak > (opponentData.animebattleMaxStreak || 0)) {
                    opponentData.animebattleMaxStreak = opponentData.animebattleStreak;
                }
                if (bet > 0) {
                    const winnings = isPvP ? (bet * 2) : Math.floor(bet * 2 * (await getGlobalMultiplier()));
                    opponentData.baubles += winnings;
                    payoutInfo = `\n\n💰 **Winnings:** \`+${winnings.toLocaleString()} Baubles\`\n👛 **New Balance:** \`${opponentData.baubles.toLocaleString()} Baubles\`\n🔥 **${opponent.username}'s Win Streak:** \`${opponentData.animebattleStreak}\` (Best: \`${opponentData.animebattleMaxStreak}\`)`;
                } else {
                    payoutInfo = `\n\n🎮 *Played for fun! ${opponent.username}'s Win Streak is now \`${opponentData.animebattleStreak}\`.*`;
                }
                await opponentData.save();
            }

            finalEmbed.setColor(0x2ecc71)
                .setTitle('🏆 SHOWDOWN COMPLETE')
                .setDescription(`👑 **${winState.name}** has defeated **${loseState.name}** in the arena!\n\n` +
                    `💖 **${p1State.name} HP:** \`${p1State.hp}/${p1State.maxHp}\` | 💀 **${p2State.name} HP:** \`${p2State.hp}/${p2State.maxHp}\`` +
                    `${payoutInfo}`)
                .setThumbnail(winState.avatar);
        }

        // Add Play Again Button
        const playAgainRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('ab_play_again')
                .setLabel('Play Again')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🔄')
        );

        await battleMsg.edit({ embeds: [finalEmbed], components: [playAgainRow] });

        // Setup Collector for Play Again
        const playAgainCollector = battleMsg.createMessageComponentCollector({
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
            await battleMsg.edit({ components: [disabledRow] }).catch(() => {});

            await runAnimeBattle({
                context: i,
                userId,
                user,
                bet,
                opponent,
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
                await battleMsg.edit({ components: [disabledRow] }).catch(() => {});
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
