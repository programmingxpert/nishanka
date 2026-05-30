const Bauble = require('../models/baubleSchema');

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
        name: '☕ Depresso Espresso',
        emoji: '☕',
        description: 'A cup of lukewarm water and pure sadness. Halves work and scavenge cooldowns for 30m, but 10% chance to get "Jittery Hands" (+2x next work payout) and 5% chance of "Despair Crash" (work lockout for 2m).',
        useInfo: 'Drink to halve cooldowns. Risk a Despair Crash or get Jittery Hands!',
        basePrice: 15000,
        sellPrice: 7500,
        type: 'consumable',
        category: 'boosters',
        rarity: 'Common'
    },
    clover: {
        id: 'clover',
        name: '🍀 Mutant Four-Leaf Clover',
        emoji: '🍀',
        description: 'A glowing weed plucked near a toxic waste dump. Boosts Coinflip/Gamble win rates by +10% for 15m, and has a 5% chance to grow an extra toe and find 100 extra baubles.',
        useInfo: 'Consume for 15m luck boost. Might sprout extra appendages.',
        basePrice: 25000,
        sellPrice: 12500,
        type: 'consumable',
        category: 'boosters',
        rarity: 'Uncommon'
    },
    shield: {
        id: 'shield',
        name: '🛡️ Cardboard Aegis Shield',
        emoji: '🛡️',
        description: 'Made of cardboard and spray-painted metallic. Can be used to shield yourself from all robberies and duels for 30m (blocks you from robbing others too).',
        useInfo: 'Activate to enter safe mode (immune to theft/duels but cannot rob) for 30m.',
        basePrice: 60000,
        sellPrice: 30000,
        type: 'consumable',
        category: 'boosters',
        rarity: 'Rare'
    },
    mystery_box: {
        id: 'mystery_box',
        name: '📦 Disappointment Box',
        emoji: '📦',
        description: 'Contains random loot. Could be coffee, clovers, mystery items, or a lint roller covered in golden retriever fur.',
        useInfo: 'Pop it open and pray it is not actual garbage.',
        basePrice: 20000,
        sellPrice: 10000,
        type: 'consumable',
        category: 'boosters',
        rarity: 'Common'
    },
    padlock: {
        id: 'padlock',
        name: '🔒 Toddler-Proof Safe Padlock',
        emoji: '🔒',
        description: 'An incredibly cheap combination lock. Can be used to lock yourself in a safe vault (immune to all theft for 30m, but cannot work or scavenge). Passively protects wallet from one rob automatically if kept in inventory.',
        useInfo: 'Use to padlock yourself in the vault for 30m.',
        basePrice: 25000,
        sellPrice: 12500,
        type: 'consumable',
        category: 'boosters',
        rarity: 'Uncommon'
    },

    // --- Cosmetics & Premium Collectibles ---
    tag: {
        id: 'tag',
        name: '🏷️ Dumb Custom Tag',
        emoji: '🏷️',
        description: 'A piece of paper taped to your head. Use it to temporarily brand yourself or another user with a silly active title (e.g. "Certified Bozo", "Smelly Loser") for 1 hour.',
        useInfo: 'Use to brand a user with a stupid title (e.g. -use tag @User).',
        basePrice: 50000,
        sellPrice: null,
        type: 'collectible',
        category: 'cosmetics',
        giftable: false,
        rarity: 'Rare'
    },
    paintbrush: {
        id: 'paintbrush',
        name: '🎨 Blinding Paintbrush',
        emoji: '🎨',
        description: 'Splashes toxic neon paint in someone\'s eyes. Blinds them, making them unable to view profile, inventory, or use items for 5 minutes.',
        useInfo: 'Use to blind another user (e.g. -use paintbrush @User) for 5 minutes.',
        basePrice: 80000,
        sellPrice: 40000,
        type: 'collectible',
        category: 'cosmetics',
        rarity: 'Rare'
    },
    nugget: {
        id: 'nugget',
        name: '💎 Shiny Golden Nugget',
        emoji: '💎',
        description: 'A high-value gold chunk. Use it to bribe the bot for a rare item (50% success), or have the bot pocket it, call you a nerd, and block you from daily/weekly for 12 hours.',
        useInfo: 'Bribe the bot for a random Legendary/Mythic item. 50% failure lockout!',
        basePrice: 150000,
        sellPrice: 150000,
        type: 'collectible',
        category: 'cosmetics',
        rarity: 'Epic'
    },
    crown: {
        id: 'crown',
        name: '👑 Paper Burger Crown',
        emoji: '👑',
        description: 'Makes you feel like royalty. Use to declare yourself King. Everyone in the channel pays you 50 bauble tax, OR you get overthrown, lose 2,000 baubles, and get named "Royal Fraud".',
        useInfo: 'Declare yourself King of the channel.',
        basePrice: 500000,
        sellPrice: 250000,
        type: 'collectible',
        category: 'cosmetics',
        giftable: false,
        rarity: 'Legendary'
    },

    // --- Family Essentials ---
    ring_silver: {
        id: 'ring_silver',
        name: '💍 Ring of Average Commitment',
        emoji: '💍',
        description: 'A silver ring. Required to propose. 90% chance it turns their finger green and starts a minor argument.',
        basePrice: 30000,
        sellPrice: 15000,
        type: 'collectible',
        category: 'family',
        rarity: 'Common'
    },
    ring_gold: {
        id: 'ring_gold',
        name: '💍 Ring of Serious Commitment',
        emoji: '💍',
        description: 'A gold ring. Required to propose. Gleams brightly enough to distract birds and gold-diggers.',
        basePrice: 100000,
        sellPrice: 50000,
        type: 'collectible',
        category: 'family',
        rarity: 'Rare'
    },
    ring_diamond: {
        id: 'ring_diamond',
        name: '💎 Ring of Financial Irresponsibility',
        emoji: '💎',
        description: 'The ultimate proposal ring. Can cut glass, diamonds, and your savings account in half.',
        basePrice: 300000,
        sellPrice: 150000,
        type: 'collectible',
        category: 'family',
        rarity: 'Epic'
    },
    adoption_papers: {
        id: 'adoption_papers',
        name: '📄 Legal Kidnapping Papers',
        emoji: '📄',
        description: 'Allows you to adopt another user. Makes them your child, syncs family status, and gives you a 5% cut of their /work earnings for 1 hour.',
        useInfo: 'Adopt another user (e.g. -use adoption_papers @User) for child labor.',
        basePrice: 15000,
        sellPrice: 7500,
        type: 'consumable',
        category: 'family',
        rarity: 'Common'
    },

    // --- Dumpster Dive Loot ---
    broken_keyboard: {
        id: 'broken_keyboard',
        name: '⌨️ Rage-Smashed Keyboard',
        emoji: '⌨️',
        description: 'Missing keycaps. Use it to rage-type a garbled message and maybe shake out 10-50 coins.',
        useInfo: 'Smash keys for potential loose coins.',
        basePrice: null,
        sellPrice: 150,
        type: 'junk',
        category: 'dumpster',
        rarity: 'Common'
    },
    rotten_banana: {
        id: 'rotten_banana',
        name: '🍌 Stinky Rotten Banana',
        emoji: '🍌',
        description: 'Flies are circling it. Throw it at someone to coat them in flies and lock them out of -work for 2 minutes.',
        useInfo: 'Throw at a user (e.g. -use rotten_banana @User) to block their work.',
        basePrice: null,
        sellPrice: 50,
        type: 'junk',
        category: 'dumpster',
        rarity: 'Common'
    },
    rabbits_feet: {
        id: 'rabbits_feet',
        name: '🐰 Unlucky Rabbit Foot',
        emoji: '🐰',
        description: 'Gives +15% luck for 10m, but 20% chance to twitch-kick your hand and apply -15% luck penalty.',
        useInfo: 'Rub for luck, but beware the twitch-kick backfire.',
        basePrice: null,
        sellPrice: 8888,
        type: 'collectible',
        category: 'dumpster',
        rarity: 'Rare'
    },

    // --- Fishing Loot ---
    fish: {
        id: 'fish',
        name: '🐟 Wiggling Wet Fish',
        emoji: '🐟',
        description: 'A slimy trout. Use it to slap another user in the face! Deals 0 damage but steals 50-150 baubles out of sheer shock.',
        useInfo: 'Slap another user (e.g. -use fish @User).',
        basePrice: null,
        sellPrice: 300,
        type: 'fish',
        category: 'fishing',
        rarity: 'Common'
    },
    golden_fish: {
        id: 'golden_fish',
        name: '🐠 Radioactive Golden Fish',
        emoji: '🐠',
        description: 'Feed it! 50% chance it poops out a random rare item, 50% chance it bites your finger, costing 200 baubles in medical bills.',
        useInfo: 'Feed it and pray it doesn\'t bite your fingers off.',
        basePrice: null,
        sellPrice: 2500,
        type: 'fish',
        category: 'fishing',
        rarity: 'Rare'
    },
    treasure_chest: {
        id: 'treasure_chest',
        name: '🏴‍☠️ Barnacle-Covered Chest',
        emoji: '🏴‍☠️',
        description: 'An old iron-bound pirate chest. Pry it open to find random boosters and baubles.',
        useInfo: 'Use to pry it open and get loot.',
        basePrice: null,
        sellPrice: 10000,
        type: 'lootbox',
        category: 'fishing',
        rarity: 'Rare'
    },
    ancient_artifact: {
        id: 'ancient_artifact',
        name: '🏺 Cursed Urn',
        emoji: '🏺',
        description: 'Plays dial-up noises. Use it to summon a mummy curse, stealing 100-500 baubles from a random channel member.',
        useInfo: 'Summon dial-up mummy curse for a random steal.',
        basePrice: null,
        sellPrice: 12000,
        type: 'collectible',
        category: 'fishing',
        rarity: 'Epic'
    },

    // --- Dig Loot ---
    fossil_shell: {
        id: 'fossil_shell',
        name: '🐚 Prehistoric Shell',
        emoji: '🐚',
        description: 'Listen closely to scan another user\'s balance and active status effects.',
        useInfo: 'Spy on a user\'s wallet (e.g. -use fossil_shell @User).',
        basePrice: null,
        sellPrice: 800,
        type: 'collectible',
        category: 'digging',
        rarity: 'Uncommon'
    },
    ancient_bone: {
        id: 'ancient_bone',
        name: '🦴 Mammoth Femur',
        emoji: '🦴',
        description: 'Summon the Ancient Dog! He runs off and digs up 100-500 baubles from a random user\'s wallet.',
        useInfo: 'Summon the good boy to steal.',
        basePrice: null,
        sellPrice: 1200,
        type: 'collectible',
        category: 'digging',
        rarity: 'Uncommon'
    },
    t_rex_skull: {
        id: 't_rex_skull',
        name: '🦖 Screaming T-Rex Skull',
        emoji: '🦖',
        description: 'Use to scare a user into giving you 100-300 baubles, but if they stand ground, they steal from you!',
        useInfo: 'Scare a user (e.g. -use t_rex_skull @User) to extort them.',
        basePrice: null,
        sellPrice: 15000,
        type: 'collectible',
        category: 'digging',
        rarity: 'Epic'
    },

    // --- Meme Hunt Loot ---
    common_meme: {
        id: 'common_meme',
        name: '🐸 Stale Pepe Meme',
        emoji: '🐸',
        description: 'Post it. 50% chance of upvotes (+100 baubles), 50% chance of downvotes (-50 baubles).',
        useInfo: 'Post meme for instant validation or rejection.',
        basePrice: null,
        sellPrice: 200,
        type: 'meme',
        category: 'memehunt',
        rarity: 'Common'
    },
    dead_meme: {
        id: 'dead_meme',
        name: '💀 2011 Rage Comic',
        emoji: '💀',
        description: 'Make a random user in the channel cringe so hard they lose 5 baubles.',
        useInfo: 'Post cringe to embarrass a random user.',
        basePrice: null,
        sellPrice: 100,
        type: 'meme',
        category: 'memehunt',
        rarity: 'Common'
    },
    ancient_meme: {
        id: 'ancient_meme',
        name: '📜 Dancing Baby GIF',
        emoji: '📜',
        description: 'Summon the ancient gods of internet humor. Alters the server-wide economy multiplier randomly (0.5x to 2.0x) for 5 minutes.',
        useInfo: 'Mutate the economy multiplier.',
        basePrice: null,
        sellPrice: 1500,
        type: 'meme',
        category: 'memehunt',
        rarity: 'Uncommon'
    },
    legendary_meme: {
        id: 'legendary_meme',
        name: '👑 The Ultimate Rickroll',
        emoji: '👑',
        description: 'Share the masterpiece. Grants everyone online 100 baubles and gives you the permanent title "Meme Lord".',
        useInfo: 'Rickroll the entire server for server-wide cash.',
        basePrice: null,
        sellPrice: 5000,
        type: 'meme',
        category: 'memehunt',
        rarity: 'Epic'
    },

    // --- Rubber Duck Collection ---
    rubber_duck: {
        id: 'rubber_duck',
        name: '🦆 Debugging Rubber Duck',
        emoji: '🦆',
        description: 'Helpful coder duck. 1% chance to debug the economy (gain random booster), 1% chance to crash the bot (blocks your commands for 1m).',
        useInfo: 'Squeak for code help or bot crashes.',
        basePrice: null,
        sellPrice: 1000,
        type: 'collectible',
        category: 'ducks',
        rarity: 'Uncommon'
    },
    golden_duck: {
        id: 'golden_duck',
        name: '🟡 Golden Duck',
        emoji: '🟡',
        description: 'Smelt it down! Yields 15,000-30,000 baubles but destroys the duck.',
        useInfo: 'Smelt for a giant cash payout.',
        basePrice: null,
        sellPrice: 5000,
        type: 'collectible',
        category: 'ducks',
        rarity: 'Rare'
    },
    pirate_duck: {
        id: 'pirate_duck',
        name: '🏴‍☠️ Pirate Duck',
        emoji: '🏴‍☠️',
        description: 'Send it to plunder the server! Steals 200-600 baubles from the global tax fund.',
        useInfo: 'Plunder the government tax fund.',
        basePrice: null,
        sellPrice: 6000,
        type: 'collectible',
        category: 'ducks',
        rarity: 'Rare'
    },
    space_duck: {
        id: 'space_duck',
        name: '🚀 Space Duck',
        emoji: '🚀',
        description: 'Launch it into orbit! For 30 minutes, it intercepts 5% of any money transactions made by other players.',
        useInfo: 'Launch space surveillance satellite.',
        basePrice: null,
        sellPrice: 12000,
        type: 'collectible',
        category: 'ducks',
        rarity: 'Epic'
    },
    divine_duck: {
        id: 'divine_duck',
        name: '✨ Divine Duck',
        emoji: '✨',
        description: 'Sacrifice to the digital gods for a +100% income boost on all commands for 15 minutes.',
        useInfo: 'Consume for double earnings.',
        basePrice: null,
        sellPrice: 35000,
        type: 'collectible',
        category: 'ducks',
        rarity: 'Legendary'
    },

    // --- Computer Collection ---
    broken_laptop: {
        id: 'broken_laptop',
        name: '💻 E-Waste Laptop',
        emoji: '💻',
        description: 'Try to boot it. 10% chance it turns into a Gaming PC, 90% chance it shocks you (blocks item use for 10m).',
        useInfo: 'Attempt to boot and upgrade it.',
        basePrice: null,
        sellPrice: 1000,
        type: 'collectible',
        category: 'computers',
        rarity: 'Uncommon'
    },
    gaming_pc: {
        id: 'gaming_pc',
        name: '🖥️ Mining Rig',
        emoji: '🖥️',
        description: 'Mine crypto for 500-1,000 baubles. 20% chance it explodes and is consumed.',
        useInfo: 'Mine crypto, watch out for fire.',
        basePrice: null,
        sellPrice: 6500,
        type: 'collectible',
        category: 'computers',
        rarity: 'Rare'
    },
    quantum_computer: {
        id: 'quantum_computer',
        name: '🔮 Quantum Computer',
        emoji: '🔮',
        description: 'Simulate the universe. 50% chance to win lottery (+50,000 baubles), 50% chance it creates a black hole (destroys 3 random items).',
        useInfo: 'Run cosmic simulation.',
        basePrice: null,
        sellPrice: 20000,
        type: 'collectible',
        category: 'computers',
        rarity: 'Epic'
    },
    alien_computer: {
        id: 'alien_computer',
        name: '👽 Extraterrestrial Terminal',
        emoji: '👽',
        description: '50% chance they beam up a target user (blocks them from commands for 5m), 50% chance they beam down space cargo (gives you 3 random items).',
        useInfo: 'Contact alien mothership.',
        basePrice: null,
        sellPrice: 45000,
        type: 'collectible',
        category: 'computers',
        rarity: 'Legendary'
    },

    // --- Boss Drops & Mythic Treasures ---
    dragon_egg: {
        id: 'dragon_egg',
        name: '🥚 Dragon Egg',
        emoji: '🥚',
        description: 'Hatch it! 35% chance a dragon hatches and robs everyone in the channel for 100-500 baubles each (gives to you), 65% chance it burns your wallet (you lose 5,000 baubles).',
        useInfo: 'Incubate and hatch the beast.',
        basePrice: null,
        sellPrice: 60000,
        type: 'collectible',
        category: 'mythic',
        rarity: 'Mythic'
    },
    void_star: {
        id: 'void_star',
        name: '⭐ Void Star',
        emoji: '⭐',
        description: 'Absorbs all status penalties (clears stench, bad luck, blind, shock, etc.), but 10% chance it devours all your titles!',
        useInfo: 'Consume to purge status effects.',
        basePrice: null,
        sellPrice: 75000,
        type: 'collectible',
        category: 'mythic',
        rarity: 'Mythic'
    },

    // --- Unique Items (Exactly 1 Copy Globally) ---
    the_one_ring: {
        id: 'the_one_ring',
        name: '💍 The One Ring',
        emoji: '💍',
        description: 'One ring to rule them all. Use it to go invisible (immune to rob / cannot rob others) for 1 hour.',
        useInfo: 'Use to activate invisibility (rob protection & lockout) for 1 hour.',
        basePrice: null,
        sellPrice: 150000,
        type: 'unique',
        category: 'unique',
        isUnique: true,
        rarity: 'Unique'
    },
    excalibur: {
        id: 'excalibur',
        name: '⚔️ Excalibur',
        emoji: '⚔️',
        description: 'The legendary sword of King Arthur. Use it to challenge someone to a high-noon duel!',
        useInfo: 'Use to duel another user (e.g. -use excalibur @User). Winner takes 500 Baubles.',
        basePrice: null,
        sellPrice: 150000,
        type: 'unique',
        category: 'unique',
        isUnique: true,
        rarity: 'Unique'
    },
    holy_grail: {
        id: 'holy_grail',
        name: '🏆 Holy Grail',
        emoji: '🏆',
        description: 'Cures all expedition injuries instantly and boosts income by +50% for 30 minutes. Made of wood?',
        useInfo: 'Use to cure injuries and receive a +50% income boost for 30 minutes.',
        basePrice: null,
        sellPrice: 150000,
        type: 'unique',
        category: 'unique',
        isUnique: true,
        rarity: 'Unique'
    },
    mona_lisa: {
        id: 'mona_lisa',
        name: '🖼️ Original Mona Lisa',
        emoji: '🖼️',
        description: 'Da Vinci\'s original masterpiece. Draw a mustache on it! Defaces it, reducing sell price to 10 baubles, but yields 10,000 baubles and the title "Art Vandal".',
        useInfo: 'Deface the masterpiece for internet points.',
        basePrice: null,
        sellPrice: 150000,
        type: 'unique',
        category: 'unique',
        isUnique: true,
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
            incomeMultiplier: 0.0
        }
    }
};

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
            if (baubleData.completedCollections.includes('rubber_duck')) {
                multiplier += 0.10;
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

async function isUniqueAvailable(itemId) {
    try {
        const owner = await Bauble.findOne({ 
            "inventory.itemId": itemId, 
            "inventory.quantity": { $gt: 0 } 
        }).lean();
        return !owner;
    } catch (err) {
        console.error('Error in isUniqueAvailable check:', err);
        return false;
    }
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
        if (candidate.isUnique) {
            const available = await isUniqueAvailable(candidate.id);
            if (available) {
                return candidate;
            } else {
                matchingItems = matchingItems.filter(i => i.id !== candidate.id);
                if (matchingItems.length === 0) break;
            }
        } else {
            return candidate;
        }
        attempts++;
    }

    return Object.values(ITEMS).find(item => item.id === 'rotten_banana');
}

function addItemToInventory(baubleData, itemId, quantity = 1) {
    if (!baubleData.inventory) baubleData.inventory = [];
    const existing = baubleData.inventory.find(i => i.itemId === itemId);
    if (existing) {
        existing.quantity += quantity;
    } else {
        baubleData.inventory.push({ itemId, quantity });
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
    removeItemFromInventory
};
