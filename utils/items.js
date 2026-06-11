const Bauble = require('../models/baubleSchema');
const { decorateEmojiDefinition, formatEmojiName } = require('./customEmojis');

const RARITIES = {
    Common: { name: 'Common', color: 0x95a5a6, weight: 500 },     // Gray
    Uncommon: { name: 'Uncommon', color: 0x2ecc71, weight: 300 }, // Green
    Rare: { name: 'Rare', color: 0x3498db, weight: 120 },         // Blue
    Epic: { name: 'Epic', color: 0x9b59b6, weight: 50 },          // Purple
    Legendary: { name: 'Legendary', color: 0xe67e22, weight: 20 },// Orange
    Mythic: { name: 'Mythic', color: 0xe74c3c, weight: 5 },       // Red
    Unique: { name: 'Unique', color: 0xf1c40f, weight: 1 }        // Gold
};

const ITEMS = {
    // --- Shop & Utility Boosters ---
    coffee: {
        id: 'coffee',
        name: '☕ Liquid Anxiety',
        emoji: '☕',
        description: 'A boiling mug of 99% pure caffeine and raw panic. Halves work and scavenge cooldowns for 1 hour, with a 15% chance to double all command payouts during this time.',
        useInfo: 'Chug to halve cooldowns. Might cause jittery double payouts!',
        basePrice: 15000,
        sellPrice: 7500,
        type: 'consumable',
        category: 'boosters',
        rarity: 'Common'
    },
    clover: {
        id: 'clover',
        name: '🍀 Chernobyl Salad',
        emoji: '🍀',
        description: 'A glowing four-leaf weed plucked from a cooling tower. Boosts Coinflip/Gamble win rates by +15% for 30 minutes and instantly cures all bad luck.',
        useInfo: 'Eat to gain +15% luck for 30m and nuke any bad luck penalties.',
        basePrice: 25000,
        sellPrice: 12500,
        type: 'consumable',
        category: 'boosters',
        rarity: 'Uncommon'
    },
    shield: {
        id: 'shield',
        name: '🛡️ Bubble Wrap Armor',
        emoji: '🛡️',
        description: 'Several layers of high-grade plastic packaging. Completely protects you from all robs and duels for 2 hours (but blocks you from robbing others too).',
        useInfo: 'Wrap yourself to enter peaceful mode (rob/duel immune) for 2 hours.',
        basePrice: 60000,
        sellPrice: 30000,
        type: 'consumable',
        category: 'boosters',
        rarity: 'Rare'
    },
    mystery_box: {
        id: 'mystery_box',
        name: '📦 Gacha Addiction Box',
        emoji: '📦',
        description: 'An attractive cardboard box containing random loot. Could contain up to 15,000 baubles, useful boosters, hardware, or actual worthless junk.',
        useInfo: 'Unbox to satisfy your gambling cravings. Hope it is not garbage!',
        basePrice: 20000,
        sellPrice: 10000,
        type: 'consumable',
        category: 'boosters',
        rarity: 'Common'
    },
    padlock: {
        id: 'padlock',
        name: '🔒 Dollar Store Lock',
        emoji: '🔒',
        description: 'A padlock made of compressed tin foil. Passively protects your wallet from 3 rob attempts before breaking. Alternatively, use it to lock yourself in a vault for 1 hour (immune to robs, but blocks work/scavenge).',
        useInfo: 'Active: Lock yourself in vault for 1 hour. Passive: Block 3 robberies.',
        basePrice: 25000,
        sellPrice: 12500,
        type: 'consumable',
        category: 'boosters',
        rarity: 'Uncommon'
    },

    // --- Cosmetics & Premium Collectibles ---
    tag: {
        id: 'tag',
        name: '🏷️ "Kick Me" Sticky Note',
        emoji: '🏷️',
        description: 'A sticky note you slap on someone\'s back. Use it to temporarily brand yourself or another user with a silly active title (e.g. "Slightly Moist") for 24 hours.',
        useInfo: 'Slap it on someone (e.g. -use tag @User) to change their title for 24 hours.',
        basePrice: 50000,
        sellPrice: null,
        type: 'collectible',
        category: 'cosmetics',
        giftable: false,
        rarity: 'Rare'
    },
    paintbrush: {
        id: 'paintbrush',
        name: '🎨 Toxic Neon Highlighter',
        emoji: '🎨',
        description: 'A highlighter filled with radioactive ink. Draw on someone\'s face to blind them for 15 minutes, blocking profiles/inv checks and robbing/dueling.',
        useInfo: 'Blind another user (e.g. -use paintbrush @User) for 15 minutes.',
        basePrice: 80000,
        sellPrice: 40000,
        type: 'collectible',
        category: 'cosmetics',
        rarity: 'Rare'
    },
    nugget: {
        id: 'nugget',
        name: '💎 Fool\'s Gold Chunk',
        emoji: '💎',
        description: 'A shiny pyrite chunk. Offer it to the bot for a 70% chance to receive a random rare item, or a 30% chance the bot pockets it and locks your commands for 1 hour.',
        useInfo: 'Bribe the bot for a rare item. Watch out for the 1 hour lockout!',
        basePrice: 150000,
        sellPrice: 150000,
        type: 'collectible',
        category: 'cosmetics',
        maxGlobalSupply: 30,
        rarity: 'Epic'
    },
    crown: {
        id: 'crown',
        name: '👑 Cardboard Monarch Hat',
        emoji: '👑',
        description: 'A paper hat that makes you look slightly majestic. 75% success to tax everyone in the channel for 1,000 baubles (max 5,000 total). 25% chance to get overthrown, losing 3,000 baubles and the "Royal Fraud" title.',
        useInfo: 'Crown yourself to tax the channel. Risk getting overthrown!',
        basePrice: 500000,
        sellPrice: 250000,
        type: 'collectible',
        category: 'cosmetics',
        giftable: false,
        maxGlobalSupply: 10,
        rarity: 'Legendary'
    },

    // --- Family Essentials ---
    ring_silver: {
        id: 'ring_silver',
        name: '💍 Ring of Mild Interest',
        emoji: '💍',
        description: 'A silver ring made of soda tabs. Required to propose. Grants the title "Mildly Interested" upon acceptance.',
        basePrice: 30000,
        sellPrice: 15000,
        type: 'collectible',
        category: 'family',
        rarity: 'Common'
    },
    ring_gold: {
        id: 'ring_gold',
        name: '💍 Ring of Financial Strain',
        emoji: '💍',
        description: 'A gold-plated ring that cost two rent cycles. Required to propose. Grants a permanent +5% income boost while married.',
        basePrice: 100000,
        sellPrice: 50000,
        type: 'collectible',
        category: 'family',
        rarity: 'Rare'
    },
    ring_diamond: {
        id: 'ring_diamond',
        name: '💎 Ring of Devastating Debt',
        emoji: '💎',
        description: 'A massive diamond ring that bankrupted your descendants. Required to propose. Grants a permanent +15% income boost while married.',
        basePrice: 300000,
        sellPrice: 150000,
        type: 'collectible',
        category: 'family',
        maxGlobalSupply: 100,
        rarity: 'Epic'
    },
    adoption_papers: {
        id: 'adoption_papers',
        name: '📄 Child Labor Contract',
        emoji: '📄',
        description: 'Legally adopt another user. Gives you a 15% cut of their /work earnings for 2 hours (generated from thin air, does not reduce their payout!).',
        useInfo: 'Adopt a user (e.g. -use adoption_papers @User) to earn passive cuts.',
        basePrice: 15000,
        sellPrice: 7500,
        type: 'consumable',
        category: 'family',
        rarity: 'Common'
    },

    // --- Dumpster Dive Loot ---
    broken_keyboard: {
        id: 'broken_keyboard',
        name: '⌨️ Rage-Quitted Keyboard',
        emoji: '⌨️',
        description: 'A plastic keyboard with half the keys missing. Smash it for a 30% chance to go viral (5k-15k baubles), 60% chance to shake loose coins (1k-3k baubles), or a 10% chance to get zapped (1m item lock).',
        useInfo: 'Smash it to release built-up rage and cash.',
        basePrice: null,
        sellPrice: 150,
        type: 'junk',
        category: 'dumpster',
        rarity: 'Common'
    },
    rotten_banana: {
        id: 'rotten_banana',
        name: '🍌 Slip-and-Slide Peel',
        emoji: '🍌',
        description: 'A slimy banana peel. Throw it at someone to steal 10% of their wallet (min 500, max 5,000 baubles) and lock them out of working for 10 minutes.',
        useInfo: 'Throw at a user (e.g. -use rotten_banana @User) to rob and slip them up.',
        basePrice: null,
        sellPrice: 50,
        type: 'junk',
        category: 'dumpster',
        rarity: 'Common'
    },
    rabbits_feet: {
        id: 'rabbits_feet',
        name: '🐰 Lucky Rabbit Toe',
        emoji: '🐰',
        description: 'A lucky rabbit\'s toe that actually works. Rub it to get +25% luck for 30 minutes, clear bad luck, with a 20% chance to jackpot 10k baubles and a 40% chance to find a Rare item.',
        useInfo: 'Rub for +25% luck. Can trigger cash jackpots or rare item drops!',
        basePrice: null,
        sellPrice: 8888,
        type: 'collectible',
        category: 'dumpster',
        rarity: 'Rare'
    },

    // --- Fishing Loot ---
    fish: {
        id: 'fish',
        name: '🐟 Wet Carp Slap',
        emoji: '🐟',
        description: 'A very wet, very heavy carp. Slap another user across the face with it to steal 1,000 - 3,000 baubles out of sheer surprise.',
        useInfo: 'Slap a user (e.g. -use fish @User) to shock-rob them.',
        basePrice: null,
        sellPrice: 300,
        type: 'fish',
        category: 'fishing',
        rarity: 'Common'
    },
    golden_fish: {
        id: 'golden_fish',
        name: '🐠 Glowing Mutant Guppy',
        emoji: '🐠',
        description: 'A glowing neon guppy. Feed it for a 75% chance to poop out a random Rare or Epic item. 25% chance it bites your finger, costing 500 baubles in medical bills.',
        useInfo: 'Feed the guppy for a chance at high-tier loot.',
        basePrice: null,
        sellPrice: 2500,
        type: 'fish',
        category: 'fishing',
        rarity: 'Rare'
    },
    treasure_chest: {
        id: 'treasure_chest',
        name: '🏴‍☠️ Sunken Loot Crate',
        emoji: '🏴‍☠️',
        description: 'A heavy chest covered in seaweed. Crowbar it open to receive 15,000 - 30,000 baubles plus 2 random items (one guaranteed to be Epic or Legendary).',
        useInfo: 'Crack it open for a massive cash and item haul.',
        basePrice: null,
        sellPrice: 10000,
        type: 'lootbox',
        category: 'fishing',
        rarity: 'Rare'
    },
    ancient_artifact: {
        id: 'ancient_artifact',
        name: '🏺 Haunted Dial-Up Urn',
        emoji: '🏺',
        description: 'An ancient urn that plays dial-up internet noises. Shake it to summon a digital curse that steals 5,000 - 15,000 baubles from a random member in the channel.',
        useInfo: 'Release the mummy curse to steal from a random chat member.',
        basePrice: null,
        sellPrice: 12000,
        type: 'collectible',
        category: 'fishing',
        rarity: 'Epic'
    },

    // --- Dig Loot ---
    fossil_shell: {
        id: 'fossil_shell',
        name: '🐚 Spyware Seashell',
        emoji: '🐚',
        description: 'A seashell with tiny antennas. Scan a user to reveal their wallet, active status effects, inventory, and steal 1 random item from their bag.',
        useInfo: 'Scan a user (e.g. -use fossil_shell @User) and steal one of their items.',
        basePrice: null,
        sellPrice: 800,
        type: 'collectible',
        category: 'digging',
        rarity: 'Uncommon'
    },
    ancient_bone: {
        id: 'ancient_bone',
        name: '🦴 Ancient Dog Chew Toy',
        emoji: '🦴',
        description: 'A petrified bone. Whistle to summon the Ancient Dog, who runs off to dig up 3,000 - 8,000 baubles from a random user\'s backyard wallet.',
        useInfo: 'Whistle to summon the good boy to steal baubles.',
        basePrice: null,
        sellPrice: 1200,
        type: 'collectible',
        category: 'digging',
        rarity: 'Uncommon'
    },
    t_rex_skull: {
        id: 't_rex_skull',
        name: '🦖 Dino Jump-Scare Mask',
        emoji: '🦖',
        description: 'A plastic T-Rex skull you use to jump-scare someone. 70% success to extort 5,000 - 15,000 baubles. 30% failure: they stand their ground and steal 2,500 baubles from you.',
        useInfo: 'Scare a user (e.g. -use t_rex_skull @User) to extort cash.',
        basePrice: null,
        sellPrice: 15000,
        type: 'collectible',
        category: 'digging',
        rarity: 'Epic'
    },

    // --- Meme Hunt Loot ---
    common_meme: {
        id: 'common_meme',
        name: '🐸 Stale Pepeland JPEG',
        emoji: '🐸',
        description: 'A moldy JPEG of a green frog. Post it: 25% viral (5k-10k baubles), 60% upvotes (1k-3k baubles), 15% ratio (lose 500 baubles).',
        useInfo: 'Post to test your meme quality on the market.',
        basePrice: null,
        sellPrice: 200,
        type: 'meme',
        category: 'memehunt',
        rarity: 'Common'
    },
    dead_meme: {
        id: 'dead_meme',
        name: '💀 Deep-Fried Rage Comic',
        emoji: '💀',
        description: 'Force a user to read a terrible rage comic. Steals 2,000 - 5,000 baubles and locks their work for 10 minutes out of sheer embarrassment.',
        useInfo: 'Post cringe at a user to steal cash and lock their work.',
        basePrice: null,
        sellPrice: 100,
        type: 'meme',
        category: 'memehunt',
        rarity: 'Common'
    },
    ancient_meme: {
        id: 'ancient_meme',
        name: '📜 Dial-up Dancing Baby',
        emoji: '📜',
        description: 'A 90s low-polygon dancing baby. Activates a global economy boost, setting the server-wide multiplier to 1.5x, 2.0x, or 3.0x for 10 minutes.',
        useInfo: 'Post to boost global economy multipliers for 10m.',
        basePrice: null,
        sellPrice: 1500,
        type: 'meme',
        category: 'memehunt',
        rarity: 'Uncommon'
    },
    legendary_meme: {
        id: 'legendary_meme',
        name: '👑 Standard Rickroll Link',
        emoji: '👑',
        description: 'The ultimate link. Post to grant everyone online 1,000 baubles, pocket 10,000 baubles yourself, and unlock the permanent title "Meme Lord".',
        useInfo: 'Rickroll the server for server-wide payouts and a title.',
        basePrice: null,
        sellPrice: 5000,
        type: 'meme',
        category: 'memehunt',
        rarity: 'Epic'
    },

    // --- Rubber Duck Collection ---
    rubber_duck: {
        id: 'rubber_duck',
        name: '🦆 Sentient Rubber Duck',
        emoji: '🦆',
        description: 'A highly intelligent debugging companion. Squeeze (infinite use): 15% chance to find a booster/computer item, 15% chance to leak 2,000 - 5,000 baubles, 5% chance of a segfault (30s item lock).',
        useInfo: 'Squeeze for debugging assistance, item spawns, or cash leaks.',
        basePrice: null,
        sellPrice: 1000,
        type: 'collectible',
        category: 'ducks',
        rarity: 'Uncommon'
    },
    golden_duck: {
        id: 'golden_duck',
        name: '🟡 Smeltable Aurum Duck',
        emoji: '🟡',
        description: 'A duck cast in solid 24k gold. Melt it down in a blast furnace to extract 40,000 - 80,000 baubles.',
        useInfo: 'Smelt down for a massive gold payout. Consumes the duck.',
        basePrice: null,
        sellPrice: 5000,
        type: 'collectible',
        category: 'ducks',
        rarity: 'Rare'
    },
    pirate_duck: {
        id: 'pirate_duck',
        name: '🏴‍☠️ Tax Evader Duck',
        emoji: '🏴‍☠️',
        description: 'A duck wearing a tiny eyepatch. Send it to plunder the server tax fund, stealing 5,000 - 15,000 baubles.',
        useInfo: 'Rob the server tax fund.',
        basePrice: null,
        sellPrice: 6000,
        type: 'collectible',
        category: 'ducks',
        rarity: 'Rare'
    },
    space_duck: {
        id: 'space_duck',
        name: '🚀 Spy Satellite Duck',
        emoji: '🚀',
        description: 'A high-orbit space surveillance duck. For 1 hour, it intercepts 15% of all bauble transactions made by other players.',
        useInfo: 'Launch into orbit to intercept other players\' earnings for 1 hour.',
        basePrice: null,
        sellPrice: 12000,
        type: 'collectible',
        category: 'ducks',
        rarity: 'Epic'
    },
    divine_duck: {
        id: 'divine_duck',
        name: '✨ Holy Ascension Duck',
        emoji: '✨',
        description: 'A radiant celestial duck. Sacrifice it to the server gods to receive a +200% income boost on all commands for 30 minutes.',
        useInfo: 'Consume for double income (+200% boost) for 30 minutes.',
        basePrice: null,
        sellPrice: 35000,
        type: 'collectible',
        category: 'ducks',
        rarity: 'Legendary'
    },

    // --- Computer Collection ---
    broken_laptop: {
        id: 'broken_laptop',
        name: '💻 Spicy Pillow Laptop',
        emoji: '💻',
        description: 'A laptop with a swollen battery. Boot it: 35% chance to upgrade to a DIY Crypto Miner (gaming_pc), 65% chance it shocks your fingers (3m item lock).',
        useInfo: 'Boot it and pray the battery doesn\'t explode.',
        basePrice: null,
        sellPrice: 1000,
        type: 'collectible',
        category: 'computers',
        rarity: 'Uncommon'
    },
    gaming_pc: {
        id: 'gaming_pc',
        name: '🖥️ DIY Crypto Miner',
        emoji: '🖥️',
        description: 'A noisy mining rig. Run it to mine 5,000 - 10,000 baubles. Has a 25% chance to melt down and be destroyed.',
        useInfo: 'Mine crypto for baubles. Watch the temperature!',
        basePrice: null,
        sellPrice: 6500,
        type: 'collectible',
        category: 'computers',
        rarity: 'Rare'
    },
    quantum_computer: {
        id: 'quantum_computer',
        name: '🔮 Quantum Casino Engine',
        emoji: '🔮',
        description: 'Computes multi-dimensional states. 60% chance to win lottery (+150,000 baubles). 40% chance it creates a black hole, sucking in 2 random inventory items.',
        useInfo: 'Simulate winning states. Highly volatile!',
        basePrice: null,
        sellPrice: 20000,
        type: 'collectible',
        category: 'computers',
        maxGlobalSupply: 30,
        rarity: 'Epic'
    },
    alien_computer: {
        id: 'alien_computer',
        name: '👽 Area 51 Console',
        emoji: '👽',
        description: 'A glowing alien command terminal. 50% chance to abvent a user (10m command lockout), 50% chance to beam down space cargo (5 random items, guaranteed one Legendary/Mythic).',
        useInfo: 'Contact the mothership to abvent someone or spawn cargo.',
        basePrice: null,
        sellPrice: 45000,
        type: 'collectible',
        category: 'computers',
        maxGlobalSupply: 15,
        rarity: 'Legendary'
    },

    // --- Boss Drops & Mythic Treasures ---
    dragon_egg: {
        id: 'dragon_egg',
        name: '🥚 Scaly Fireball Egg',
        emoji: '🥚',
        description: 'A burning egg. Hatch it: 50% baby dragon steals 1,000 - 3,000 baubles from all active channel users. 50% it sneezes fire, burning 5,000 baubles in your wallet.',
        useInfo: 'Incubate and hatch the dragon.',
        basePrice: null,
        sellPrice: 60000,
        type: 'collectible',
        category: 'mythic',
        maxGlobalSupply: 15,
        rarity: 'Mythic'
    },
    void_star: {
        id: 'void_star',
        name: '⭐ black_hole.exe',
        emoji: '⭐',
        description: 'A program that consumes all physical matter. Purges all active status effects and penalties, with a 5% chance it also devours all your titles.',
        useInfo: 'Execute to purge all negative status effects.',
        basePrice: null,
        sellPrice: 75000,
        type: 'collectible',
        category: 'mythic',
        maxGlobalSupply: 15,
        rarity: 'Mythic'
    },

    // --- Unique Items (Exactly 1 Copy Globally) ---
    the_one_ring: {
        id: 'the_one_ring',
        name: '💍 Ring of Absolute Cowardice',
        emoji: '💍',
        description: 'A ring that makes you vanish from reality. Slip it on to go invisible for 4 hours (rob/duel immune, but you cannot rob others).',
        useInfo: 'Activate 4 hours of complete safety and robbery protection.',
        basePrice: null,
        sellPrice: 150000,
        type: 'unique',
        category: 'unique',
        isUnique: true,
        maxGlobalSupply: 1,
        rarity: 'Unique'
    },
    excalibur: {
        id: 'excalibur',
        name: '⚔️ Excalibur (Plastic Replica)',
        emoji: '⚔️',
        description: 'A plastic sword that squeaks when you hit someone. Challenge a user to a high-noon duel. Winner steals 20,000 baubles!',
        useInfo: 'Duel another user (e.g. -use excalibur @User) for 20,000 baubles.',
        basePrice: null,
        sellPrice: 150000,
        type: 'unique',
        category: 'unique',
        isUnique: true,
        maxGlobalSupply: 1,
        rarity: 'Unique'
    },
    holy_grail: {
        id: 'holy_grail',
        name: '🏆 Shiny Wooden Cup',
        emoji: '🏆',
        description: 'A dusty cup that smells like tree bark. Cures all expedition injuries and grants a +100% income boost on all actions for 1 hour.',
        useInfo: 'Drink to cure expedition injuries and double income for 1 hour.',
        basePrice: null,
        sellPrice: 150000,
        type: 'unique',
        category: 'unique',
        isUnique: true,
        maxGlobalSupply: 1,
        rarity: 'Unique'
    },
    mona_lisa: {
        id: 'mona_lisa',
        name: '🖼️ Mustard-Stained Mona Lisa',
        emoji: '🖼️',
        description: 'A masterpiece vandalized with condiments. Draw a giant mustache on it to deface it, yielding 50,000 baubles and the permanent title "Art Vandal".',
        useInfo: 'Deface the painting for internet fame and 50,000 baubles.',
        basePrice: null,
        sellPrice: 150000,
        type: 'unique',
        category: 'unique',
        isUnique: true,
        maxGlobalSupply: 1,
        rarity: 'Unique'
    }
};

const COLLECTIONS = {
    rubber_duck: {
        id: 'rubber_duck',
        name: '🦆 Rubber Duck Collection',
        description: 'Collect all the legendary rubber ducks!',
        items: ['rubber_duck', 'golden_duck', 'pirate_duck', 'space_duck', 'divine_duck'],
        reward: {
            title: 'Duck Master',
            baubles: 15000,
            incomeMultiplier: 0.10
        }
    },
    computers: {
        id: 'computers',
        name: '💻 Computer Collection',
        description: 'Acquire computing hardware across all tiers.',
        items: ['broken_laptop', 'gaming_pc', 'quantum_computer', 'alien_computer'],
        reward: {
            title: 'Tech Genius',
            baubles: 25000,
            incomeMultiplier: 0.15
        }
    }
};

for (const item of Object.values(ITEMS)) {
    decorateEmojiDefinition(item, `item.${item.id}`);
}

for (const collection of Object.values(COLLECTIONS)) {
    const fallbackEmoji = collection.id === 'rubber_duck' ? '🦆' : '💻';
    collection.emojiKey = `collection.${collection.id}`;
    collection.name = formatEmojiName(collection.emojiKey, fallbackEmoji, collection.name);
}

async function checkCollections(baubleData) {
    if (!baubleData.completedCollections) baubleData.completedCollections = [];
    if (!baubleData.titles) baubleData.titles = [];

    const unlockedTitles = [];
    const unlockedCollections = [];

    for (const [colId, col] of Object.entries(COLLECTIONS)) {
        if (baubleData.completedCollections.includes(colId)) continue;

        const hasAll = col.items.every(itemId => {
            const invItem = baubleData.inventory.find(i => i.itemId === itemId);
            return invItem && invItem.quantity > 0;
        });

        if (hasAll) {
            baubleData.completedCollections.push(colId);
            unlockedCollections.push(col.name);

            if (col.reward.title) {
                if (!baubleData.titles.includes(col.reward.title)) {
                    baubleData.titles.push(col.reward.title);
                    unlockedTitles.push(col.reward.title);
                }
            }

            if (col.reward.baubles) {
                baubleData.baubles += col.reward.baubles;
            }
        }
    }

    if (unlockedCollections.length > 0) {
        await baubleData.save();
    }

    return { unlockedCollections, unlockedTitles };
}

async function getIncomeMultiplier(userId) {
    try {
        const baubleData = await Bauble.findOne({ userId }).lean();
        if (!baubleData) return 1.0;

        let multiplier = 1.0;
        if (baubleData.completedCollections) {
            for (const colId of baubleData.completedCollections) {
                const col = COLLECTIONS[colId];
                if (col && col.reward && col.reward.incomeMultiplier) {
                    multiplier += col.reward.incomeMultiplier;
                }
            }
        }

        // Add Wedding Ring active buff (+5% for Gold Ring of Financial Strain, +15% for Diamond Ring of Devastating Debt)
        const Family = require('../models/familySchema');
        const familyData = await Family.findOne({ userId }).lean();
        if (familyData && familyData.spouseId) {
            if (familyData.ringUsed === 'ring_gold') {
                multiplier += 0.05;
            } else if (familyData.ringUsed === 'ring_diamond') {
                multiplier += 0.15;
            }
        }

        // Add Holy Grail active buff (+50%)
        const now = Date.now();
        if (baubleData.grailIncomeExpiresAt && now < new Date(baubleData.grailIncomeExpiresAt).getTime()) {
            multiplier += 0.50;
        }

        // Add Divine Duck active buff (+100%)
        if (baubleData.divineDuckExpiresAt && now < new Date(baubleData.divineDuckExpiresAt).getTime()) {
            multiplier += 1.0;
        }

        return multiplier;
    } catch (err) {
        console.error('Error in getIncomeMultiplier:', err);
        return 1.0;
    }
}

async function getGlobalItemSupply(itemId) {
    try {
        const result = await Bauble.aggregate([
            { $unwind: "$inventory" },
            { $match: { "inventory.itemId": itemId } },
            { $group: { _id: "$inventory.itemId", total: { $sum: "$inventory.quantity" } } }
        ]);
        return result.length > 0 ? result[0].total : 0;
    } catch (err) {
        console.error(`Error in getGlobalItemSupply for ${itemId}:`, err);
        return 0;
    }
}

async function isItemAvailable(itemId) {
    const item = ITEMS[itemId];
    if (!item) return false;
    
    const limit = item.maxGlobalSupply !== undefined ? item.maxGlobalSupply : (item.isUnique ? 1 : null);
    if (limit === null) return true;
    
    const supply = await getGlobalItemSupply(itemId);
    return supply < limit;
}

async function isUniqueAvailable(itemId) {
    return isItemAvailable(itemId);
}

async function getRandomAvailableItem(pool) {
    if (!pool || pool.length === 0) return null;
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    for (const item of shuffled) {
        const itemId = typeof item === 'string' ? item : item.id;
        const available = await isItemAvailable(itemId);
        if (available) {
            return typeof item === 'string' ? ITEMS[item] : item;
        }
    }
    return ITEMS['rotten_banana'];
}

async function rollItemDrop(allowedCategories = []) {
    const totalWeight = Object.values(RARITIES).reduce((sum, r) => sum + r.weight, 0);
    let roll = Math.random() * totalWeight;
    let selectedRarity = 'Common';

    for (const [rarityName, r] of Object.entries(RARITIES)) {
        if (roll < r.weight) {
            selectedRarity = rarityName;
            break;
        }
        roll -= r.weight;
    }

    let matchingItems = Object.values(ITEMS).filter(item => {
        if (item.rarity !== selectedRarity) return false;
        if (allowedCategories.length > 0 && !allowedCategories.includes(item.category)) return false;
        if (item.basePrice !== null && (item.category === 'boosters' || item.category === 'family')) return false;
        return true;
    });

    if (matchingItems.length === 0) {
        matchingItems = Object.values(ITEMS).filter(item => {
            if (allowedCategories.length > 0 && !allowedCategories.includes(item.category)) return false;
            if (item.basePrice !== null && (item.category === 'boosters' || item.category === 'family')) return false;
            return item.rarity === 'Common' || item.rarity === 'Uncommon';
        });
    }

    if (matchingItems.length === 0) return null;

    let attempts = 0;
    while (attempts < 5) {
        const candidate = matchingItems[Math.floor(Math.random() * matchingItems.length)];
        const available = await isItemAvailable(candidate.id);
        if (available) {
            return candidate;
        } else {
            matchingItems = matchingItems.filter(i => i.id !== candidate.id);
            if (matchingItems.length === 0) break;
        }
        attempts++;
    }

    return Object.values(ITEMS).find(item => item.id === 'rotten_banana');
}

function addItemToInventory(baubleData, itemId, quantity = 1, client = null, interactionOrMessage = null) {
    if (!baubleData.inventory) baubleData.inventory = [];
    const existing = baubleData.inventory.find(i => i.itemId === itemId);
    if (existing) {
        existing.quantity += quantity;
    } else {
        baubleData.inventory.push({ itemId, quantity });
    }

    if (client && interactionOrMessage) {
        const item = ITEMS[itemId];
        if (item && (item.rarity === 'Mythic' || item.rarity === 'Unique')) {
            const { checkAndAwardAchievement } = require('./achievements');
            checkAndAwardAchievement(client, baubleData.userId, 'scavenge_legend', interactionOrMessage).catch(err => {
                console.error('[Achievements] Failed to award scavenge_legend:', err);
            });
        }
        const uniqueItems = (baubleData.inventory || []).filter(i => i.quantity > 0).length;
        if (uniqueItems >= 10) {
            const { checkAndAwardAchievement } = require('./achievements');
            checkAndAwardAchievement(client, baubleData.userId, 'relic_collector', interactionOrMessage).catch(err => {
                console.error('[Achievements] Failed to award relic_collector:', err);
            });
        }
    }
}

function removeItemFromInventory(baubleData, itemId, quantity = 1) {
    if (!baubleData.inventory) return false;
    const existingIndex = baubleData.inventory.findIndex(i => i.itemId === itemId);
    if (existingIndex === -1) return false;
    
    const existing = baubleData.inventory[existingIndex];
    if (existing.quantity < quantity) return false;
    
    existing.quantity -= quantity;
    if (existing.quantity <= 0) {
        baubleData.inventory.splice(existingIndex, 1);
    }
    return true;
}

module.exports = {
    RARITIES,
    ITEMS,
    COLLECTIONS,
    checkCollections,
    getIncomeMultiplier,
    isUniqueAvailable,
    rollItemDrop,
    addItemToInventory,
    removeItemFromInventory,
    getGlobalItemSupply,
    isItemAvailable,
    getRandomAvailableItem
};
