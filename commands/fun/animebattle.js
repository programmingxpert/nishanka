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

// Helper to build visual progress bar (HP / Energy)
function buildProgressBar(current, max, colorEmoji, emptyEmoji = '⬛', length = 10) {
    const filledCount = Math.min(length, Math.max(0, Math.round((current / max) * length)));
    const emptyCount = length - filledCount;
    return `${colorEmoji.repeat(filledCount)}${emptyEmoji.repeat(emptyCount)} (${current}/${max})`;
}

// Fallback anime gifs if API fails or for generic actions
const FALLBACKS = {
    punch: { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3hxdmxuNTVpajU4NnJrZDN2ZDV2NzgxNWF0M2I0MGsxdDFmdXN4dyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/yo3TC0yeHd53G/giphy.gif', anime: 'One Punch Man' },
    kick: { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExaG96c3R4NWJjZXFxbmdwYWx1ZHJrOGI5bHN3bzFpa3AxeTFjOXlyayZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/cOz2ZfC9e9c70QO6yU/giphy.gif', anime: 'Dragon Ball Z' },
    shoot: { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExaTJwNno3dDVqcmEyd2c4bmpsZHJ0NXk0dG96cHhrMW8xcmM5N2RjdyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/U3UP4fTE6Qfu8/giphy.gif', anime: 'Dragon Ball Z' },
    yeet: { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNnkxdW9jOHdqdzlqM3B5aTlhNXJ0YTFkYjY1Mjlvd2x5MWF4dHlhZiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/xT39CVCn6zwkGeFdVm/giphy.gif', anime: 'Jujutsu Kaisen' },
    slap: { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMTI1ZmlvbnU5OXoxbXB5ejVsdmJhZWtyaGx6OHJ3bXJhYWY5cW9wayZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/k1uX5J0YLrj0c/giphy.gif', anime: 'Naruto' },
    run: { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNWV6Zm0xNmptYW05Zmp3Nnk2YndmNzhnd3FmeHhhc2s1OXQ4amgyMCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/JRlqKEIncTAVJ9hoET/giphy.gif', anime: 'Naruto' },
    angry: { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbm4yc3BhZjI2dWRwODh4amJhdGZ3cm8xMXA4djV5MTRxMzAwdTFkayZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Ul16jlGQHOCFW/giphy.gif', anime: 'Dragon Ball Z' },
    smile: { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExaG9wOXc1dnpnb2g2dmhpNXh0eDBpcTV6NGVmd3lpeHhxd3QzdGptdCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/8gP14r9kP0lM3h2u57/giphy.gif', anime: 'One Piece' },
    stare: { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMnptZnk4MGEzOWc1MndudW9uMWh5ZWpxMTBhODhyMHNldHRrZjRvaCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/12WnC0A4YSfS5W/giphy.gif', anime: 'Jujutsu Kaisen' },
    bite: { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExa3V0ZXNscDVtMTdseGNuMWthYzhoY3A2ZHk4MGt2bnRwNm1xbjM1ayZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Z7B97kDSGUsp2/giphy.gif', anime: 'Slime' }
};

// Fetch real anime action GIF from nekos.best
async function fetchAnimeGif(action) {
    try {
        const res = await fetch(`https://nekos.best/api/v2/${action}`);
        if (res.ok) {
            const data = await res.json();
            if (data.results && data.results.length > 0) {
                return {
                    url: data.results[0].url,
                    anime: data.results[0].anime_name
                };
            }
        }
    } catch (err) {
        console.error(`Failed to fetch anime gif for ${action}:`, err);
    }
    return FALLBACKS[action] || { url: 'https://i.imgur.com/3N0sYwD.gif', anime: 'Unknown Anime' };
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
                action: 'shoot', 
                style: ButtonStyle.Primary,
                desc: '💥 Fires a powerful energy wave dealing 18-28 damage.', 
                execute: (p, o) => {
                    let dmg = randRange(18, 28);
                    if (p.ssjBuff) { dmg = Math.floor(dmg * 1.4); p.ssjBuff = false; }
                    if (o.shield) { dmg = Math.floor(dmg * (1 - o.shieldRate)); }
                    o.hp = Math.max(0, o.hp - dmg);
                    return `💥 **Goku** fired a massive **Kamehameha** at **${o.name}** dealing **${dmg}** damage!`;
                }
            },
            { 
                name: 'Super Saiyan', 
                cost: 0, 
                action: 'angry', 
                style: ButtonStyle.Success,
                desc: '⚡ Powers up! Gains +30 Energy, heals 15 HP, and boosts next attack by 40%.', 
                execute: (p, o) => {
                    p.ssjBuff = true;
                    p.energy = Math.min(100, p.energy + 30);
                    p.hp = Math.min(p.maxHp, p.hp + 15);
                    return `⚡ **Goku** powered up into **Super Saiyan**! Heals 15 HP, gains +30 Energy, and boosts next attack's damage by 40%!`;
                }
            },
            { 
                name: 'Instant Transmission', 
                cost: 15, 
                action: 'run', 
                style: ButtonStyle.Primary,
                desc: '🌀 Evades the next attack and counters for 10 damage.', 
                execute: (p, o) => {
                    p.dodge = true;
                    p.dodgeCounter = 10;
                    return `🌀 **Goku** vanishes using **Instant Transmission**, preparing to evade the next attack and counter-attack!`;
                }
            },
            { 
                name: 'Spirit Bomb', 
                cost: 60, 
                action: 'yeet', 
                style: ButtonStyle.Danger,
                desc: '🌟 Gathers planetary energy to hurl a colossal Spirit Bomb dealing 40-60 damage.', 
                execute: (p, o) => {
                    let dmg = randRange(40, 60);
                    if (p.ssjBuff) { dmg = Math.floor(dmg * 1.4); p.ssjBuff = false; }
                    if (o.shield) { dmg = Math.floor(dmg * (1 - o.shieldRate)); }
                    o.hp = Math.max(0, o.hp - dmg);
                    return `🌟 **Goku** gathered the energy of the universe and hurled a colossal **Spirit Bomb** at **${o.name}** for **${dmg}** massive damage!`;
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
                action: 'yeet', 
                style: ButtonStyle.Primary,
                desc: '🔴 Deals 16-24 repelling damage.', 
                execute: (p, o) => {
                    let dmg = randRange(16, 24);
                    if (o.shield) { dmg = Math.floor(dmg * (1 - o.shieldRate)); }
                    o.hp = Math.max(0, o.hp - dmg);
                    return `🔴 **Gojo** released Curse Technique Reversal **Red** dealing **${dmg}** damage to **${o.name}**!`;
                }
            },
            { 
                name: 'Infinity Shield', 
                cost: 10, 
                action: 'smile', 
                style: ButtonStyle.Success,
                desc: '🛡️ Deploys Infinity. Reduces incoming damage by 80% for 2 turns and heals 10 HP.', 
                execute: (p, o) => {
                    p.shield = true;
                    p.shieldTurns = 2;
                    p.shieldRate = 0.8;
                    p.hp = Math.min(p.maxHp, p.hp + 10);
                    return `🛡️ **Gojo** deployed his **Infinity** shield! Incoming damage reduced by 80% for 2 turns. Heals 10 HP.`;
                }
            },
            { 
                name: 'Curse Lapse Blue', 
                cost: 25, 
                action: 'slap', 
                style: ButtonStyle.Primary,
                desc: '🔵 Deals 10 damage and stuns the opponent for 1 turn.', 
                execute: (p, o) => {
                    let dmg = 10;
                    if (o.shield) { dmg = Math.floor(dmg * (1 - o.shieldRate)); }
                    o.hp = Math.max(0, o.hp - dmg);
                    o.stunned = true;
                    return `🔵 **Gojo** used Curse Technique Lapse **Blue** to pull **${o.name}** in, dealing **${dmg}** damage and **stunning** them for 1 turn!`;
                }
            },
            { 
                name: 'Unlimited Void', 
                cost: 70, 
                action: 'stare', 
                style: ButtonStyle.Danger,
                desc: '🌌 Expands domain. Deals 35-45 absolute damage (ignores shield) and stuns for 1 turn.', 
                execute: (p, o) => {
                    let dmg = randRange(35, 45); // ignores shields
                    o.hp = Math.max(0, o.hp - dmg);
                    o.stunned = true;
                    return `🌌 **Gojo** expanded his domain: **Unlimited Void**! Brain-overloading **${o.name}**, dealing **${dmg}** absolute damage and **stunning** them for 1 turn!`;
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
                action: 'punch', 
                style: ButtonStyle.Primary,
                desc: '✊ Standard punch dealing 12-16 damage. Gains +20 Energy.', 
                execute: (p, o) => {
                    let dmg = randRange(12, 16);
                    if (o.shield) { dmg = Math.floor(dmg * (1 - o.shieldRate)); }
                    o.hp = Math.max(0, o.hp - dmg);
                    p.energy = Math.min(100, p.energy + 20);
                    return `✊ **Saitama** threw a **Normal Punch** at **${o.name}** dealing **${dmg}** damage and gaining +20 Energy!`;
                }
            },
            { 
                name: 'Serious Dodge', 
                cost: 10, 
                action: 'run', 
                style: ButtonStyle.Success,
                desc: '💨 Evades all attacks next turn, gains +30 Energy, and heals 10 HP.', 
                execute: (p, o) => {
                    p.dodge = true;
                    p.dodgeCounter = 0;
                    p.energy = Math.min(100, p.energy + 30);
                    p.hp = Math.min(p.maxHp, p.hp + 10);
                    return `💨 **Saitama** executed a **Serious Dodge** side-step! Evading all attacks next turn, gaining +30 Energy, and healing 10 HP.`;
                }
            },
            { 
                name: 'Consecutive Punches', 
                cost: 20, 
                action: 'punch', 
                style: ButtonStyle.Primary,
                desc: '👊 Rapid punches dealing 16-30 damage.', 
                execute: (p, o) => {
                    let hits = randRange(4, 6);
                    let total = 0;
                    for (let k = 0; k < hits; k++) total += randRange(4, 5);
                    if (o.shield) { total = Math.floor(total * (1 - o.shieldRate)); }
                    o.hp = Math.max(0, o.hp - total);
                    return `👊 **Saitama** threw **Consecutive Normal Punches** at **${o.name}** landing **${hits}** hits for **${total}** total damage!`;
                }
            },
            { 
                name: 'Serious Punch', 
                cost: 80, 
                action: 'yeet', 
                style: ButtonStyle.Danger,
                desc: '💥 Serious Series: Serious Punch! Deals 60-80 apocalyptic damage.', 
                execute: (p, o) => {
                    let dmg = randRange(60, 80);
                    if (o.shield) { dmg = Math.floor(dmg * (1 - o.shieldRate)); }
                    o.hp = Math.max(0, o.hp - dmg);
                    return `💥 **Saitama** unleashed a **Serious Punch**! The shockwave blasts **${o.name}** for **${dmg}** colossal damage, parting the clouds!`;
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
                action: 'punch', 
                style: ButtonStyle.Primary,
                desc: '🌀 Swirling sphere of chakra dealing 16-26 damage.', 
                execute: (p, o) => {
                    let dmg = randRange(16, 26);
                    if (p.kuramaBuff) { dmg = Math.floor(dmg * 1.3); }
                    if (o.shield) { dmg = Math.floor(dmg * (1 - o.shieldRate)); }
                    o.hp = Math.max(0, o.hp - dmg);
                    return `🌀 **Naruto** charges forward with a **Rasengan**, smashing **${o.name}** for **${dmg}** damage!`;
                }
            },
            { 
                name: 'Shadow Clone Jutsu', 
                cost: 15, 
                action: 'dance', 
                style: ButtonStyle.Primary,
                desc: '👥 Summons clones. Evades the next attack completely and counters for 10 damage.', 
                execute: (p, o) => {
                    p.dodge = true;
                    p.dodgeCounter = 10;
                    return `👥 **Naruto** creates a squad of **Shadow Clones**! They prepare to shield the real Naruto and counter-attack.`;
                }
            },
            { 
                name: 'Kurama Sage Mode', 
                cost: 0, 
                action: 'angry', 
                style: ButtonStyle.Success,
                desc: '🦊 Heals 20 HP, gains +40 Energy, and boosts all damage by 30% for 3 turns.', 
                execute: (p, o) => {
                    p.kuramaBuff = true;
                    p.kuramaBuffTurns = 3;
                    p.energy = Math.min(100, p.energy + 40);
                    p.hp = Math.min(p.maxHp, p.hp + 20);
                    return `🦊 **Naruto** enters **Kurama Sage Mode**! Heals 20 HP, gains +40 Energy, and gains a 30% damage boost for 3 turns!`;
                }
            },
            { 
                name: 'Rasenshuriken', 
                cost: 60, 
                action: 'yeet', 
                style: ButtonStyle.Danger,
                desc: '🌪️ Throws a wind-shuriken of dense Tailed Beast chakra dealing 38-50 damage.', 
                execute: (p, o) => {
                    let dmg = randRange(38, 50);
                    if (p.kuramaBuff) { dmg = Math.floor(dmg * 1.3); }
                    if (o.shield) { dmg = Math.floor(dmg * (1 - o.shieldRate)); }
                    o.hp = Math.max(0, o.hp - dmg);
                    return `🌪️ **Naruto** hurls a **Tailed Beast Rasenshuriken**! The exploding wind vortex shreds **${o.name}** for **${dmg}** massive damage!`;
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
                action: 'punch', 
                style: ButtonStyle.Primary,
                desc: '🥊 Stretches his arm for a quick punch dealing 14-18 damage. Gains +25 Energy.', 
                execute: (p, o) => {
                    let dmg = randRange(14, 18);
                    if (o.shield) { dmg = Math.floor(dmg * (1 - o.shieldRate)); }
                    o.hp = Math.max(0, o.hp - dmg);
                    p.energy = Math.min(100, p.energy + 25);
                    return `🥊 **Luffy** stretches his arm and lands a **Gum-Gum Pistol** on **${o.name}** for **${dmg}** damage, gaining +25 Energy!`;
                }
            },
            { 
                name: 'Gear 2nd Speed', 
                cost: 30, 
                action: 'run', 
                style: ButtonStyle.Primary,
                desc: '⚡ Deals 10 damage and grants an immediate extra turn!', 
                execute: (p, o) => {
                    let dmg = 10;
                    if (o.shield) { dmg = Math.floor(dmg * (1 - o.shieldRate)); }
                    o.hp = Math.max(0, o.hp - dmg);
                    p.extraTurn = true;
                    return `⚡ **Luffy** activates **Gear 2nd**! Strikes **${o.name}** for **${dmg}** damage and speeds up, gaining an immediate extra turn!`;
                }
            },
            { 
                name: 'Rubber Haki Defense', 
                cost: 10, 
                action: 'stare', 
                style: ButtonStyle.Success,
                desc: '🛡️ Reduces damage by 60% and reflects 30% of incoming damage next turn.', 
                execute: (p, o) => {
                    p.shield = true;
                    p.shieldTurns = 1;
                    p.shieldRate = 0.6;
                    p.reflect = true;
                    return `🛡️ **Luffy** hardens with Armament Haki! Reduces damage taken by 60% and reflects 30% of incoming damage!`;
                }
            },
            { 
                name: 'Bajrang Gun', 
                cost: 70, 
                action: 'yeet', 
                style: ButtonStyle.Danger,
                desc: '☀️ Sun God Nika! Deals 35-55 damage and stuns the target for 1 turn.', 
                execute: (p, o) => {
                    let dmg = randRange(35, 55);
                    o.hp = Math.max(0, o.hp - dmg);
                    o.stunned = true;
                    return `☀️ **Luffy** laughs joyfully in **Gear 5th** and crushes **${o.name}** with a giant **Bajrang Gun** for **${dmg}** damage, **stunning** them!`;
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
                action: 'shoot', 
                style: ButtonStyle.Primary,
                desc: '🌊 Sharp water blades dealing 15-22 damage.', 
                execute: (p, o) => {
                    let dmg = randRange(15, 22);
                    if (o.shield) { dmg = Math.floor(dmg * (1 - o.shieldRate)); }
                    o.hp = Math.max(0, o.hp - dmg);
                    return `🌊 **Rimuru** fires sharp, slicing **Water Blades** at **${o.name}** dealing **${dmg}** damage!`;
                }
            },
            { 
                name: 'Gluttony', 
                cost: 25, 
                action: 'bite', 
                style: ButtonStyle.Primary,
                desc: '😈 Devours enemy energy. Deals 15-20 damage and heals Rimuru for the same amount.', 
                execute: (p, o) => {
                    let dmg = randRange(15, 20);
                    if (o.shield) { dmg = Math.floor(dmg * (1 - o.shieldRate)); }
                    o.hp = Math.max(0, o.hp - dmg);
                    p.hp = Math.min(p.maxHp, p.hp + dmg);
                    return `😈 **Rimuru** activates **Gluttony**, devouring **${o.name}**'s lifeforce. Deals **${dmg}** damage and heals Rimuru for that amount!`;
                }
            },
            { 
                name: 'Great Sage Analysis', 
                cost: 0, 
                action: 'smile', 
                style: ButtonStyle.Success,
                desc: '🧠 Gains +35 Energy, heals 10 HP, and next attack deals +30% damage.', 
                execute: (p, o) => {
                    p.sageBuff = true;
                    p.energy = Math.min(100, p.energy + 35);
                    p.hp = Math.min(p.maxHp, p.hp + 10);
                    return `🧠 **Rimuru** consults **Great Sage**! Analyzes enemy weakness, gains +35 Energy, heals 10 HP, and boosts next attack by 30%!`;
                }
            },
            { 
                name: 'Megiddo', 
                cost: 65, 
                action: 'shoot', 
                style: ButtonStyle.Danger,
                desc: '☀️ Solar rays deal 35-45 damage and burn for 6 damage/turn for 2 turns.', 
                execute: (p, o) => {
                    let dmg = randRange(35, 45);
                    if (p.sageBuff) { dmg = Math.floor(dmg * 1.3); p.sageBuff = false; }
                    if (o.shield) { dmg = Math.floor(dmg * (1 - o.shieldRate)); }
                    o.hp = Math.max(0, o.hp - dmg);
                    o.burned = true;
                    o.burnTurns = 2;
                    o.burnDmg = 6;
                    return `☀️ **Rimuru** executes **Megiddo**! Countless solar rays pierce **${o.name}** dealing **${dmg}** damage and leaving them **burned**!`;
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
                action: 'slap', 
                execute: (p, o) => {
                    let dmg = randRange(14, 19);
                    if (o.shield) dmg = Math.floor(dmg * (1 - o.shieldRate));
                    o.hp = Math.max(0, o.hp - dmg);
                    return `⚔️ **Sukuna** casts **Dismantle** dealing **${dmg}** slashing damage to **${o.name}**!`;
                }
            },
            { 
                name: 'Cleave', 
                cost: 25, 
                action: 'slap', 
                execute: (p, o) => {
                    let dmg = randRange(20, 26);
                    if (o.shield) dmg = Math.floor(dmg * (1 - o.shieldRate));
                    o.hp = Math.max(0, o.hp - dmg);
                    return `⚔️ **Sukuna** casts **Cleave** on **${o.name}** dealing **${dmg}** high-slashing damage!`;
                }
            },
            { 
                name: 'Flame Arrow', 
                cost: 35, 
                action: 'shoot', 
                execute: (p, o) => {
                    let dmg = randRange(22, 30);
                    if (o.shield) dmg = Math.floor(dmg * (1 - o.shieldRate));
                    o.hp = Math.max(0, o.hp - dmg);
                    return `🔥 **Sukuna** chants and fires his **Flame Arrow (Fuga)** hitting **${o.name}** for **${dmg}** fire damage!`;
                }
            },
            { 
                name: 'Malevolent Shrine', 
                cost: 60, 
                action: 'yeet', 
                execute: (p, o) => {
                    let dmg = randRange(35, 45); // ignores shields
                    o.hp = Math.max(0, o.hp - dmg);
                    return `⛩️ **Sukuna** expands his domain: **Malevolent Shrine**! A storm of cuts shreds **${o.name}** for **${dmg}** absolute damage!`;
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
                action: 'slap', 
                execute: (p, o) => {
                    let dmg = randRange(15, 20);
                    if (o.shield) dmg = Math.floor(dmg * (1 - o.shieldRate));
                    o.hp = Math.max(0, o.hp - dmg);
                    return `⚔️ **Madara** swings his **Susanoo Blade** dealing **${dmg}** slash damage to **${o.name}**!`;
                }
            },
            { 
                name: 'Destroyer Flame', 
                cost: 25, 
                action: 'shoot', 
                execute: (p, o) => {
                    let dmg = randRange(20, 27);
                    if (o.shield) dmg = Math.floor(dmg * (1 - o.shieldRate));
                    o.hp = Math.max(0, o.hp - dmg);
                    return `🔥 **Madara** spews a sea of fire: **Majestic Destroyer Flame**, burning **${o.name}** for **${dmg}** fire damage!`;
                }
            },
            { 
                name: 'Deep Forest Emergence', 
                cost: 35, 
                action: 'stare', 
                execute: (p, o) => {
                    let dmg = 10;
                    if (o.shield) dmg = Math.floor(dmg * (1 - o.shieldRate));
                    o.hp = Math.max(0, o.hp - dmg);
                    o.stunned = true;
                    return `🪵 **Madara** uses **Deep Forest Emergence**, trapping **${o.name}** for **${dmg}** damage and **stunning** them for 1 turn!`;
                }
            },
            { 
                name: 'Shattered Heaven', 
                cost: 60, 
                action: 'yeet', 
                execute: (p, o) => {
                    let dmg = randRange(35, 48);
                    if (o.shield) dmg = Math.floor(dmg * (1 - o.shieldRate));
                    o.hp = Math.max(0, o.hp - dmg);
                    return `☄️ **Madara** summons a colossal meteor: **Shattered Heaven**! The sky falls upon **${o.name}** dealing **${dmg}** devastating damage!`;
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
                action: 'punch', 
                execute: (p, o) => {
                    let dmg = randRange(14, 18);
                    if (o.shield) dmg = Math.floor(dmg * (1 - o.shieldRate));
                    o.hp = Math.max(0, o.hp - dmg);
                    return `🥊 **Kaido** swings his spiked iron club dealing **${dmg}** blunt damage to **${o.name}**!`;
                }
            },
            { 
                name: 'Bolo Breath', 
                cost: 25, 
                action: 'shoot', 
                execute: (p, o) => {
                    let dmg = randRange(18, 25);
                    if (o.shield) dmg = Math.floor(dmg * (1 - o.shieldRate));
                    o.hp = Math.max(0, o.hp - dmg);
                    return `🔥 **Kaido** releases **Bolo Breath** from his dragon mouth, scorching **${o.name}** for **${dmg}** fire damage!`;
                }
            },
            { 
                name: 'Dragon Scale Fortify', 
                cost: 35, 
                action: 'angry', 
                execute: (p, o) => {
                    p.shield = true;
                    p.shieldTurns = 2;
                    p.shieldRate = 0.5;
                    p.hp = Math.min(p.maxHp, p.hp + 12);
                    return `🐲 **Kaido** hardens his dragon scales! Heals 12 HP and reduces incoming damage by 50% for 2 turns.`;
                }
            },
            { 
                name: 'Thunder Bagua', 
                cost: 60, 
                action: 'yeet', 
                execute: (p, o) => {
                    let dmg = randRange(36, 46);
                    if (o.shield) dmg = Math.floor(dmg * (1 - o.shieldRate));
                    o.hp = Math.max(0, o.hp - dmg);
                    return `⚡ **Kaido** blitzes forward at god speed, unleashing **Thunder Bagua** and smashing **${o.name}** for **${dmg}** lightning damage!`;
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
                action: 'shoot', 
                execute: (p, o) => {
                    let dmg = randRange(15, 20);
                    if (o.shield) dmg = Math.floor(dmg * (1 - o.shieldRate));
                    o.hp = Math.max(0, o.hp - dmg);
                    return `👉 **Frieza** fires a piercing **Death Beam** dealing **${dmg}** damage to **${o.name}**!`;
                }
            },
            { 
                name: 'Death Psycho Bomb', 
                cost: 25, 
                action: 'yeet', 
                execute: (p, o) => {
                    let dmg = randRange(20, 26);
                    if (o.shield) dmg = Math.floor(dmg * (1 - o.shieldRate));
                    o.hp = Math.max(0, o.hp - dmg);
                    return `🌀 **Frieza** lifts **${o.name}** telekinetically and detonates them with a **Death Psycho Bomb** for **${dmg}** damage!`;
                }
            },
            { 
                name: 'Golden Evolution', 
                cost: 35, 
                action: 'angry', 
                execute: (p, o) => {
                    p.hp = Math.min(p.maxHp, p.hp + 15);
                    p.goldBuff = true;
                    return `✨ **Frieza** transforms into **Golden Frieza**! Heals 15 HP and his next attack deals 40% more damage!`;
                }
            },
            { 
                name: 'Supernova', 
                cost: 60, 
                action: 'yeet', 
                execute: (p, o) => {
                    let dmg = randRange(38, 48);
                    if (p.goldBuff) { dmg = Math.floor(dmg * 1.4); p.goldBuff = false; }
                    if (o.shield) dmg = Math.floor(dmg * (1 - o.shieldRate));
                    o.hp = Math.max(0, o.hp - dmg);
                    return `☄️ **Frieza** drops a planet-destroying **Supernova** on **${o.name}** for **${dmg}** absolute damage!`;
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

        // Refetch/reload baubleData to prevent race conditions after the selection pause
        baubleData = await Bauble.findOne({ userId });
        if (bet > 0 && (!baubleData || baubleData.baubles < bet)) {
            const errEmbed = new EmbedBuilder()
                .setColor(0xff0000)
                .setTitle('❌ TRANSACTION FAILED')
                .setDescription(`You no longer have enough Baubles to complete this bet.`);
            return await initialMsg.edit({ embeds: [errEmbed], components: [] });
        }

        // Deduct bet immediately to secure stakes
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
                        value: `**HP:** ${buildProgressBar(player.hp, player.maxHp, '🟩')}${pStatusStr}\n**Energy:** ${buildProgressBar(player.energy, 100, '🟦', '⬛')}`,
                        inline: false
                    },
                    {
                        name: `${chosenBoss.emoji} ${boss.name} (Boss)`,
                        value: `**HP:** ${buildProgressBar(boss.hp, boss.maxHp, '🟥')}${bStatusStr}\n**Energy:** ${buildProgressBar(boss.energy, 100, '🟧', '⬛')}`,
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
                lastActionAnime = 'Unknown Anime';

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
                lastActionAnime = 'Unknown Anime';

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
                // Gain 20 Energy at the start of Player turn
                player.energy = Math.min(100, player.energy + 20);

                // Edit Message with interactive UI
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
                    lastActionGif = FALLBACKS.run.url;
                    lastActionAnime = 'Dragon Ball';
                } else {
                    // Normal execution
                    lastActionLog = ability.execute(player, boss);
                    
                    // Fetch real-time visual GIF matching the ability action tag
                    const gifData = await fetchAnimeGif(ability.action);
                    lastActionGif = gifData.url;
                    lastActionAnime = gifData.anime;
                }

                // Show player's action result
                await initialMsg.edit({
                    embeds: [buildBattleEmbed(`Cast: ${ability.name}`)],
                    components: [buildBattleButtons(true)]
                });

                await new Promise(resolve => setTimeout(resolve, 2500));

                // Check win/loss
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

                // If player has extraTurn buff (Luffy Gear 2nd)
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

                // Show Boss thinking
                await initialMsg.edit({
                    embeds: [buildBattleEmbed(`Boss ${boss.name} is planning...`)],
                    components: [buildBattleButtons(true)]
                });

                await new Promise(resolve => setTimeout(resolve, 1500));

                // Boss AI decision making:
                let bossAbility;
                if (boss.energy >= 60 && Math.random() < 0.7) {
                    bossAbility = boss.abilities[3]; // Ultimate
                } else if (boss.energy >= 35 && Math.random() < 0.5) {
                    bossAbility = boss.abilities[2]; // Utility
                } else if (boss.energy >= 25 && Math.random() < 0.6) {
                    bossAbility = boss.abilities[1]; // Medium
                } else {
                    bossAbility = boss.abilities[0]; // Basic
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
                    lastActionGif = chosenChar.avatar;
                    lastActionAnime = chosenChar.series;
                } else {
                    // Normal execution
                    let isReflected = false;
                    let logText = bossAbility.execute(boss, player);
                    
                    // Reflect calculation
                    if (player.reflect && bossAbility.cost > 0) {
                        let reflectedDmg = Math.floor(randRange(14, 18) * 0.3);
                        boss.hp = Math.max(0, boss.hp - reflectedDmg);
                        logText += `\n⚡ **${player.name}** reflected **${reflectedDmg}** damage back at **${boss.name}**!`;
                    }
                    lastActionLog = logText;

                    const gifData = await fetchAnimeGif(bossAbility.action);
                    lastActionGif = gifData.url;
                    lastActionAnime = gifData.anime;
                }

                // Show Boss's action result
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

                // Tick down shields & buffs
                if (boss.shield) {
                    boss.shieldTurns--;
                    if (boss.shieldTurns <= 0) boss.shield = false;
                }

                turn = 'player';
                turnCount++;
            }
        }

        // 5. Final Battle Results Processing
        // Refetch/reload baubleData before final update
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

            // Disable buttons on the old message
            const disabledRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('ab_play_again_disabled')
                    .setLabel('Play Again')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔄')
                    .setDisabled(true)
            );
            await initialMsg.edit({ components: [disabledRow] }).catch(() => {});

            // Start a new fight!
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
