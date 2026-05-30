const Bauble = require('../models/baubleSchema');

// Rarities config with colors and weightings
const RARITIES = {
    Common: { name: 'Common', color: 0x95a5a6, weight: 500 },     // Gray
    Uncommon: { name: 'Uncommon', color: 0x2ecc71, weight: 300 }, // Green
    Rare: { name: 'Rare', color: 0x3498db, weight: 120 },         // Blue
    Epic: { name: 'Epic', color: 0x9b59b6, weight: 50 },          // Purple
    Legendary: { name: 'Legendary', color: 0xe67e22, weight: 20 },// Orange
    Mythic: { name: 'Mythic', color: 0xe74c3c, weight: 5 },       // Red
    Unique: { name: 'Unique', color: 0xf1c40f, weight: 1 }        // Gold (1 globally)
};

// Item Catalog
const ITEMS = {
    // --- Shop & Utility Boosters ---
    coffee: {
        id: 'coffee',
        name: '☕ Energizing Coffee',
        emoji: '☕',
        description: 'Halves work (10s -> 5s) and scavenge (10m -> 5m) cooldowns for 30 minutes.',
        basePrice: 15000,
        sellPrice: 7500,
        type: 'consumable',
        category: 'boosters',
        rarity: 'Common'
    },
    clover: {
        id: 'clover',
        name: '🍀 Lucky Clover',
        emoji: '🍀',
        description: 'Increases Coinflip and Gamble win rates by 10% for 15 minutes.',
        basePrice: 25000,
        sellPrice: 12500,
        type: 'consumable',
        category: 'boosters',
        rarity: 'Uncommon'
    },
    shield: {
        id: 'shield',
        name: '🛡️ Aegis Shield',
        emoji: '🛡️',
        description: 'Passive. Protects you from wager loss on your next failed Brawl duel (consumed on use).',
        basePrice: 60000,
        sellPrice: 30000,
        type: 'collectible',
        category: 'boosters',
        rarity: 'Rare'
    },
    mystery_box: {
        id: 'mystery_box',
        name: '📦 Mystery Box',
        emoji: '📦',
        description: 'Open to win Coffee, Clovers, Aegis Shields, or bonus Baubles.',
        basePrice: 20000,
        sellPrice: 10000,
        type: 'consumable',
        category: 'boosters',
        rarity: 'Common'
    },
    padlock: {
        id: 'padlock',
        name: '🔒 Safe Padlock',
        emoji: '🔒',
        description: 'Passive. Protects your wallet from being robbed once. Consumed on successful defense.',
        basePrice: 25000,
        sellPrice: 12500,
        type: 'collectible',
        category: 'boosters',
        rarity: 'Uncommon'
    },

    // --- Cosmetics & Premium Collectibles ---
    tag: {
        id: 'tag',
        name: '🏷️ Custom Tag',
        emoji: '🏷️',
        description: 'Cosmetic. Gives you a custom tag role in the server (ask an admin to apply!).',
        basePrice: 50000,
        sellPrice: null,
        type: 'collectible',
        category: 'cosmetics',
        giftable: false,
        rarity: 'Rare'
    },
    paintbrush: {
        id: 'paintbrush',
        name: '🎨 Profile Paintbrush',
        emoji: '🎨',
        description: 'Cosmetic tool. Required to customize profile banners (color and URL) using /profile-edit.',
        basePrice: 80000,
        sellPrice: 40000,
        type: 'collectible',
        category: 'cosmetics',
        rarity: 'Rare'
    },
    nugget: {
        id: 'nugget',
        name: '💎 Golden Nugget',
        emoji: '💎',
        description: 'A premium gold chunk. High value for selling back (150,000 Baubles) or gifting.',
        basePrice: 150000,
        sellPrice: 150000,
        type: 'collectible',
        category: 'cosmetics',
        rarity: 'Epic'
    },
    crown: {
        id: 'crown',
        name: '👑 Crown of Royalty',
        emoji: '👑',
        description: 'The ultimate status symbol of absolute wealth. Displays proudly in your inventory.',
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
        name: '💍 Silver Wedding Ring',
        emoji: '💍',
        description: 'A modest, affordable silver ring. Required to propose marriage to another user.',
        basePrice: 30000,
        sellPrice: 15000,
        type: 'collectible',
        category: 'family',
        rarity: 'Common'
    },
    ring_gold: {
        id: 'ring_gold',
        name: '💍 Gold Wedding Ring',
        emoji: '💍',
        description: 'A classic, gleaming gold ring. Required to propose marriage to another user.',
        basePrice: 100000,
        sellPrice: 50000,
        type: 'collectible',
        category: 'family',
        rarity: 'Rare'
    },
    ring_diamond: {
        id: 'ring_diamond',
        name: '💎 Diamond Wedding Ring',
        emoji: '💎',
        description: 'The ultimate symbol of love. A gorgeous diamond ring to propose marriage with.',
        basePrice: 300000,
        sellPrice: 150000,
        type: 'collectible',
        category: 'family',
        rarity: 'Epic'
    },
    adoption_papers: {
        id: 'adoption_papers',
        name: '📄 Adoption Papers',
        emoji: '📄',
        description: 'Official legal documents required to adopt a child and expand your family.',
        basePrice: 15000,
        sellPrice: 7500,
        type: 'consumable',
        category: 'family',
        rarity: 'Common'
    },

    // --- Dumpster Dive Loot ---
    broken_keyboard: {
        id: 'broken_keyboard',
        name: '⌨️ Broken Keyboard',
        emoji: '⌨️',
        description: 'A standard membrane keyboard missing half its keycaps.',
        basePrice: null,
        sellPrice: 150,
        type: 'junk',
        category: 'dumpster',
        rarity: 'Common'
    },
    rotten_banana: {
        id: 'rotten_banana',
        name: '🍌 Rotten Banana',
        emoji: '🍌',
        description: 'Flies are circling it. Why did you pick this up?',
        basePrice: null,
        sellPrice: 50,
        type: 'junk',
        category: 'dumpster',
        rarity: 'Common'
    },
    rabbits_feet: {
        id: 'rabbits_feet',
        name: '🐰 rabbits feet',
        emoji: '🐰',
        description: 'some say it brings luck, but the rabbit wasn\'t very lucky. yes, lowercase names for funny vibes.',
        basePrice: null,
        sellPrice: 8888,
        type: 'collectible',
        category: 'dumpster',
        rarity: 'Rare'
    },

    // --- Fishing Loot ---
    fish: {
        id: 'fish',
        name: '🐟 Fish',
        emoji: '🐟',
        description: 'A slimy, wriggling fish. Smells like fish.',
        basePrice: null,
        sellPrice: 300,
        type: 'fish',
        category: 'fishing',
        rarity: 'Common'
    },
    golden_fish: {
        id: 'golden_fish',
        name: '🐠 Golden Fish',
        emoji: '🐠',
        description: 'A gleaming fish that shimmers under water. Highly prized.',
        basePrice: null,
        sellPrice: 2500,
        type: 'fish',
        category: 'fishing',
        rarity: 'Rare'
    },
    treasure_chest: {
        id: 'treasure_chest',
        name: '🏴‍☠️ Treasure Chest',
        emoji: '🏴‍☠️',
        description: 'An old iron-bound chest covered in barnacles. Can be opened or sold.',
        basePrice: null,
        sellPrice: 10000,
        type: 'lootbox',
        category: 'fishing',
        rarity: 'Rare'
    },
    ancient_artifact: {
        id: 'ancient_artifact',
        name: '🏺 Ancient Artifact',
        emoji: '🏺',
        description: 'A beautifully preserved clay urn from a forgotten era.',
        basePrice: null,
        sellPrice: 12000,
        type: 'collectible',
        category: 'fishing',
        rarity: 'Epic'
    },

    // --- Dig Loot ---
    fossil_shell: {
        id: 'fossil_shell',
        name: '🐚 Fossilized Shell',
        emoji: '🐚',
        description: 'A shell fossil from a prehistoric ocean floor.',
        basePrice: null,
        sellPrice: 800,
        type: 'collectible',
        category: 'digging',
        rarity: 'Uncommon'
    },
    ancient_bone: {
        id: 'ancient_bone',
        name: '🦴 Ancient Bone',
        emoji: '🦴',
        description: 'A large, heavy bone. Might belong to a mammoth or a very big dog.',
        basePrice: null,
        sellPrice: 1200,
        type: 'collectible',
        category: 'digging',
        rarity: 'Uncommon'
    },
    t_rex_skull: {
        id: 't_rex_skull',
        name: '🦖 T-Rex Skull',
        emoji: '🦖',
        description: 'The massive skull of a Tyrannosaurus Rex. Rawr!',
        basePrice: null,
        sellPrice: 15000,
        type: 'collectible',
        category: 'digging',
        rarity: 'Epic'
    },

    // --- Meme Hunt Loot ---
    common_meme: {
        id: 'common_meme',
        name: '🐸 Common Meme',
        emoji: '🐸',
        description: 'A generic meme that you see in everyday chat channels.',
        basePrice: null,
        sellPrice: 200,
        type: 'meme',
        category: 'memehunt',
        rarity: 'Common'
    },
    dead_meme: {
        id: 'dead_meme',
        name: '💀 Dead Meme',
        emoji: '💀',
        description: 'A vintage meme that nobody finds funny anymore. Rage comics style.',
        basePrice: null,
        sellPrice: 100,
        type: 'meme',
        category: 'memehunt',
        rarity: 'Common'
    },
    ancient_meme: {
        id: 'ancient_meme',
        name: '📜 Ancient Meme',
        emoji: '📜',
        description: 'A legendary classic from the early days of the internet.',
        basePrice: null,
        sellPrice: 1500,
        type: 'meme',
        category: 'memehunt',
        rarity: 'Uncommon'
    },
    legendary_meme: {
        id: 'legendary_meme',
        name: '👑 Legendary Meme',
        emoji: '👑',
        description: 'A absolute masterpiece of internet culture. High tier meme.',
        basePrice: null,
        sellPrice: 5000,
        type: 'meme',
        category: 'memehunt',
        rarity: 'Epic'
    },

    // --- Rubber Duck Collection ---
    rubber_duck: {
        id: 'rubber_duck',
        name: '🦆 Rubber Duck',
        emoji: '🦆',
        description: 'A friendly yellow bath toy. Squeaks when pressed.',
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
        description: 'A shiny duck plated in 24k gold. Squeaks in luxury.',
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
        description: 'Comes with a tiny eyepatch and tricorn hat. Arrr, squeak!',
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
        description: 'Equipped with a tiny space suit. Ready for orbit.',
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
        description: 'Radiates celestial energy. A duck of the gods.',
        basePrice: null,
        sellPrice: 35000,
        type: 'collectible',
        category: 'ducks',
        rarity: 'Legendary'
    },

    // --- Computer Collection ---
    broken_laptop: {
        id: 'broken_laptop',
        name: '💻 Broken Laptop',
        emoji: '💻',
        description: 'The screen is cracked and it won\'t turn on.',
        basePrice: null,
        sellPrice: 1000,
        type: 'collectible',
        category: 'computers',
        rarity: 'Uncommon'
    },
    gaming_pc: {
        id: 'gaming_pc',
        name: '🖥️ Gaming PC',
        emoji: '🖥️',
        description: 'Packed with RGB lights and a powerful graphics card. Can run Minecraft at 1000 FPS.',
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
        description: 'Calculates states in qubits. Supercooled and extremely advanced.',
        basePrice: null,
        sellPrice: 20000,
        type: 'collectible',
        category: 'computers',
        rarity: 'Epic'
    },
    alien_computer: {
        id: 'alien_computer',
        name: '👽 Alien Computer',
        emoji: '👽',
        description: 'Constructed from technology beyond human comprehension.',
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
        description: 'A massive, warm egg covered in dark scales. Extremely rare boss drop!',
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
        description: 'A star that burns with darkness. Extremely rare drop!',
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
        description: 'One ring to rule them all. Only a single copy exists in Nishanka.',
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
        description: 'The legendary sword of King Arthur. Only a single copy exists in Nishanka.',
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
        description: 'A cup possessing miraculous powers. Only a single copy exists in Nishanka.',
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
        description: 'Da Vinci\'s original masterpiece. Only a single copy exists in Nishanka.',
        basePrice: null,
        sellPrice: 150000,
        type: 'unique',
        category: 'unique',
        isUnique: true,
        rarity: 'Unique'
    }
};

// Collections Catalog
const COLLECTIONS = {
    rubber_duck: {
        id: 'rubber_duck',
        name: '🦆 Rubber Duck Collection',
        description: 'Collect all the legendary rubber ducks!',
        items: ['rubber_duck', 'golden_duck', 'pirate_duck', 'space_duck', 'divine_duck'],
        reward: {
            title: 'Duck Master',
            baubles: 15000,
            incomeMultiplier: 0.10 // +10% income
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
            incomeMultiplier: 0.0 // Just status title and bauble rewards!
        }
    }
};

// Helper Functions

/**
 * Checks if user completed any new collections and awards titles/baubles.
 */
async function checkCollections(baubleData) {
    if (!baubleData.completedCollections) baubleData.completedCollections = [];
    if (!baubleData.titles) baubleData.titles = [];

    const unlockedTitles = [];
    const unlockedCollections = [];

    for (const [colId, col] of Object.entries(COLLECTIONS)) {
        if (baubleData.completedCollections.includes(colId)) continue;

        // Check if user has all items in the collection
        const hasAll = col.items.every(itemId => {
            const invItem = baubleData.inventory.find(i => i.itemId === itemId);
            return invItem && invItem.quantity > 0;
        });

        if (hasAll) {
            baubleData.completedCollections.push(colId);
            unlockedCollections.push(col.name);

            // Grant title
            if (col.reward.title) {
                if (!baubleData.titles.includes(col.reward.title)) {
                    baubleData.titles.push(col.reward.title);
                    unlockedTitles.push(col.reward.title);
                }
            }

            // Grant Baubles
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

/**
 * Gets the user's permanent income multiplier.
 */
async function getIncomeMultiplier(userId) {
    try {
        const baubleData = await Bauble.findOne({ userId }).lean();
        if (!baubleData) return 1.0;

        let multiplier = 1.0;
        if (baubleData.completedCollections) {
            if (baubleData.completedCollections.includes('rubber_duck')) {
                multiplier += 0.10; // +10%
            }
        }
        return multiplier;
    } catch (err) {
        console.error('Error in getIncomeMultiplier:', err);
        return 1.0;
    }
}

/**
 * Check if a Unique item is available (meaning NO user owns it with quantity > 0).
 */
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

/**
 * Resolve item drops from a pools configuration.
 * pools looks like: { rarityProbabilities: { Common: 0.5, ... }, allowedCategories: ['fishing'] }
 */
async function rollItemDrop(allowedCategories = []) {
    // 1. Pick a rarity based on weights
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

    // 2. Filter item catalog for this rarity and categories
    let matchingItems = Object.values(ITEMS).filter(item => {
        if (item.rarity !== selectedRarity) return false;
        if (allowedCategories.length > 0 && !allowedCategories.includes(item.category)) return false;
        // Don't drop purchasable boosters/wedding rings/adoption papers as raw game drops
        if (item.basePrice !== null && (item.category === 'boosters' || item.category === 'family')) return false;
        return true;
    });

    // Fallback if no matching items in this rarity
    if (matchingItems.length === 0) {
        matchingItems = Object.values(ITEMS).filter(item => {
            if (allowedCategories.length > 0 && !allowedCategories.includes(item.category)) return false;
            if (item.basePrice !== null && (item.category === 'boosters' || item.category === 'family')) return false;
            return item.rarity === 'Common' || item.rarity === 'Uncommon';
        });
    }

    if (matchingItems.length === 0) return null;

    // 3. Select an item. If it's a Unique item, verify its global availability.
    // If not available, fallback to a non-unique from matchingItems or basic drop.
    let attempts = 0;
    while (attempts < 5) {
        const candidate = matchingItems[Math.floor(Math.random() * matchingItems.length)];
        if (candidate.isUnique) {
            const available = await isUniqueAvailable(candidate.id);
            if (available) {
                return candidate;
            } else {
                // Remove from local options to avoid re-rolling, retry
                matchingItems = matchingItems.filter(i => i.id !== candidate.id);
                if (matchingItems.length === 0) break;
            }
        } else {
            return candidate;
        }
        attempts++;
    }

    // Ultimate fallback if unique check failed and no alternatives
    return Object.values(ITEMS).find(item => item.id === 'rotten_banana');
}

/**
 * Add item to inventory helper.
 */
function addItemToInventory(baubleData, itemId, quantity = 1) {
    if (!baubleData.inventory) baubleData.inventory = [];
    const existing = baubleData.inventory.find(i => i.itemId === itemId);
    if (existing) {
        existing.quantity += quantity;
    } else {
        baubleData.inventory.push({ itemId, quantity });
    }
}

/**
 * Remove item from inventory helper.
 */
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
