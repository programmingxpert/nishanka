/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Bauble = require('../../models/baubleSchema');
const Family = require('../../models/familySchema');
const GlobalEconomy = require('../../models/GlobalEconomy');
const { ITEMS } = require('../../utils/items');

function addItem(baubleData, itemId, quantity = 1) {
    if (!baubleData.inventory) baubleData.inventory = [];
    const existing = baubleData.inventory.find(i => i.itemId === itemId);
    if (existing) {
        existing.quantity += quantity;
    } else {
        baubleData.inventory.push({ itemId, quantity });
    }
}

function removeItem(baubleData, itemId, quantity = 1) {
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
    category: 'economy',
    data: new SlashCommandBuilder()
        .setName('use')
        .setDescription('Activate or consume an item from your inventory.')
        .addStringOption(option =>
            option.setName('item')
                .setDescription('The ID of the item to use')
                .setRequired(true))
        .addUserOption(option =>
            option.setName('target')
                .setDescription('Target user (if the item requires one)')
                .setRequired(false)),

    async execute(interaction) {
        try {
            const userId = interaction.user.id;
            const itemId = interaction.options.getString('item').trim().toLowerCase();
            const targetUser = interaction.options.getUser('target');

            const res = await processItemUse(userId, itemId, targetUser, interaction.client, interaction.channel, interaction);
            if (!res.success) {
                return interaction.reply({ content: res.msg, ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setColor(res.color)
                .setTitle('🎒 Item Activated')
                .setDescription(res.msg)
                .setTimestamp()
                .setFooter({ text: 'Nishanka Interactive Inventory' });

            return interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in use slash command:', error);
            await interaction.reply({ content: '❌ An error occurred while using this item.', ephemeral: true });
        }
    },

    async executePrefix(message, args) {
        try {
            const userId = message.author.id;
            const itemId = args[0]?.toLowerCase();

            if (!itemId) {
                return message.reply(`⚠️ Please specify an item ID to use. Example: \`-use coffee\`. Options: \`${Object.keys(ITEMS).join(', ')}\``);
            }

            const targetUser = message.mentions.users.first();
            const res = await processItemUse(userId, itemId, targetUser, message.client, message.channel, message);

            if (!res.success) {
                return message.reply(res.msg);
            }

            const embed = new EmbedBuilder()
                .setColor(res.color)
                .setTitle('🎒 Item Activated')
                .setDescription(res.msg)
                .setTimestamp()
                .setFooter({ text: 'Nishanka Interactive Inventory' });

            return message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in use prefix command:', error);
            await message.reply('❌ An error occurred while using this item.');
        }
    }
};

async function processItemUse(userId, itemId, targetUser, client, channel, context) {
    if (!ITEMS[itemId]) {
        return { success: false, msg: `❌ Invalid item ID. Choose from: \`${Object.keys(ITEMS).join(', ')}\`` };
    }

    const baubleData = await Bauble.findOne({ userId });
    if (!baubleData) {
        return { success: false, msg: '❌ You do not have any items in your inventory.' };
    }

    // Check if blinded
    const now = Date.now();
    if (baubleData.blindedExpiresAt && now < new Date(baubleData.blindedExpiresAt).getTime()) {
        const left = Math.ceil((new Date(baubleData.blindedExpiresAt).getTime() - now) / 1000);
        return { success: false, msg: `🙈 **You are blinded!** Toxic neon paint is in your eyes. You cannot use items for another **${left}s**!` };
    }

    // Check if laptop shocked
    if (baubleData.itemLockoutExpiresAt && now < new Date(baubleData.itemLockoutExpiresAt).getTime()) {
        const left = Math.ceil((new Date(baubleData.itemLockoutExpiresAt).getTime() - now) / 1000);
        return { success: false, msg: `⚡ **You are paralyzed!** That e-waste laptop shocked your fingers. Wait **${left}s** to recover.` };
    }

    const hasItem = baubleData.inventory && baubleData.inventory.some(i => i.itemId === itemId && i.quantity > 0);
    if (!hasItem) {
        return { success: false, msg: `❌ You do not own any **${ITEMS[itemId].name}**.` };
    }

    let msg = '';
    let color = 0x3498DB;
    let shouldSave = true;

    // Resolve Custom Interactions
    if (itemId === 'coffee') {
        removeItem(baubleData, 'coffee', 1);
        baubleData.coffeeExpiresAt = new Date(Date.now() + 1800000); // 30 minutes
        
        const roll = Math.random();
        if (roll < 0.05) {
            // Despair crash
            baubleData.workStenchExpiresAt = new Date(Date.now() + 120000); // 2m work lockout
            msg = '☕ You drank the **☕ Depresso Espresso**... but it was expired and made of sadness! \n\n🤢 You crashed into a deep despair and cannot work (`-work`) for the next 2 minutes!';
            color = 0x8B0000;
        } else if (roll < 0.15) {
            // Jittery hands
            baubleData.grailIncomeExpiresAt = new Date(Date.now() + 600000); // 10 minutes grail income boost (+50%)
            msg = '☕ You drank the **☕ Depresso Espresso**! Cooldowns halved for 30m.\n\n⚡ **JITTERY HANDS:** You got a huge caffeine high! You receive a **+50% income boost** on all commands for 10 minutes!';
            color = 0xF1C40F;
        } else {
            msg = '☕ You drank the **☕ Depresso Espresso**! Your `/work` and `/scavenge` cooldowns are reduced by 50% for the next 30 minutes. It tasted like battery acid and regrets.';
            color = 0xE67E22;
        }

    } else if (itemId === 'clover') {
        removeItem(baubleData, 'clover', 1);
        baubleData.luckExpiresAt = new Date(Math.floor((Date.now() + 900000) / 10) * 10); // 15 minutes, ends in 0
        baubleData.luckPenaltyExpiresAt = null; // Clear bad luck
        
        const roll = Math.random();
        if (roll < 0.05) {
            baubleData.baubles += 100;
            msg = '🍀 You swallowed the **🍀 Mutant Four-Leaf Clover**! Coinflip/Gamble win rates boosted +10% for 15m.\n\n🧬 **MUTATION:** You grow an extra toe and stub it against a loose brick, finding **100 Baubles** on the floor!';
            color = 0x2ECC71;
        } else {
            msg = '🍀 You rubbed the **🍀 Mutant Four-Leaf Clover**! Your Coinflip and Gamble win rates are boosted by **+10%** for 15 minutes!';
            color = 0x2ECC71;
        }

    } else if (itemId === 'shield') {
        removeItem(baubleData, 'shield', 1);
        baubleData.shieldExpiresAt = new Date(Date.now() + 1800000); // 30 minutes
        msg = '🛡️ You activated the **🛡️ Cardboard Aegis Shield**! You are completely immune to all robberies and duels for 30 minutes! However, you are locked out of robbing others during this time.';
        color = 0x3498DB;

    } else if (itemId === 'mystery_box') {
        removeItem(baubleData, 'mystery_box', 1);
        const rng = Math.random();
        if (rng < 0.2) {
            const bonus = Math.floor(Math.random() * 301) + 100;
            baubleData.baubles += bonus;
            msg = `📦 You popped open the **Disappointment Box** and found **${bonus.toLocaleString()}** Glimmering Baubles! Better than nothing.`;
            color = 0x9B59B6;
        } else if (rng < 0.4) {
            addItem(baubleData, 'coffee', 1);
            msg = '📦 You popped open the **Disappointment Box** and discovered a cup of stale **☕ Depresso Espresso**!';
            color = 0x9B59B6;
        } else if (rng < 0.6) {
            addItem(baubleData, 'clover', 1);
            msg = '📦 You popped open the **Disappointment Box** and found a lucky **🍀 Mutant Four-Leaf Clover**!';
            color = 0x2ECC71;
        } else if (rng < 0.7) {
            addItem(baubleData, 'shield', 1);
            msg = '📦 You popped open the **Disappointment Box** and pulled out a **🛡️ Cardboard Aegis Shield**!';
            color = 0x3498DB;
        } else {
            // Funny junk roll
            const items = [
                'a lint roller covered in golden retriever fur',
                'a coupon for a free high-five (expired in 1997)',
                'a half-eaten sandwich with teeth marks that do not match yours',
                'a DVD copy of Shrek 3 with a scratch that loops the donkey monologue',
                'a single unmatched neon green sock'
            ];
            const junk = items[Math.floor(Math.random() * items.length)];
            msg = `📦 You popped open the **Disappointment Box** and found... **${junk}**. That is it. Absolutely useless.`;
            color = 0x7F8C8D;
        }

    } else if (itemId === 'padlock') {
        removeItem(baubleData, 'padlock', 1);
        baubleData.padlockedExpiresAt = new Date(Date.now() + 1800000); // 30 minutes
        msg = '🔒 You locked yourself in a vault with the **🔒 Toddler-Proof Safe Padlock**!\n\nYou are immune to all robberies and duels for 30 minutes, but you cannot run `-work` or `-scavenge` during this time because you locked yourself in.';
        color = 0xE67E22;

    } else if (itemId === 'tag') {
        if (!targetUser) {
            targetUser = { id: userId, username: 'yourself' };
        }
        
        let targetData = await Bauble.findOne({ userId: targetUser.id });
        if (!targetData) {
            targetData = new Bauble({ userId: targetUser.id });
        }

        const tags = ['Certified Bozo', 'Smelly Loser', 'Professional Clown', 'Absolute Legend', 'Lover of Ducks', 'Tax Evader'];
        const tagText = tags[Math.floor(Math.random() * tags.length)];

        removeItem(baubleData, 'tag', 1);
        targetData.activeTitle = tagText;
        if (!targetData.titles.includes(tagText)) {
            targetData.titles.push(tagText);
        }
        await targetData.save();

        msg = `🏷️ You taped a **Dumb Custom Tag** onto **${targetUser.username}**'s head!\n\nThey now have the active title: **"${tagText}"**!`;
        color = 0x9B59B6;

    } else if (itemId === 'paintbrush') {
        if (!targetUser) {
            return { success: false, msg: '🎨 You must target someone to paint! Usage: `-use paintbrush @User`', ephemeral: true };
        }
        if (targetUser.id === userId) {
            return { success: false, msg: '🎨 Why would you paint your own eyes? That is ridiculous.', ephemeral: true };
        }

        let targetData = await Bauble.findOne({ userId: targetUser.id });
        if (!targetData) targetData = new Bauble({ userId: targetUser.id });

        if (targetData.invisibilityExpiresAt && Date.now() < new Date(targetData.invisibilityExpiresAt).getTime()) {
            return { success: false, msg: `❌ **${targetUser.username}** is invisible! You paint the air where they stood.`, ephemeral: true };
        }
        if (targetData.shieldExpiresAt && Date.now() < new Date(targetData.shieldExpiresAt).getTime()) {
            return { success: false, msg: `🛡️ **${targetUser.username}** has a cardboard shield active! The paint splashes harmlessly off the barrier.`, ephemeral: true };
        }

        removeItem(baubleData, 'paintbrush', 1);
        targetData.blindedExpiresAt = new Date(Date.now() + 300000); // 5 minutes
        await targetData.save();

        msg = `🎨 **SPLASH!** You threw neon paint in **${targetUser.username}**'s eyes! \n\nThey are **blinded for 5 minutes** and cannot view their profile/inventory or use items!`;
        color = 0x2ECC71;

    } else if (itemId === 'nugget') {
        removeItem(baubleData, 'nugget', 1);
        const roll = Math.random();
        if (roll < 0.50) {
            // Success: get a random legendary/mythic item
            const pool = Object.values(ITEMS).filter(item => item.rarity === 'Legendary' || item.rarity === 'Mythic');
            const rolled = pool[Math.floor(Math.random() * pool.length)];
            addItem(baubleData, rolled.id, 1);
            msg = `💎 You bribed the digital gods with the **💎 Shiny Golden Nugget**! \n\nThey accepted your offering and dropped a **${rolled.name}** into your bag!`;
            color = 0xF1C40F;
        } else {
            // Failure: 12 hour daily/weekly lockout
            baubleData.bribedLockoutExpiresAt = new Date(Date.now() + 43200000); // 12 hours
            msg = `💎 You offered the **💎 Shiny Golden Nugget** to the bot... \n\n🤖 The bot swiped it, spit on the ground, called you a nerd, and locked you out of daily/weekly commands for the next **12 hours**!`;
            color = 0xE74C3C;
        }

    } else if (itemId === 'crown') {
        removeItem(baubleData, 'crown', 1);
        const roll = Math.random();
        if (roll < 0.50) {
            // Success: tax 50 baubles from up to 3 random users in channel
            let victims = [];
            try {
                const members = channel.members.filter(m => !m.user.bot && m.user.id !== userId);
                const candidates = members.random(5);
                for (const member of candidates) {
                    if (victims.length >= 3) break;
                    let victimData = await Bauble.findOne({ userId: member.user.id });
                    if (victimData && victimData.baubles >= 50) {
                        victimData.baubles -= 50;
                        await victimData.save();
                        victims.push(member.user);
                    }
                }
            } catch (_) {}

            if (victims.length > 0) {
                const totalTax = victims.length * 50;
                baubleData.baubles += totalTax;
                msg = `👑 You put on the **👑 Paper Burger Crown** and declared yourself the Ruler! \n\n💂 You collected a **50 Bauble** crown tax from: ${victims.map(u => `**${u.username}**`).join(', ')} (Earned **${totalTax}** Baubles)!`;
                color = 0xF1C40F;
            } else {
                msg = `👑 You put on the **👑 Paper Burger Crown** and declared yourself Ruler, but everyone in the channel is dirt poor or ignored you. You got no taxes.`;
                color = 0x7F8C8D;
            }
        } else {
            // Overthrown: lose 2000 baubles
            const fine = Math.min(baubleData.baubles, 2000);
            baubleData.baubles -= fine;
            baubleData.activeTitle = 'Royal Fraud';
            if (!baubleData.titles.includes('Royal Fraud')) {
                baubleData.titles.push('Royal Fraud');
            }
            msg = `👑 You put on the **👑 Paper Burger Crown** and tried to declare yourself King, but the channel citizens immediately threw tomatoes at you! \n\n💥 You were overthrown, lost **${fine} Baubles**, and have been branded the **"Royal Fraud"**!`;
            color = 0xE74C3C;
        }

    } else if (itemId === 'adoption_papers') {
        if (!targetUser) {
            return { success: false, msg: '📄 Adoption requires a target child! Usage: `-use adoption_papers @User`', ephemeral: true };
        }
        if (targetUser.id === userId) {
            return { success: false, msg: '📄 You cannot adopt yourself. That is not how family law works.', ephemeral: true };
        }

        let parentFam = await Family.findOne({ userId });
        if (!parentFam) parentFam = new Family({ userId });
        let childFam = await Family.findOne({ userId: targetUser.id });
        if (!childFam) childFam = new Family({ userId: targetUser.id });

        if (parentFam.children.includes(targetUser.id)) {
            return { success: false, msg: `❌ **${targetUser.username}** is already your child!`, ephemeral: true };
        }

        removeItem(baubleData, 'adoption_papers', 1);
        parentFam.children.push(targetUser.id);
        childFam.parents.push(userId);
        await parentFam.save();
        await childFam.save();

        msg = `📄 **CONGRATULATIONS!** You have legally adopted **${targetUser.username}**! \n\nYou are now their legal guardian. You will automatically receive a **5% cut** of their \`/work\` earnings for child labor!`;
        color = 0x2ECC71;

    } else if (itemId === 'broken_keyboard') {
        removeItem(baubleData, 'broken_keyboard', 1);
        const chars = 'ASDFJKL;QWERTYUIOPZXCVBNM!@#$%';
        let smash = '';
        for (let i = 0; i < 25; i++) smash += chars[Math.floor(Math.random() * chars.length)];

        const rng = Math.random();
        if (rng < 0.15) {
            // Jackpot — somehow wrote a viral post
            const coins = Math.floor(Math.random() * 2001) + 1000; // 1000-3000
            baubleData.baubles += coins;
            msg = `⌨️ You rage-smash the **⌨️ Broken Keyboard**: \`*${smash}!*\`\n\n🤩 **ACCIDENTAL VIRAL POST!** Discord somehow auto-posted that gibberish and it got 40k likes. The ad revenue rolls in — you pocket **${coins.toLocaleString()} Baubles**!`;
            color = 0xf1c40f;
        } else if (rng < 0.55) {
            // Standard loose change
            const coins = Math.floor(Math.random() * 201) + 100; // 100-300
            baubleData.baubles += coins;
            msg = `⌨️ You slam your fists on the **⌨️ Broken Keyboard**: \`*${smash}!*\`\n\n💸 A cascade of dust and **${coins} Baubles** rattle loose from under the keycaps!`;
            color = 0x2ecc71;
        } else if (rng < 0.80) {
            // Nothing useful
            msg = `⌨️ You slam your hands on the **⌨️ Broken Keyboard**: \`*${smash}!*\`\n\nCrumbs, two keycaps, and a USB stick with 37 renamed copies of a Rick Astley MP3 fall out. Absolutely nothing useful.`;
            color = 0x7f8c8d;
        } else {
            // Self-shock
            baubleData.itemLockoutExpiresAt = new Date(Date.now() + 120000); // 2 min lockout
            msg = `⌨️ You slam the **⌨️ Broken Keyboard**: \`*${smash}!*\`\n\n⚡ **ZAP!** A stray exposed wire zaps your hands! You drop it and your fingers won't cooperate for the next **2 minutes**.`;
            color = 0xe74c3c;
        }

    } else if (itemId === 'rotten_banana') {
        if (!targetUser) {
            return { success: false, msg: '🍌 Throwing a rotten banana requires a target! Usage: `-use rotten_banana @User`', ephemeral: true };
        }
        if (targetUser.id === userId) {
            return { success: false, msg: '🍌 Why would you throw a rotten banana at yourself? Don\'t do that.', ephemeral: true };
        }

        let targetData = await Bauble.findOne({ userId: targetUser.id });
        if (!targetData) targetData = new Bauble({ userId: targetUser.id });

        if (targetData.invisibilityExpiresAt && Date.now() < new Date(targetData.invisibilityExpiresAt).getTime()) {
            return { success: false, msg: `❌ **${targetUser.username}** is invisible! The banana flies right through their shadow.`, ephemeral: true };
        }
        if (targetData.shieldExpiresAt && Date.now() < new Date(targetData.shieldExpiresAt).getTime()) {
            return { success: false, msg: `🛡️ **${targetUser.username}** is shielding! The rotten banana splats harmlessly off their cardboard wall.`, ephemeral: true };
        }

        removeItem(baubleData, 'rotten_banana', 1);
        // Lock their work for 5 minutes AND steal some baubles from the shock
        targetData.workStenchExpiresAt = new Date(Date.now() + 300000); // 5 minutes
        const slipSteal = Math.min(targetData.baubles, Math.floor(Math.random() * 201) + 100); // 100-300
        targetData.baubles -= slipSteal;
        baubleData.baubles += slipSteal;
        await targetData.save();

        msg = `🍌 **SPLAT!** You lobbed a **Stinky Rotten Banana** directly at **${targetUser.username}**!\n\n🪰 They're covered in flies, coated in banana sludge, and dropped **${slipSteal} Baubles** while slipping! They also can't run \`-work\` for the next **5 minutes**!`;
        color = 0x8b5a2b;

    } else if (itemId === 'rabbits_feet') {
        removeItem(baubleData, 'rabbits_feet', 1);
        // Always lucky — tiered good outcomes only
        baubleData.luckExpiresAt = new Date(Math.floor((Date.now() + 600000) / 10) * 10 + 5); // 10m rabbit foot luck (ends in 5)
        baubleData.luckPenaltyExpiresAt = null; // Clear any existing bad luck
        const rng = Math.random();
        if (rng < 0.10) {
            // Jackpot tier — huge cash windfall
            const windfall = Math.floor(Math.random() * 3001) + 2000; // 2000-5000
            baubleData.baubles += windfall;
            msg = `🐰 You rub the **🐰 Unlucky Rabbit Foot**... wait, why is it glowing?\n\n🌟 **MEGA LUCK!** You find **${windfall.toLocaleString()} Baubles** folded inside it, a +15% luck boost for 10 minutes, AND your existing bad luck was nuked! The rabbit was loaded this whole time!`;
            color = 0xf1c40f;
        } else if (rng < 0.35) {
            // Mid tier — luck boost + clear penalty + bonus item
            const bonusItems = ['coffee', 'clover', 'mystery_box'];
            const bonus = bonusItems[Math.floor(Math.random() * bonusItems.length)];
            addItem(baubleData, bonus, 1);
            msg = `🐰 You rub the **🐰 Unlucky Rabbit Foot** and feel a warm tingle run up your arm!\n\n✨ **LUCKY STREAK!** You get a **+15% luck boost for 10 minutes**, your bad luck penalty was cancelled, AND a **${ITEMS[bonus].name}** fell out of the fur!`;
            color = 0x2ecc71;
        } else {
            // Standard tier — pure luck boost
            msg = `🐰 You rub the **🐰 Unlucky Rabbit Foot** and hear a soft *click* of good fortune!\n\n🍀 **Lucky!** You have **+15% luck** on all Coinflip and Gamble actions for the next 10 minutes. Bad luck cleared!`;
            color = 0xf1c40f;
        }

    } else if (itemId === 'fish') {
        if (!targetUser) {
            return { success: false, msg: '🐟 Slapping requires a target user! Usage: `-use fish @User`', ephemeral: true };
        }
        
        let targetData = await Bauble.findOne({ userId: targetUser.id });
        if (!targetData) targetData = new Bauble({ userId: targetUser.id });

        if (targetData.invisibilityExpiresAt && Date.now() < new Date(targetData.invisibilityExpiresAt).getTime()) {
            return { success: false, msg: `❌ **${targetUser.username}** is invisible! You slap the empty air.`, ephemeral: true };
        }
        if (targetData.shieldExpiresAt && Date.now() < new Date(targetData.shieldExpiresAt).getTime()) {
            return { success: false, msg: `🛡️ **${targetUser.username}** is shielding! Your fish slaps their cardboard shield and bruises your hand instead.`, ephemeral: true };
        }

        removeItem(baubleData, 'fish', 1);
        const stolen = Math.min(targetData.baubles, Math.floor(Math.random() * 101) + 50); // 50-150 baubles
        
        targetData.baubles -= stolen;
        baubleData.baubles += stolen;
        await targetData.save();

        msg = `🐟 **SLAP!** You grabbed the slimy **Wet Fish** by the tail and slapped **${targetUser.username}** across the face! \n\nThey drop **${stolen} Baubles** out of pure shock, which you quickly pocket!`;
        color = 0x95A5A6;

    } else if (itemId === 'golden_fish') {
        removeItem(baubleData, 'golden_fish', 1);
        const roll = Math.random();
        if (roll < 0.50) {
            const pool = Object.values(ITEMS).filter(item => ['dumpster', 'fishing', 'digging', 'memehunt'].includes(item.category) && !item.isUnique);
            const rolled = pool[Math.floor(Math.random() * pool.length)];
            addItem(baubleData, rolled.id, 1);
            msg = `🐠 You fed the **Radioactive Golden Fish** some fish flakes... \n\n✨ It swam in a circle and pooped out a **${rolled.name}**! How magical!`;
            color = 0xF1C40F;
        } else {
            const bill = 200;
            baubleData.baubles = Math.max(0, baubleData.baubles - bill);
            msg = `🐠 You tried to feed the **Radioactive Golden Fish**... \n\n🩸 **SNAP!** It bit your finger! You run to the clinic and pay a **${bill} Bauble** medical bill.`;
            color = 0xE74C3C;
        }

    } else if (itemId === 'treasure_chest') {
        removeItem(baubleData, 'treasure_chest', 1);
        const coins = Math.floor(Math.random() * 5001) + 3000; // 3000-8000 baubles
        baubleData.baubles += coins;

        // Give 2 random items including at least one rare-tier booster
        const rarePool = ['shield', 'padlock', 'clover', 'rabbits_feet', 'golden_fish'];
        const commonPool = ['coffee', 'mystery_box', 'rotten_banana', 'broken_keyboard'];
        const item1 = rarePool[Math.floor(Math.random() * rarePool.length)];
        const item2 = commonPool[Math.floor(Math.random() * commonPool.length)];
        addItem(baubleData, item1, 1);
        addItem(baubleData, item2, 1);

        msg = `🏴‍☠️ You crowbar open the barnacle-crusted **Barnacle-Covered Chest**!\n\n💰 Inside you find **${coins.toLocaleString()} Baubles**, a **${ITEMS[item1].name}**, and a **${ITEMS[item2].name}**! Not bad for a fisherman's haul!`;
        color = 0xf1c40f;

    } else if (itemId === 'ancient_artifact') {
        removeItem(baubleData, 'ancient_artifact', 1);
        let victim = null;
        try {
            const members = channel.members.filter(m => !m.user.bot && m.user.id !== userId);
            const randomMember = members.random();
            if (randomMember) victim = randomMember.user;
        } catch (_) {}

        if (victim) {
            let victimData = await Bauble.findOne({ userId: victim.id });
            if (!victimData) victimData = new Bauble({ userId: victim.id });
            
            const loot = Math.min(victimData.baubles, Math.floor(Math.random() * 401) + 100); // 100-500 baubles
            victimData.baubles -= loot;
            baubleData.baubles += loot;
            await victimData.save();

            msg = `🏺 You opened the **Cursed Urn**! Dial-up sounds echoed through the channel. \n\n🧟 A digital mummy rose, raided **${victim.username}**'s pockets, stole **${loot} Baubles**, and handed them to you!`;
            color = 0x9B59B6;
        } else {
            msg = `🏺 You opened the **Cursed Urn**! Dial-up sounds echoed through the channel, but no other users were found. The curse faded into the void.`;
            color = 0x7F8C8D;
        }

    } else if (itemId === 'fossil_shell') {
        if (!targetUser) {
            return { success: false, msg: '🐚 Scanning requires a target! Usage: `-use fossil_shell @User`', ephemeral: true };
        }
        let targetData = await Bauble.findOne({ userId: targetUser.id });
        if (!targetData) targetData = new Bauble({ userId: targetUser.id });

        const nowTime = Date.now();
        
        // Consume the shell
        removeItem(baubleData, 'fossil_shell', 1);
        shouldSave = true;

        const scanLines = [];
        scanLines.push(`👛 **Wallet:** **${targetData.baubles.toLocaleString()}** Baubles`);

        // Full status dump
        if (targetData.invisibilityExpiresAt && nowTime < new Date(targetData.invisibilityExpiresAt).getTime()) {
            const ts = Math.floor(new Date(targetData.invisibilityExpiresAt).getTime() / 1000);
            scanLines.push(`💍 **Invisible** — expires <t:${ts}:R>`);
        }
        if (targetData.shieldExpiresAt && nowTime < new Date(targetData.shieldExpiresAt).getTime()) {
            const ts = Math.floor(new Date(targetData.shieldExpiresAt).getTime() / 1000);
            scanLines.push(`🛡️ **Shield** — expires <t:${ts}:R>`);
        }
        if (targetData.coffeeExpiresAt && nowTime < new Date(targetData.coffeeExpiresAt).getTime()) {
            const ts = Math.floor(new Date(targetData.coffeeExpiresAt).getTime() / 1000);
            scanLines.push(`☕ **Espresso Boost** — expires <t:${ts}:R>`);
        }
        if (targetData.luckExpiresAt && nowTime < new Date(targetData.luckExpiresAt).getTime()) {
            const ts = Math.floor(new Date(targetData.luckExpiresAt).getTime() / 1000);
            scanLines.push(`🍀 **Luck Boost** — expires <t:${ts}:R>`);
        }
        if (targetData.workStenchExpiresAt && nowTime < new Date(targetData.workStenchExpiresAt).getTime()) {
            const ts = Math.floor(new Date(targetData.workStenchExpiresAt).getTime() / 1000);
            scanLines.push(`🍌 **Banana Stench** — expires <t:${ts}:R>`);
        }
        if (targetData.blindedExpiresAt && nowTime < new Date(targetData.blindedExpiresAt).getTime()) {
            const ts = Math.floor(new Date(targetData.blindedExpiresAt).getTime() / 1000);
            scanLines.push(`🙈 **Blinded** — expires <t:${ts}:R>`);
        }
        if (targetData.itemLockoutExpiresAt && nowTime < new Date(targetData.itemLockoutExpiresAt).getTime()) {
            const ts = Math.floor(new Date(targetData.itemLockoutExpiresAt).getTime() / 1000);
            scanLines.push(`⚡ **Paralyzed** — expires <t:${ts}:R>`);
        }
        if (targetData.spaceDuckExpiresAt && nowTime < new Date(targetData.spaceDuckExpiresAt).getTime()) {
            const ts = Math.floor(new Date(targetData.spaceDuckExpiresAt).getTime() / 1000);
            scanLines.push(`🚀 **Space Duck** — expires <t:${ts}:R>`);
        }
        if (targetData.activeTitle) {
            scanLines.push(`🏷️ **Active Title:** ${targetData.activeTitle}`);
        }

        // Bonus: peek at the first item in their inventory
        const peekItem = targetData.inventory && targetData.inventory.find(i => i.quantity > 0);
        if (peekItem && ITEMS[peekItem.itemId]) {
            scanLines.push(`🎒 **Top Inventory Item:** ${ITEMS[peekItem.itemId].emoji} ${ITEMS[peekItem.itemId].name} ×${peekItem.quantity}`);
        }

        msg = `🐚 You hold the **Prehistoric Shell** to your ear... frequencies lock on to **${targetUser.username}**!\n\n📡 **Full Scan Results:**\n${scanLines.join('\n')}\n\n_Shell crumbles to dust after one use._`;
        color = 0x3498DB;

    } else if (itemId === 'ancient_bone') {
        removeItem(baubleData, 'ancient_bone', 1);
        let victim = null;
        try {
            const members = channel.members.filter(m => !m.user.bot && m.user.id !== userId);
            const randomMember = members.random();
            if (randomMember) victim = randomMember.user;
        } catch (_) {}

        if (victim) {
            let victimData = await Bauble.findOne({ userId: victim.id });
            if (!victimData) victimData = new Bauble({ userId: victim.id });

            const dug = Math.min(victimData.baubles, Math.floor(Math.random() * 401) + 100); // 100-500
            victimData.baubles -= dug;
            baubleData.baubles += dug;
            await victimData.save();

            msg = `🦴 You hold up the **Mammoth Femur** and whistle! \n\n🐕 The **Ancient Dog** appears, runs off, digs up **${dug} Baubles** from **${victim.username}**'s backyard wallet, and brings them to you! Good boy!`;
            color = 0x2ECC71;
        } else {
            msg = `🦴 You whistled for the Ancient Dog, but he was chasing a digital squirrel and didn't find any user wallets.`;
            color = 0x7F8C8D;
        }

    } else if (itemId === 't_rex_skull') {
        if (!targetUser) {
            return { success: false, msg: '🦖 Scare requires a target! Usage: `-use t_rex_skull @User`', ephemeral: true };
        }
        if (targetUser.id === userId) {
            return { success: false, msg: '🦖 Trying to scare yourself? You fail.', ephemeral: true };
        }

        let targetData = await Bauble.findOne({ userId: targetUser.id });
        if (!targetData) targetData = new Bauble({ userId: targetUser.id });

        if (targetData.invisibilityExpiresAt && Date.now() < new Date(targetData.invisibilityExpiresAt).getTime()) {
            return { success: false, msg: `❌ **${targetUser.username}** is invisible! You roar at shadows.`, ephemeral: true };
        }
        if (targetData.shieldExpiresAt && Date.now() < new Date(targetData.shieldExpiresAt).getTime()) {
            return { success: false, msg: `🛡️ **${targetUser.username}** is shielding! Your roar bounces off the cardboard barrier.`, ephemeral: true };
        }

        removeItem(baubleData, 't_rex_skull', 1);
        const win = Math.random() < 0.50;
        const duels = Math.floor(Math.random() * 201) + 100; // 100-300

        if (win) {
            const stealAmount = Math.min(targetData.baubles, duels);
            targetData.baubles -= stealAmount;
            baubleData.baubles += stealAmount;
            await targetData.save();

            msg = `🦖 You put on the **🦖 Screaming T-Rex Skull** and let out a blood-curdling roar at **${targetUser.username}**! \n\n😱 They jumped so high they dropped **${stealAmount} Baubles**, which you pocketed immediately!`;
            color = 0x2ECC71;
        } else {
            const loseAmount = Math.min(baubleData.baubles, duels);
            baubleData.baubles -= loseAmount;
            targetData.baubles += loseAmount;
            await targetData.save();

            msg = `🦖 You put on the **🦖 Screaming T-Rex Skull** and let out a roar at **${targetUser.username}**! \n\n😐 They didn't even flinch. Instead, they laughed at your paper skull, slapped you, and took **${loseAmount} Baubles**!`;
            color = 0xE74C3C;
        }

    } else if (itemId === 'common_meme') {
        removeItem(baubleData, 'common_meme', 1);
        const roll = Math.random();
        if (roll < 0.10) {
            // Mega viral
            const viral = Math.floor(Math.random() * 1501) + 1000; // 1000-2500
            baubleData.baubles += viral;
            msg = `🐸 You posted the **Stale Pepe Meme** and it unexpectedly exploded!\n\n🔥 **GOING VIRAL!** It got reposted 400k times overnight. The ad revenue hits your wallet — **${viral.toLocaleString()} Baubles**!`;
            color = 0xf1c40f;
        } else if (roll < 0.55) {
            // Standard upvote
            const gain = Math.floor(Math.random() * 301) + 200; // 200-500
            baubleData.baubles += gain;
            msg = `🐸 You posted the **Stale Pepe Meme** in the chat!\n\n📈 **UPVOTED!** Chat respects the classics. You pocket **${gain} Baubles** in internet validation!`;
            color = 0x2ECC71;
        } else {
            const loss = Math.floor(Math.random() * 151) + 100; // 100-250
            baubleData.baubles = Math.max(0, baubleData.baubles - loss);
            msg = `🐸 You posted the **Stale Pepe Meme** in the chat...\n\n📉 **RATIO'D!** The chat was not feeling it. Someone replied "do better" and you lost **${loss} Baubles** in dignity.`;
            color = 0xE74C3C;
        }

    } else if (itemId === 'dead_meme') {
        removeItem(baubleData, 'dead_meme', 1);
        let victim = null;
        try {
            const members = channel.members.filter(m => !m.user.bot && m.user.id !== userId);
            const randomMember = members.random();
            if (randomMember) victim = randomMember.user;
        } catch (_) {}

        if (victim) {
            let victimData = await Bauble.findOne({ userId: victim.id });
            if (!victimData) victimData = new Bauble({ userId: victim.id });
            // Real cringe damage: 50-200 baubles and a 3 minute work stench
            const cringeDmg = Math.min(victimData.baubles, Math.floor(Math.random() * 151) + 50);
            victimData.baubles = Math.max(0, victimData.baubles - cringeDmg);
            victimData.workStenchExpiresAt = new Date(Date.now() + 180000); // 3 min work lockout
            await victimData.save();

            msg = `💀 You whip out the **💀 2011 Rage Comic** and force **${victim.username}** to read it!\n\n😖 They cringe so violently they physically convulse, drop **${cringeDmg} Baubles**, and are too embarrassed to work for the next **3 minutes**!`;
        } else {
            // No victim — it backfires
            const selfCringe = Math.min(baubleData.baubles, 100);
            baubleData.baubles = Math.max(0, baubleData.baubles - selfCringe);
            msg = `💀 You posted the **💀 2011 Rage Comic** but nobody was around...\n\nYou re-read it yourself and cringed so hard you dropped **${selfCringe} Baubles**. You only have yourself to blame.`;
        }
        color = 0xE74C3C;

    } else if (itemId === 'ancient_meme') {
        removeItem(baubleData, 'ancient_meme', 1);
        const rates = [0.5, 0.75, 1.5, 2.0];
        const rolledRate = rates[Math.floor(Math.random() * rates.length)];
        
        const { setTempMultiplier } = require('../../utils/economyEngine');
        setTempMultiplier(rolledRate, 300000); // 5 minutes (300,000 ms)

        msg = `📜 You posted the **📜 Dancing Baby GIF**! The ancient gods of internet humor have awakened! \n\n🌀 **ECONOMY SHIFT:** The global economy multiplier is set to **${rolledRate}x** for the next 5 minutes!`;
        color = 0xF1C40F;

    } else if (itemId === 'legendary_meme') {
        removeItem(baubleData, 'legendary_meme', 1);
        let count = 0;
        try {
            const members = channel.members.filter(m => !m.user.bot && m.user.id !== userId);
            for (const member of members.values()) {
                let uData = await Bauble.findOne({ userId: member.user.id });
                if (!uData) uData = new Bauble({ userId: member.user.id });
                uData.baubles += 100;
                await uData.save();
                count++;
            }
        } catch (_) {}

        baubleData.activeTitle = 'Meme Lord';
        if (!baubleData.titles.includes('Meme Lord')) {
            baubleData.titles.push('Meme Lord');
        }

        msg = `👑 **NEVER GONNA GIVE YOU UP!** You Rickrolled the entire server! \n\n🎉 You gave **100 Baubles** to **${count}** users currently online, and unlocked the permanent title **"Meme Lord"**!`;
        color = 0xF1C40F;

    } else if (itemId === 'rubber_duck') {
        // NOT consumed — this duck is infinite use, but has cooldown flavour
        const roll = Math.random();
        if (roll < 0.08) {
            // Debug jackpot — get a random item
            const boosters = ['coffee', 'clover', 'mystery_box', 'shield', 'rabbits_feet'];
            const itemGot = boosters[Math.floor(Math.random() * boosters.length)];
            addItem(baubleData, itemGot, 1);
            msg = `🦆 You squeeze the **🦆 Debugging Rubber Duck**: \`*SQUEAK!*\`\n\n🛠️ **BUG FIXED!** The duck audited the economy codebase and found a dangling pointer worth a free **${ITEMS[itemGot].name}** — added to your inventory!`;
            color = 0x2ECC71;
        } else if (roll < 0.14) {
            // Cash windfall
            const coins = Math.floor(Math.random() * 501) + 200; // 200-700
            baubleData.baubles += coins;
            msg = `🦆 You squeeze the **🦆 Debugging Rubber Duck**: \`*SQUEAK!*\`\n\n💰 **MEMORY LEAK FOUND!** The duck discovered **${coins} Baubles** leaking from the server heap and patched them directly into your wallet!`;
            color = 0xf1c40f;
        } else if (roll < 0.17) {
            // Crash — short item lockout
            baubleData.itemLockoutExpiresAt = new Date(Date.now() + 90000); // 90 sec lockout
            msg = `🦆 You squeeze the **🦆 Debugging Rubber Duck**: \`*SQUEAK!*\`\n\n💥 **SEGFAULT!** The duck triggered a null pointer exception and crashed your hands! You can't use items for **90 seconds**.`;
            color = 0xE74C3C;
        } else {
            // Flavored nothing — rotate between funny messages
            const quips = [
                `It stares back with dead plastic eyes. Rubber duck debugging session complete. No bugs found. Move along.`,
                `It lets out an **extremely** confident squeak and then just... sits there. Unhelpful.`,
                `It squeaks, rolls sideways, and falls off your desk. Classic duck behavior.`,
                `A single blinking cursor appears in your mind. Then disappears. The duck solved nothing.`,
            ];
            shouldSave = false;
            msg = `🦆 You squeeze the **🦆 Debugging Rubber Duck**: \`*SQUEAK!*\`\n\n${quips[Math.floor(Math.random() * quips.length)]}`;
            color = 0x3498db;
        }

    } else if (itemId === 'golden_duck') {
        removeItem(baubleData, 'golden_duck', 1);
        const payout = Math.floor(Math.random() * 15001) + 15000; // 15000-30000
        baubleData.baubles += payout;
        msg = `🟡 You put the **🟡 Golden Duck** into the furnace and smelted it down! \n\n💰 You poured out **${payout.toLocaleString()} Baubles** of liquid gold! The duck was consumed.`;
        color = 0xF1C40F;

    } else if (itemId === 'pirate_duck') {
        removeItem(baubleData, 'pirate_duck', 1);
        const GlobalEconomy = require('../../models/GlobalEconomy');
        let globalEco = await GlobalEconomy.findOne();
        if (!globalEco) globalEco = new GlobalEconomy();

        let plunder = Math.floor(Math.random() * 401) + 200; // 200-600
        plunder = Math.min(globalEco.taxFund || 0, plunder);
        if (plunder < 200) plunder = Math.min(200, globalEco.taxFund || 0);

        if (plunder > 0) {
            globalEco.taxFund -= plunder;
            baubleData.baubles += plunder;
            await globalEco.save();
            msg = `🏴‍☠️ You sent the **🏴‍☠️ Pirate Duck** to raid the federal reserve! \n\n🦜 It squeaked menacingly, broke into the vault, and stole **${plunder} Baubles** from the government Tax Fund!`;
            color = 0xF1C40F;
        } else {
            msg = `🏴‍☠️ You sent the Pirate Duck to plunder the tax fund, but the government is completely bankrupt. Nothing was stolen.`;
            color = 0x7F8C8D;
        }

    } else if (itemId === 'space_duck') {
        removeItem(baubleData, 'space_duck', 1);
        baubleData.spaceDuckExpiresAt = new Date(Date.now() + 1800000); // 30 minutes
        msg = `🚀 You launched the **🚀 Space Duck** into a low-Earth orbit! \n\n📡 For the next **30 minutes**, it will spy overhead and intercept **5% of all transactions** made between other players!`;
        color = 0x3498DB;

    } else if (itemId === 'divine_duck') {
        removeItem(baubleData, 'divine_duck', 1);
        baubleData.divineDuckExpiresAt = new Date(Date.now() + 900000); // 15 minutes
        msg = `✨ You sacrificed the **✨ Divine Duck** to the sky gods!\n\nA celestial beam blesses your pouch, granting a **+100% income boost** on all actions for the next 15 minutes!`;
        color = 0xF1C40F;

    } else if (itemId === 'broken_laptop') {
        removeItem(baubleData, 'broken_laptop', 1);
        const roll = Math.random();
        if (roll < 0.10) {
            addItem(baubleData, 'gaming_pc', 1);
            msg = `💻 You plugged in the **💻 E-Waste Laptop** and pressed power... \n\n🎉 **IT BOOTED!** The hardware somehow upgraded itself into a fully functioning **🖥️ Mining Rig**!`;
            color = 0x2ECC71;
        } else {
            baubleData.itemLockoutExpiresAt = new Date(Date.now() + 600000); // 10 minutes item lockout
            msg = `💻 You plugged in the **💻 E-Waste Laptop** and pressed power... \n\n⚡ **ZAP!** The battery exploded and sent a high-voltage shock through your fingers! You are paralyzed and cannot use items for **10 minutes**!`;
            color = 0xE74C3C;
        }

    } else if (itemId === 'gaming_pc') {
        removeItem(baubleData, 'gaming_pc', 1);
        const rng = Math.random();
        if (rng < 0.20) {
            msg = `🖥️ You booted up the **🖥️ Mining Rig** and started mining crypto... but the cooling fan failed! \n\n💥 **BOOM!** The graphics card melted into a pile of molten plastic. The computer is destroyed!`;
            color = 0xE74C3C;
        } else {
            const coins = Math.floor(Math.random() * 501) + 500; // 500-1000 baubles
            baubleData.baubles += coins;
            msg = `🖥️ You booted up the **🖥️ Mining Rig** and mined crypto successfully!\nYou generated **${coins.toLocaleString()}** Glimmering Baubles before the hardware died and was discarded!`;
            color = 0x2ECC71;
        }

    } else if (itemId === 'quantum_computer') {
        removeItem(baubleData, 'quantum_computer', 1);
        const roll = Math.random();
        if (roll < 0.50) {
            const payout = 50000;
            baubleData.baubles += payout;
            msg = `🔮 You ran a lottery simulation on the **🔮 Quantum Computer**... \n\n🌌 **SUCCESS:** It computed the exact quantum state of the winning numbers! You won the lottery and gained **50,000 Baubles**!`;
            color = 0xF1C40F;
        } else {
            // Destroy 3 random items
            let destroyed = [];
            if (baubleData.inventory && baubleData.inventory.length > 0) {
                for (let k = 0; k < 3; k++) {
                    if (baubleData.inventory.length === 0) break;
                    const idx = Math.floor(Math.random() * baubleData.inventory.length);
                    const itemRemoved = baubleData.inventory[idx].itemId;
                    removeItem(baubleData, itemRemoved, 1);
                    destroyed.push(ITEMS[itemRemoved]?.name || itemRemoved);
                }
            }
            const destroyedStr = destroyed.length > 0 ? `It sucked in: ${destroyed.join(', ')}!` : 'It only sucked in dust.';
            msg = `🔮 You booted the **🔮 Quantum Computer**... \n\n🕳️ **BLACK HOLE:** The qubit array collapsed, creating a micro-singularity! ${destroyedStr} The computer was swallowed too!`;
            color = 0xE74C3C;
        }

    } else if (itemId === 'alien_computer') {
        if (!targetUser) {
            return { success: false, msg: '👽 alien_computer requires a target user to beam up! Usage: `-use alien_computer @User`', ephemeral: true };
        }
        
        let targetData = await Bauble.findOne({ userId: targetUser.id });
        if (!targetData) targetData = new Bauble({ userId: targetUser.id });

        if (targetData.invisibilityExpiresAt && Date.now() < new Date(targetData.invisibilityExpiresAt).getTime()) {
            return { success: false, msg: `❌ **${targetUser.username}** is invisible! The tractor beam sweeps right past.`, ephemeral: true };
        }
        if (targetData.shieldExpiresAt && Date.now() < new Date(targetData.shieldExpiresAt).getTime()) {
            return { success: false, msg: `🛡️ **${targetUser.username}** has a cardboard shield active! The tractor beam bounces off.`, ephemeral: true };
        }

        removeItem(baubleData, 'alien_computer', 1);
        const roll = Math.random();
        if (roll < 0.50) {
            // Beam up target (command lockout 5 minutes)
            targetData.beamedExpiresAt = new Date(Date.now() + 300000); // 5m
            await targetData.save();
            msg = `👽 You type coordinates into the **👽 Extraterrestrial Terminal**... \n\n🛸 **ZOOP!** A UFO flashes overhead and beams up **${targetUser.username}**! They are locked out of all bot commands for the next **5 minutes**!`;
            color = 0x9B59B6;
        } else {
            // Cargo drop (3 items)
            const pool = Object.values(ITEMS).filter(item => !item.isUnique);
            const itemsGot = [];
            for (let i = 0; i < 3; i++) {
                const itemPicked = pool[Math.floor(Math.random() * pool.length)];
                addItem(baubleData, itemPicked.id, 1);
                itemsGot.push(itemPicked.name);
            }
            msg = `👽 You type coordinates into the **👽 Extraterrestrial Terminal**... \n\n📦 The alien mothership drops down a space cargo crate! Inside, you find: ${itemsGot.join(', ')}!`;
            color = 0x2ECC71;
        }

    } else if (itemId === 'dragon_egg') {
        removeItem(baubleData, 'dragon_egg', 1);
        const roll = Math.random();
        if (roll < 0.35) {
            // Success: rob everyone in channel
            let totalStolen = 0;
            let count = 0;
            try {
                const members = channel.members.filter(m => !m.user.bot && m.user.id !== userId);
                for (const member of members.values()) {
                    let uData = await Bauble.findOne({ userId: member.user.id });
                    if (uData && uData.baubles >= 200 && (!uData.invisibilityExpiresAt || Date.now() >= new Date(uData.invisibilityExpiresAt).getTime()) && (!uData.shieldExpiresAt || Date.now() >= new Date(uData.shieldExpiresAt).getTime())) {
                        const stolen = Math.floor(Math.random() * 401) + 100; // 100-500
                        const actual = Math.min(stolen, uData.baubles);
                        uData.baubles -= actual;
                        await uData.save();
                        totalStolen += actual;
                        count++;
                    }
                }
            } catch (_) {}

            baubleData.baubles += totalStolen;
            msg = `🥚 **CRACK!** A baby dragon hatched from the **🥚 Dragon Egg**! \n\n🔥 It flew around the channel, breathing fire and stealing **${totalStolen.toLocaleString()} Baubles** from **${count}** terrified users, then dropped the loot in your lap before flying away!`;
            color = 0x2ECC71;
        } else {
            // Failure: burn wallet
            const loss = Math.min(baubleData.baubles, 5000);
            baubleData.baubles -= loss;
            msg = `🥚 **CRACK!** You tried to incubate the **🥚 Dragon Egg**... \n\n🔥 But it hatched, let out a sneeze of absolute fire, burned **${loss.toLocaleString()} Baubles** in your wallet, and flew out the window!`;
            color = 0xE74C3C;
        }

    } else if (itemId === 'void_star') {
        removeItem(baubleData, 'void_star', 1);
        baubleData.workStenchExpiresAt = null;
        baubleData.luckPenaltyExpiresAt = null;
        baubleData.blindedExpiresAt = null;
        baubleData.itemLockoutExpiresAt = null;
        baubleData.beamedExpiresAt = null;
        
        const roll = Math.random();
        if (roll < 0.10) {
            baubleData.activeTitle = null;
            baubleData.titles = [];
            msg = `⭐ You devoured the glowing **⭐ Void Star**! \n\n🌌 All status conditions and penalties have been completely purged from your body! \n\n🕳️ **VOID CONSUMPTION:** However, the void star devoured your active title and entire list of unlocked titles! They are gone!`;
            color = 0xE74C3C;
        } else {
            msg = `⭐ You devoured the glowing **⭐ Void Star**! \n\n🌌 All status conditions, stenches, blindness, and penalties have been completely purged from your body. You feel clean and powerful!`;
            color = 0x3498DB;
        }

    } else if (itemId === 'the_one_ring') {
        removeItem(baubleData, 'the_one_ring', 1);
        baubleData.invisibilityExpiresAt = new Date(Date.now() + 3600000); // 1 hour invisibility
        msg = `💍 You slip **The One Ring** onto your finger and vanish into the shadow realm!\n\nYou are now **invisible for 1 hour**! You are immune to robberies, but you cannot rob anyone else either.`;
        color = 0xf1c40f;

    } else if (itemId === 'excalibur') {
        if (!targetUser) {
            return { success: false, msg: '⚔️ You cannot challenge a ghost! Target a user: `-use excalibur @User`', ephemeral: true };
        }
        if (targetUser.id === userId) {
            return { success: false, msg: '⚔️ Don\'t duel yourself. That is called shadowboxing.', ephemeral: true };
        }

        let targetData = await Bauble.findOne({ userId: targetUser.id });
        if (!targetData) targetData = new Bauble({ userId: targetUser.id });

        const nowTime = Date.now();
        if (targetData.invisibilityExpiresAt && nowTime < new Date(targetData.invisibilityExpiresAt).getTime()) {
            return { success: false, msg: `❌ **${targetUser.username}** is currently invisible! Your sword swings right through their shadow.`, ephemeral: true };
        }
        if (targetData.shieldExpiresAt && nowTime < new Date(targetData.shieldExpiresAt).getTime()) {
            return { success: false, msg: `🛡️ **${targetUser.username}** is shielding! They block your challenge completely.`, ephemeral: true };
        }

        removeItem(baubleData, 'excalibur', 1);
        const win = Math.random() < 0.50;
        const duelCoins = 500;

        if (win) {
            const stealAmount = Math.min(targetData.baubles, duelCoins);
            targetData.baubles -= stealAmount;
            baubleData.baubles += stealAmount;
            await targetData.save();

            msg = `⚔️ You unsheathe **Excalibur** and challenge **${targetUser.username}** to a high-stakes duel!\n\n✨ You strike them down with legendary speed and take **${stealAmount}** Baubles from their wallet! Excalibur vanishes back into the stone.`;
            color = 0xf1c40f;
        } else {
            const stealAmount = Math.min(baubleData.baubles, duelCoins);
            baubleData.baubles -= stealAmount;
            targetData.baubles += stealAmount;
            await targetData.save();

            msg = `⚔️ You unsheathe **Excalibur** and challenge **${targetUser.username}** to a high-stakes duel!\n\n💨 Oh no! They disarm you with a wooden spoon and confiscate **${stealAmount}** Baubles from your pocket! Excalibur vanishes back into the stone.`;
            color = 0xe74c3c;
        }

    } else if (itemId === 'holy_grail') {
        removeItem(baubleData, 'holy_grail', 1);
        baubleData.activeExpedition = { startedAt: null, endTime: null, status: 'idle' }; // Cure expedition injuries
        baubleData.grailIncomeExpiresAt = new Date(Date.now() + 1800000); // 30 minutes grail income boost (+50%)
        msg = `🏆 You drink from the glowing waters of the **Holy Grail**!\n\nYour expedition injuries are cured instantly, and you receive a **+50% income boost** on all work, scavenge, daily, and weekly actions for the next 30 minutes!`;
        color = 0xf1c40f;

    } else if (itemId === 'mona_lisa') {
        removeItem(baubleData, 'mona_lisa', 1);
        baubleData.baubles += 10000;
        baubleData.activeTitle = 'Art Vandal';
        if (!baubleData.titles.includes('Art Vandal')) {
            baubleData.titles.push('Art Vandal');
        }

        msg = `🖼️ You drew a giant handlebar mustache onto the **Original Mona Lisa**! \n\n🎭 The museum directors cried, but the chat laughed so hard they donated **10,000 Baubles** to you! You unlocked the title **"Art Vandal"**! \n\n*(Note: Its sell value has dropped to 10 baubles.)*`;
        color = 0xF1C40F;

    } else {
        shouldSave = false;
        return { success: false, msg: `❌ **${ITEMS[itemId].name}** is a passive collectible item and cannot be used manually. You can sell it or gift it!`, ephemeral: true };
    }

    if (shouldSave) {
        await baubleData.save();
    }

    return { success: true, msg, color };
}
