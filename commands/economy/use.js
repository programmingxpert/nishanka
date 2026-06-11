/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Bauble = require('../../models/baubleSchema');
const Family = require('../../models/familySchema');
const GlobalEconomy = require('../../models/GlobalEconomy');
const { ITEMS, getRandomAvailableItem } = require('../../utils/items');

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
        baubleData.coffeeExpiresAt = new Date(Date.now() + 3600000); // 1 hour
        
        const roll = Math.random();
        if (roll < 0.15) {
            // Jittery double payout
            baubleData.divineDuckExpiresAt = new Date(Date.now() + 3600000); // 1 hour
            msg = '☕ You chugged the **☕ Liquid Anxiety**! Cooldowns halved for 1 hour.\n\n⚡ **JITTERY ANXIETY BURST:** Your panic paid off! You got a massive caffeine high, granting you a **+100% income boost** on all commands for the next hour!';
            color = 0xF1C40F;
        } else {
            msg = '☕ You chugged the **☕ Liquid Anxiety**! Your `/work` and `/scavenge` cooldowns are reduced by 50% for the next hour. It tasted like battery acid and raw panic.';
            color = 0xE67E22;
        }

    } else if (itemId === 'clover') {
        removeItem(baubleData, 'clover', 1);
        baubleData.luckExpiresAt = new Date(Math.floor((Date.now() + 1800000) / 10) * 10); // 30 minutes, ends in 0
        baubleData.luckPenaltyExpiresAt = null; // Clear bad luck
        msg = '🍀 You munched on the glowing **🍀 Chernobyl Salad**! Your Coinflip and Gamble win rates are boosted by **+15%** for the next 30 minutes, and any bad luck penalties have been completely purged!';
        color = 0x2ECC71;

    } else if (itemId === 'shield') {
        removeItem(baubleData, 'shield', 1);
        baubleData.shieldExpiresAt = new Date(Date.now() + 7200000); // 2 hours
        msg = '🛡️ You wrapped yourself in **🛡️ Bubble Wrap Armor**! You are completely immune to all robberies and duels for 2 hours! However, you cannot rob others during this time.';
        color = 0x3498DB;

    } else if (itemId === 'mystery_box') {
        removeItem(baubleData, 'mystery_box', 1);
        const rng = Math.random();
        if (rng < 0.35) {
            const bonus = Math.floor(Math.random() * 10001) + 5000; // 5k-15k baubles
            baubleData.baubles += bonus;
            msg = `📦 You cracked open the **📦 Gacha Addiction Box** and scored **${bonus.toLocaleString()}** Glimmering Baubles! Pure profit!`;
            color = 0xF1C40F;
        } else if (rng < 0.65) {
            const boosters = ['coffee', 'clover', 'shield', 'padlock', 'rabbits_feet'];
            const booster = boosters[Math.floor(Math.random() * boosters.length)];
            addItem(baubleData, booster, 1);
            msg = `📦 You opened the **📦 Gacha Addiction Box** and won a **${ITEMS[booster].name}**!`;
            color = 0x2ECC71;
        } else if (rng < 0.90) {
            const techAndDucks = ['rubber_duck', 'broken_laptop', 'gaming_pc', 'pirate_duck', 'space_duck'];
            const tech = techAndDucks[Math.floor(Math.random() * techAndDucks.length)];
            addItem(baubleData, tech, 1);
            msg = `📦 You opened the **📦 Gacha Addiction Box** and found a high-value **${ITEMS[tech].name}**!`;
            color = 0x3498DB;
        } else {
            const junks = [
                'a receipt for a single banana purchased in 2012',
                'an empty wrapper of "Liquid Anxiety" containing only sadness',
                'a tiny sign that says "Please do not rob me, I am poor"',
                'a single wet sock that makes a squelching sound when held',
                'a certificate stating you are 100% certified to be bad at gacha games'
            ];
            const junk = junks[Math.floor(Math.random() * junks.length)];
            msg = `📦 You opened the **📦 Gacha Addiction Box** and found... **${junk}**. Truly useless!`;
            color = 0x7F8C8D;
        }

    } else if (itemId === 'padlock') {
        removeItem(baubleData, 'padlock', 1);
        baubleData.padlockedExpiresAt = new Date(Date.now() + 3600000); // 1 hour
        msg = '🔒 You locked yourself in the vault with a **🔒 Dollar Store Lock**!\n\nYou are immune to all robberies and duels for 1 hour, but you cannot run `-work` or `-scavenge` during this time because you lost the key.';
        color = 0xE67E22;

    } else if (itemId === 'tag') {
        if (!targetUser) {
            targetUser = { id: userId, username: 'yourself' };
        }
        
        let targetData = await Bauble.findOne({ userId: targetUser.id });
        if (!targetData) {
            targetData = new Bauble({ userId: targetUser.id });
        }

        const tags = ['Slightly Moist', 'Certified Bozo', 'Professional Clown', 'Cryptobro', 'Tax Evader', 'Wobbly Duckling', 'Pineapple Pizza Fanatic'];
        const tagText = tags[Math.floor(Math.random() * tags.length)];

        removeItem(baubleData, 'tag', 1);
        targetData.activeTitle = tagText;
        if (!targetData.titles.includes(tagText)) {
            targetData.titles.push(tagText);
        }
        await targetData.save();

        msg = `🏷️ You slapped a **"Kick Me" Sticky Note** onto **${targetUser.username}**'s head!\n\nThey now have the active title: **"${tagText}"** for the next 24 hours!`;
        color = 0x9B59B6;

    } else if (itemId === 'paintbrush') {
        return { success: false, msg: '🎨 The **Profile Paintbrush** cannot be used directly. Use `/profile edit` (or `-profile edit`) and select **Edit Banner** to customize your profile banner!', ephemeral: true };

    } else if (itemId === 'nugget') {
        removeItem(baubleData, 'nugget', 1);
        const roll = Math.random();
        if (roll < 0.70) {
            const pool = Object.values(ITEMS).filter(item => item.rarity === 'Legendary' || item.rarity === 'Mythic');
            const rolled = await getRandomAvailableItem(pool);
            addItem(baubleData, rolled.id, 1);
            msg = `💎 You offered the **💎 Fool's Gold Chunk** to the digital gods... and they bought it! \n\nThey dropped a **${rolled.name}** into your inventory!`;
            color = 0xF1C40F;
        } else {
            baubleData.bribedLockoutExpiresAt = new Date(Date.now() + 3600000); // 1 hour lockout
            msg = `💎 You offered the **💎 Fool's Gold Chunk** to the bot... \n\n🤖 The bot realized it's fake gold, called you a scammer, and locked you out of daily/weekly commands for the next **1 hour**!`;
            color = 0xE74C3C;
        }

    } else if (itemId === 'crown') {
        removeItem(baubleData, 'crown', 1);
        const roll = Math.random();
        if (roll < 0.75) {
            let victims = [];
            try {
                const members = channel.members.filter(m => !m.user.bot && m.user.id !== userId);
                const candidates = members.random(10);
                for (const member of candidates) {
                    if (victims.length >= 5) break;
                    let victimData = await Bauble.findOne({ userId: member.user.id });
                    if (victimData && victimData.baubles >= 1000) {
                        victimData.baubles -= 1000;
                        await victimData.save();
                        victims.push(member.user);
                    }
                }
            } catch (_) {}

            if (victims.length > 0) {
                const totalTax = victims.length * 1000;
                baubleData.baubles += totalTax;
                msg = `👑 You wore the **👑 Cardboard Monarch Hat** and declared yourself Ruler of the Channel! \n\n💂 You taxed the peasants **1,000 Baubles** each: ${victims.map(u => `**${u.username}**`).join(', ')} (Earned **${totalTax.toLocaleString()}** Baubles)!`;
                color = 0xF1C40F;
            } else {
                msg = `👑 You wore the **👑 Cardboard Monarch Hat**, but everyone in this channel is completely broke. No taxes were collected.`;
                color = 0x7F8C8D;
            }
        } else {
            const fine = Math.min(baubleData.baubles, 3000);
            baubleData.baubles -= fine;
            baubleData.activeTitle = 'Royal Fraud';
            if (!baubleData.titles.includes('Royal Fraud')) {
                baubleData.titles.push('Royal Fraud');
            }
            msg = `👑 You wore the **👑 Cardboard Monarch Hat**, but the peasants laughed and pelted you with rocks! \n\n💥 You were overthrown, lost **${fine.toLocaleString()} Baubles**, and have been branded the **"Royal Fraud"**!`;
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

        // Grant 2 hours Child Labor Contract boost
        baubleData.childLaborExpiresAt = new Date(Date.now() + 7200000); // 2 hours

        msg = `📄 **CONGRATULATIONS!** You signed a **📄 Child Labor Contract** adopting **${targetUser.username}**! \n\nYou are now their legal guardian. For the next 2 hours, you will receive a **15% cut** of their \`/work\` earnings generated from thin air!`;
        color = 0x2ECC71;

    } else if (itemId === 'broken_keyboard') {
        removeItem(baubleData, 'broken_keyboard', 1);
        const chars = 'ASDFJKL;QWERTYUIOPZXCVBNM!@#$%';
        let smash = '';
        for (let i = 0; i < 25; i++) smash += chars[Math.floor(Math.random() * chars.length)];

        const rng = Math.random();
        if (rng < 0.30) {
            const coins = Math.floor(Math.random() * 10001) + 5000; // 5000-15000
            baubleData.baubles += coins;
            msg = `⌨️ You rage-smashed the **⌨️ Rage-Quitted Keyboard**: \`*${smash}!*\`\n\n🤩 **ACCIDENTAL VIRAL POST!** Discord somehow auto-posted that gibberish and it went viral! You pocketed **${coins.toLocaleString()} Baubles** in ad revenue!`;
            color = 0xf1c40f;
        } else if (rng < 0.90) {
            const coins = Math.floor(Math.random() * 2001) + 1000; // 1000-3000
            baubleData.baubles += coins;
            msg = `⌨️ You slam your fists on the **⌨️ Rage-Quitted Keyboard**: \`*${smash}!*\`\n\n💸 A cascade of dust and **${coins.toLocaleString()} Baubles** rattled loose from under the keycaps!`;
            color = 0x2ecc71;
        } else {
            baubleData.itemLockoutExpiresAt = new Date(Date.now() + 60000); // 1 min lockout
            msg = `⌨️ You slam the **⌨️ Rage-Quitted Keyboard**: \`*${smash}!*\`\n\n⚡ **ZAP!** A stray exposed wire zaps your hands! You drop it and your fingers won't cooperate for the next **1 minute**.`;
            color = 0xe74c3c;
        }

    } else if (itemId === 'rotten_banana') {
        if (!targetUser) {
            return { success: false, msg: '🍌 Throwing a banana peel requires a target! Usage: `-use rotten_banana @User`', ephemeral: true };
        }
        if (targetUser.id === userId) {
            return { success: false, msg: '🍌 Why would you throw a banana peel at yourself? Don\'t do that.', ephemeral: true };
        }

        let targetData = await Bauble.findOne({ userId: targetUser.id });
        if (!targetData) targetData = new Bauble({ userId: targetUser.id });

        if (targetData.invisibilityExpiresAt && Date.now() < new Date(targetData.invisibilityExpiresAt).getTime()) {
            return { success: false, msg: `❌ **${targetUser.username}** is invisible! The peel slides right through.`, ephemeral: true };
        }
        if (targetData.shieldExpiresAt && Date.now() < new Date(targetData.shieldExpiresAt).getTime()) {
            return { success: false, msg: `🛡️ **${targetUser.username}** is shielding! The banana peel bounces harmlessly off their Bubble Wrap Armor.`, ephemeral: true };
        }

        removeItem(baubleData, 'rotten_banana', 1);
        targetData.workStenchExpiresAt = new Date(Date.now() + 600000); // 10 minutes
        const percentSteal = Math.floor(targetData.baubles * 0.10); // 10%
        const slipSteal = Math.max(500, Math.min(percentSteal, 5000)); // min 500, max 5k
        targetData.baubles = Math.max(0, targetData.baubles - slipSteal);
        baubleData.baubles += slipSteal;
        await targetData.save();

        msg = `🍌 **SPLAT!** You lobbed a **🍌 Slip-and-Slide Peel** directly under **${targetUser.username}**'s feet!\n\n🪰 They slip, slide, and drop **${slipSteal.toLocaleString()} Baubles**, which you pocket! They also cannot run \`-work\` for the next **10 minutes**!`;
        color = 0x8b5a2b;

    } else if (itemId === 'rabbits_feet') {
        removeItem(baubleData, 'rabbits_feet', 1);
        baubleData.luckExpiresAt = new Date(Math.floor((Date.now() + 1800000) / 10) * 10 + 5); // 30m luck (ends in 5)
        baubleData.luckPenaltyExpiresAt = null; // Clear bad luck
        const rng = Math.random();
        if (rng < 0.20) {
            const windfall = 10000;
            baubleData.baubles += windfall;
            msg = `🐰 You rubbed the **🐰 Lucky Rabbit Toe**!\n\n🌟 **MEGA LUCK!** You hit the jackpot and found **10,000 Baubles** inside the fur, plus a **+25% luck boost** for 30 minutes!`;
            color = 0xf1c40f;
        } else if (rng < 0.60) {
            const pool = Object.values(ITEMS).filter(item => item.rarity === 'Rare' && !item.isUnique);
            const rolled = await getRandomAvailableItem(pool);
            addItem(baubleData, rolled.id, 1);
            msg = `🐰 You rubbed the **🐰 Lucky Rabbit Toe**!\n\n✨ **LUCKY DROP!** You found a **${rolled.name}** dropped on the floor, plus a **+25% luck boost** for 30 minutes!`;
            color = 0x2ecc71;
        } else {
            msg = `🐰 You rubbed the **🐰 Lucky Rabbit Toe**!\n\n🍀 **Lucky!** You receive a **+25% luck boost** on all Coinflip and Gamble actions for the next 30 minutes. Bad luck cleared!`;
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
            return { success: false, msg: `🛡️ **${targetUser.username}** is shielding! Your fish slaps their Bubble Wrap Armor and splashes water.`, ephemeral: true };
        }

        removeItem(baubleData, 'fish', 1);
        const stolen = Math.min(targetData.baubles, Math.floor(Math.random() * 2001) + 1000); // 1k-3k baubles
        
        targetData.baubles -= stolen;
        baubleData.baubles += stolen;
        await targetData.save();

        msg = `🐟 **SLAP!** You grabbed the slimy **Wet Carp Slap** by the tail and slapped **${targetUser.username}** across the face! \n\nThey drop **${stolen.toLocaleString()} Baubles** out of pure surprise, which you pocket!`;
        color = 0x95A5A6;

    } else if (itemId === 'golden_fish') {
        removeItem(baubleData, 'golden_fish', 1);
        const roll = Math.random();
        if (roll < 0.75) {
            const pool = Object.values(ITEMS).filter(item => (item.rarity === 'Rare' || item.rarity === 'Epic') && !item.isUnique);
            const rolled = await getRandomAvailableItem(pool);
            addItem(baubleData, rolled.id, 1);
            msg = `🐠 You fed the **🐠 Glowing Mutant Guppy** some fish flakes... \n\n✨ It swam in a circle and pooped out a **${rolled.name}**! How magical!`;
            color = 0xF1C40F;
        } else {
            const bill = 500;
            baubleData.baubles = Math.max(0, baubleData.baubles - bill);
            msg = `🐠 You tried to feed the **🐠 Glowing Mutant Guppy**... \n\n🩸 **SNAP!** It bit your finger! You pay a **${bill} Bauble** medical bill.`;
            color = 0xE74C3C;
        }

    } else if (itemId === 'treasure_chest') {
        removeItem(baubleData, 'treasure_chest', 1);
        const coins = Math.floor(Math.random() * 15001) + 15000; // 15000-30000 baubles
        baubleData.baubles += coins;

        // Give 2 random items including at least one Epic/Legendary
        const highPool = Object.values(ITEMS).filter(item => (item.rarity === 'Epic' || item.rarity === 'Legendary') && !item.isUnique);
        const commonPool = ['coffee', 'mystery_box', 'rotten_banana', 'broken_keyboard', 'clover'];
        const rolled1 = await getRandomAvailableItem(highPool);
        const rolled2 = await getRandomAvailableItem(commonPool);
        const item1 = rolled1.id;
        const item2 = rolled2.id;
        addItem(baubleData, item1, 1);
        addItem(baubleData, item2, 1);

        msg = `🏴‍☠️ You crowbar open the **🏴‍☠️ Sunken Loot Crate**!\n\n💰 Inside you find **${coins.toLocaleString()} Baubles**, a **${ITEMS[item1].name}**, and a **${ITEMS[item2].name}**! What a loot haul!`;
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
            
            const loot = Math.min(victimData.baubles, Math.floor(Math.random() * 10001) + 5000); // 5k-15k baubles
            victimData.baubles -= loot;
            baubleData.baubles += loot;
            await victimData.save();

            msg = `🏺 You opened the **🏺 Haunted Dial-Up Urn**! Screeching dial-up sounds echoed through the channel. \n\n🧟 A spooky digital mummy rose, raided **${victim.username}**'s pockets, stole **${loot.toLocaleString()} Baubles**, and handed them to you!`;
            color = 0x9B59B6;
        } else {
            msg = `🏺 You opened the **🏺 Haunted Dial-Up Urn**! Screeching dial-up sounds echoed through the channel, but no other users were found. The curse faded into the void.`;
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

        // Steal 1 random item
        let stolenItemMsg = '';
        if (targetData.inventory && targetData.inventory.length > 0) {
            const validItems = targetData.inventory.filter(i => i.quantity > 0 && !ITEMS[i.itemId]?.isUnique);
            if (validItems.length > 0) {
                const stolenItem = validItems[Math.floor(Math.random() * validItems.length)];
                removeItem(targetData, stolenItem.itemId, 1);
                addItem(baubleData, stolenItem.itemId, 1);
                await targetData.save();
                stolenItemMsg = `\n\n🕵️ **STEAL SUCCESSFUL:** You also snuck in and stole **1x ${ITEMS[stolenItem.itemId]?.name || stolenItem.itemId}** from their bag!`;
            }
        }

        msg = `🐚 You hold the **🐚 Spyware Seashell** to your ear... frequencies lock on to **${targetUser.username}**!\n\n📡 **Full Scan Results:**\n${scanLines.join('\n')}${stolenItemMsg}\n\n_Shell crumbles to dust after one use._`;
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

            const dug = Math.min(victimData.baubles, Math.floor(Math.random() * 5001) + 3000); // 3000-8000
            victimData.baubles -= dug;
            baubleData.baubles += dug;
            await victimData.save();

            msg = `🦴 You hold up the **🦴 Ancient Dog Chew Toy** and whistle! \n\n🐕 The **Ancient Dog** appears, runs off, digs up **${dug.toLocaleString()} Baubles** from **${victim.username}**'s backyard wallet, and brings them to you! Good boy!`;
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
            return { success: false, msg: `🛡️ **${targetUser.username}** is shielding! Your roar bounces off their Bubble Wrap Armor.`, ephemeral: true };
        }

        removeItem(baubleData, 't_rex_skull', 1);
        const win = Math.random() < 0.70;
        const duels = Math.floor(Math.random() * 10001) + 5000; // 5k-15k

        if (win) {
            const stealAmount = Math.min(targetData.baubles, duels);
            targetData.baubles -= stealAmount;
            baubleData.baubles += stealAmount;
            await targetData.save();

            msg = `🦖 You put on the **🦖 Dino Jump-Scare Mask** and let out a blood-curdling roar at **${targetUser.username}**! \n\n😱 They jumped so high they dropped **${stealAmount.toLocaleString()} Baubles**, which you pocketed immediately!`;
            color = 0x2ECC71;
        } else {
            const loseAmount = Math.min(baubleData.baubles, 2500);
            baubleData.baubles -= loseAmount;
            targetData.baubles += loseAmount;
            await targetData.save();

            msg = `🦖 You put on the **🦖 Dino Jump-Scare Mask** and roared at **${targetUser.username}**! \n\n😐 They didn't even flinch. Instead, they laughed at your plastic mask and took **${loseAmount.toLocaleString()} Baubles** from your pocket!`;
            color = 0xE74C3C;
        }

    } else if (itemId === 'common_meme') {
        removeItem(baubleData, 'common_meme', 1);
        const roll = Math.random();
        if (roll < 0.25) {
            const viral = Math.floor(Math.random() * 5001) + 5000; // 5000-10000
            baubleData.baubles += viral;
            msg = `🐸 You posted the **🐸 Stale Pepeland JPEG** and it unexpectedly exploded!\n\n🔥 **GOING VIRAL!** It got reposted 400k times overnight. The ad revenue hits your wallet — **${viral.toLocaleString()} Baubles**!`;
            color = 0xf1c40f;
        } else if (roll < 0.85) {
            const gain = Math.floor(Math.random() * 2001) + 1000; // 1000-3000
            baubleData.baubles += gain;
            msg = `🐸 You posted the **🐸 Stale Pepeland JPEG** in the chat!\n\n📈 **UPVOTED!** Chat respects the classics. You pocket **${gain.toLocaleString()} Baubles** in internet validation!`;
            color = 0x2ECC71;
        } else {
            const loss = 500;
            baubleData.baubles = Math.max(0, baubleData.baubles - loss);
            msg = `🐸 You posted the **🐸 Stale Pepeland JPEG** in the chat...\n\n📉 **RATIO'D!** The chat was not feeling it. Someone replied "cringe" and you lost **${loss.toLocaleString()} Baubles** in dignity.`;
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
            const cringeDmg = Math.min(victimData.baubles, Math.floor(Math.random() * 3001) + 2000); // 2000-5000
            victimData.baubles = Math.max(0, victimData.baubles - cringeDmg);
            victimData.workStenchExpiresAt = new Date(Date.now() + 600000); // 10 min work lockout
            await victimData.save();

            msg = `💀 You whip out the **💀 Deep-Fried Rage Comic** and force **${victim.username}** to read it!\n\n😖 They cringe so violently they convulse, drop **${cringeDmg.toLocaleString()} Baubles**, and are locked from working for **10 minutes**!`;
        } else {
            const selfCringe = Math.min(baubleData.baubles, 500);
            baubleData.baubles = Math.max(0, baubleData.baubles - selfCringe);
            msg = `💀 You posted the **💀 Deep-Fried Rage Comic** but nobody was around...\n\nYou re-read it yourself and cringed so hard you dropped **${selfCringe.toLocaleString()} Baubles**.`;
        }
        color = 0xE74C3C;

    } else if (itemId === 'ancient_meme') {
        removeItem(baubleData, 'ancient_meme', 1);
        const rates = [1.5, 2.0, 3.0];
        const rolledRate = rates[Math.floor(Math.random() * rates.length)];
        
        const { setTempMultiplier } = require('../../utils/economyEngine');
        setTempMultiplier(rolledRate, 600000); // 10 minutes

        msg = `📜 You posted the **📜 Dial-up Dancing Baby**! The ancient gods of internet humor have awakened! \n\n🌀 **ECONOMY SHIFT:** The global economy multiplier is set to **${rolledRate}x** for the next 10 minutes!`;
        color = 0xF1C40F;

    } else if (itemId === 'legendary_meme') {
        removeItem(baubleData, 'legendary_meme', 1);
        let count = 0;
        try {
            const members = channel.members.filter(m => !m.user.bot && m.user.id !== userId);
            for (const member of members.values()) {
                let uData = await Bauble.findOne({ userId: member.user.id });
                if (!uData) uData = new Bauble({ userId: member.user.id });
                uData.baubles += 1000;
                await uData.save();
                count++;
            }
        } catch (_) {}

        baubleData.baubles += 10000;
        baubleData.activeTitle = 'Meme Lord';
        if (!baubleData.titles.includes('Meme Lord')) {
            baubleData.titles.push('Meme Lord');
        }

        msg = `👑 **NEVER GONNA GIVE YOU UP!** You Rickrolled the entire server! \n\n🎉 You gave **1,000 Baubles** to **${count}** users online, pocketed **10,000 Baubles** yourself, and unlocked the permanent title **"Meme Lord"**!`;
        color = 0xF1C40F;

    } else if (itemId === 'rubber_duck') {
        const roll = Math.random();
        if (roll < 0.15) {
            const itemsPool = ['coffee', 'clover', 'mystery_box', 'shield', 'rabbits_feet', 'broken_laptop', 'gaming_pc'];
            const rolled = await getRandomAvailableItem(itemsPool);
            const itemGot = rolled.id;
            addItem(baubleData, itemGot, 1);
            msg = `🦆 You squeeze the **🦆 Sentient Rubber Duck**: \`*SQUEAK!*\`\n\n🛠️ **BUG FIXED:** The duck audited the codebase and leaked a free **${ITEMS[itemGot].name}** into your bag!`;
            color = 0x2ECC71;
        } else if (roll < 0.30) {
            const coins = Math.floor(Math.random() * 3001) + 2000; // 2000-5000
            baubleData.baubles += coins;
            msg = `🦆 You squeeze the **🦆 Sentient Rubber Duck**: \`*SQUEAK!*\`\n\n💰 **MEMORY LEAK:** The duck discovered a memory leak, redirecting **${coins.toLocaleString()} Baubles** to your wallet!`;
            color = 0xf1c40f;
        } else if (roll < 0.35) {
            baubleData.itemLockoutExpiresAt = new Date(Date.now() + 30000); // 30s lockout
            msg = `🦆 You squeeze the **🦆 Sentient Rubber Duck**: \`*SQUEAK!*\`\n\n💥 **SEGFAULT:** The duck crashed your terminal! You cannot use items for **30 seconds**.`;
            color = 0xE74C3C;
        } else {
            const quips = [
                `It stares back with dead plastic eyes, quietly judging your spaghetti code.`,
                `It lets out a confident squeak and ignores your questions.`,
                `It squeaks softly, suggesting you rewrite everything in Rust.`,
                `It suggests a restart. Classic duck advice.`,
            ];
            shouldSave = false;
            msg = `🦆 You squeeze the **🦆 Sentient Rubber Duck**: \`*SQUEAK!*\`\n\n${quips[Math.floor(Math.random() * quips.length)]}`;
            color = 0x3498db;
        }

    } else if (itemId === 'golden_duck') {
        removeItem(baubleData, 'golden_duck', 1);
        const payout = Math.floor(Math.random() * 40001) + 40000; // 40,000 - 80,000
        baubleData.baubles += payout;
        msg = `🟡 You smelted the **🟡 Smeltable Aurum Duck** in a blast furnace!\n\n💰 You poured out **${payout.toLocaleString()} Baubles** of pure gold!`;
        color = 0xF1C40F;

    } else if (itemId === 'pirate_duck') {
        removeItem(baubleData, 'pirate_duck', 1);
        const GlobalEconomy = require('../../models/GlobalEconomy');
        let globalEco = await GlobalEconomy.findOne();
        if (!globalEco) globalEco = new GlobalEconomy();

        let plunder = Math.floor(Math.random() * 10001) + 5000; // 5000-15000
        plunder = Math.min(globalEco.taxFund || 0, plunder);
        if (plunder < 5000) plunder = Math.min(5000, globalEco.taxFund || 0);

        if (plunder > 0) {
            globalEco.taxFund -= plunder;
            baubleData.baubles += plunder;
            await globalEco.save();
            msg = `🏴‍☠️ You sent the **🏴‍☠️ Tax Evader Duck** to raid the federal reserve! \n\n🦜 It squeaked, plundered the vault, and stole **${plunder.toLocaleString()} Baubles** from the government Tax Fund!`;
            color = 0xF1C40F;
        } else {
            msg = `🏴‍☠️ You sent the **🏴‍☠️ Tax Evader Duck** to plunder the tax fund, but the government is bankrupt. Nothing was stolen.`;
            color = 0x7F8C8D;
        }

    } else if (itemId === 'space_duck') {
        removeItem(baubleData, 'space_duck', 1);
        baubleData.spaceDuckExpiresAt = new Date(Date.now() + 3600000); // 1 hour
        msg = `🚀 You launched the **🚀 Spy Satellite Duck** into a low-Earth orbit! \n\n📡 For the next **1 hour**, it will intercept **15% of all earnings/transactions** made by other players!`;
        color = 0x3498DB;

    } else if (itemId === 'divine_duck') {
        removeItem(baubleData, 'divine_duck', 1);
        baubleData.divineDuckExpiresAt = new Date(Date.now() + 1800000); // 30 minutes
        msg = `✨ You sacrificed the **✨ Holy Ascension Duck** to the sky gods!\n\nA golden beam blesses your pouch, granting a **+200% income boost** on all commands for the next 30 minutes!`;
        color = 0xF1C40F;

    } else if (itemId === 'broken_laptop') {
        removeItem(baubleData, 'broken_laptop', 1);
        const roll = Math.random();
        if (roll < 0.35) {
            addItem(baubleData, 'gaming_pc', 1);
            msg = `💻 You booted the swollen **💻 Spicy Pillow Laptop**... \n\n🎉 **IT ALIVES!** The hardware somehow upgraded into a fully functional **🖥️ DIY Crypto Miner**!`;
            color = 0x2ECC71;
        } else {
            baubleData.itemLockoutExpiresAt = new Date(Date.now() + 180000); // 3 minutes
            msg = `💻 You booted the swollen **💻 Spicy Pillow Laptop**... \n\n💥 **ZAP!** The lithium battery exploded, sending a shock through your hands! Locked out of items for **3 minutes**!`;
            color = 0xE74C3C;
        }

    } else if (itemId === 'gaming_pc') {
        removeItem(baubleData, 'gaming_pc', 1);
        const rng = Math.random();
        if (rng < 0.25) {
            msg = `🖥️ You booted the **🖥️ DIY Crypto Miner** to mine coin... but the cooling fan exploded! \n\n💥 The PC melted into a puddle of toxic slime and was destroyed!`;
            color = 0xE74C3C;
        } else {
            const coins = Math.floor(Math.random() * 5001) + 5000; // 5k-10k
            baubleData.baubles += coins;
            msg = `🖥️ You successfully mined with the **🖥️ DIY Crypto Miner**!\n\nYou generated **${coins.toLocaleString()} Baubles** before the hardware burnt out and died!`;
            color = 0x2ECC71;
        }

    } else if (itemId === 'quantum_computer') {
        removeItem(baubleData, 'quantum_computer', 1);
        const roll = Math.random();
        if (roll < 0.60) {
            const payout = 150000;
            baubleData.baubles += payout;
            msg = `🔮 You cranked up the **🔮 Quantum Casino Engine** to predict the future... \n\n🌌 **SUCCESS:** It resolved the winning numbers! You won the cosmic lottery and gained **150,000 Baubles**!`;
            color = 0xF1C40F;
        } else {
            let destroyed = [];
            if (baubleData.inventory && baubleData.inventory.length > 0) {
                for (let k = 0; k < 2; k++) {
                    if (baubleData.inventory.length === 0) break;
                    const idx = Math.floor(Math.random() * baubleData.inventory.length);
                    const itemRemoved = baubleData.inventory[idx].itemId;
                    removeItem(baubleData, itemRemoved, 1);
                    destroyed.push(ITEMS[itemRemoved]?.name || itemRemoved);
                }
            }
            const destroyedStr = destroyed.length > 0 ? `It sucked in: ${destroyed.join(', ')}!` : 'It only sucked in air.';
            msg = `🔮 You cranked up the **🔮 Quantum Casino Engine**... \n\n🕳️ **BLACK HOLE:** Qubits collapsed into a singularity! ${destroyedStr} The engine collapsed too!`;
            color = 0xE74C3C;
        }

    } else if (itemId === 'alien_computer') {
        if (!targetUser) {
            return { success: false, msg: '👽 Area 51 Console requires a target user to abduct! Usage: `-use alien_computer @User`', ephemeral: true };
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
            targetData.beamedExpiresAt = new Date(Date.now() + 600000); // 10m
            await targetData.save();
            msg = `👽 You type coordinates into the **👽 Area 51 Console**... \n\n🛸 **ZOOP!** A UFO flashes overhead and beams up **${targetUser.username}**! They are locked out of all bot commands for the next **10 minutes**!`;
            color = 0x9B59B6;
        } else {
            const pool = Object.values(ITEMS).filter(item => !item.isUnique);
            const highPool = Object.values(ITEMS).filter(item => (item.rarity === 'Legendary' || item.rarity === 'Mythic') && !item.isUnique);
            const itemsGot = [];
            
            // 1 guaranteed legendary/mythic
            const guaranteed = await getRandomAvailableItem(highPool);
            addItem(baubleData, guaranteed.id, 1);
            itemsGot.push(guaranteed.name);

            // 4 random
            for (let i = 0; i < 4; i++) {
                const itemPicked = await getRandomAvailableItem(pool);
                addItem(baubleData, itemPicked.id, 1);
                itemsGot.push(itemPicked.name);
            }
            msg = `👽 You type coordinates into the **👽 Area 51 Console**... \n\n📦 The mothership drops down space cargo! Inside, you find: ${itemsGot.join(', ')}!`;
            color = 0x2ECC71;
        }

    } else if (itemId === 'dragon_egg') {
        removeItem(baubleData, 'dragon_egg', 1);
        const roll = Math.random();
        if (roll < 0.50) {
            let totalStolen = 0;
            let count = 0;
            try {
                const members = channel.members.filter(m => !m.user.bot && m.user.id !== userId);
                for (const member of members.values()) {
                    let uData = await Bauble.findOne({ userId: member.user.id });
                    if (uData && uData.baubles >= 500 && (!uData.invisibilityExpiresAt || Date.now() >= new Date(uData.invisibilityExpiresAt).getTime()) && (!uData.shieldExpiresAt || Date.now() >= new Date(uData.shieldExpiresAt).getTime())) {
                        const stolen = Math.floor(Math.random() * 2001) + 1000; // 1000-3000
                        const actual = Math.min(stolen, uData.baubles);
                        uData.baubles -= actual;
                        await uData.save();
                        totalStolen += actual;
                        count++;
                    }
                }
            } catch (_) {}

            baubleData.baubles += totalStolen;
            msg = `🥚 **CRACK!** A baby dragon hatched from the **🥚 Scaly Fireball Egg**! \n\n🔥 It flew around the channel, stealing **${totalStolen.toLocaleString()} Baubles** from **${count}** users, and dropped it in your lap!`;
            color = 0x2ECC71;
        } else {
            const loss = Math.min(baubleData.baubles, 5000);
            baubleData.baubles -= loss;
            msg = `🥚 **CRACK!** You tried to hatch the **🥚 Scaly Fireball Egg**... \n\n🔥 But it sneezed fireball, burned **${loss.toLocaleString()} Baubles** in your wallet, and flew away!`;
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
        if (roll < 0.05) {
            baubleData.activeTitle = null;
            baubleData.titles = [];
            msg = `⭐ You ran **⭐ black_hole.exe**! \n\n🌌 All status penalties have been purged! \n\n🕳️ **VOID CONSUMPTION:** Unfortunately, the program devoured your active title and entire list of unlocked titles!`;
            color = 0xE74C3C;
        } else {
            msg = `⭐ You ran **⭐ black_hole.exe**! \n\n🌌 All status penalties, blindness, and lockouts have been purged from your body. You feel clean!`;
            color = 0x3498DB;
        }

    } else if (itemId === 'the_one_ring') {
        removeItem(baubleData, 'the_one_ring', 1);
        baubleData.invisibilityExpiresAt = new Date(Date.now() + 14400000); // 4 hours invisibility
        msg = `💍 You slip on the **💍 Ring of Absolute Cowardice** and vanish from reality!\n\nYou are now **invisible for 4 hours**! You are immune to robberies, but you cannot rob anyone else either.`;
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
            return { success: false, msg: `❌ **${targetUser.username}** is currently invisible!`, ephemeral: true };
        }
        if (targetData.shieldExpiresAt && nowTime < new Date(targetData.shieldExpiresAt).getTime()) {
            return { success: false, msg: `🛡️ **${targetUser.username}** is shielding! Your challenge is blocked.`, ephemeral: true };
        }

        removeItem(baubleData, 'excalibur', 1);
        const win = Math.random() < 0.50;
        const duelCoins = 20000;

        if (win) {
            const stealAmount = Math.min(targetData.baubles, duelCoins);
            targetData.baubles -= stealAmount;
            baubleData.baubles += stealAmount;
            await targetData.save();

            msg = `⚔️ You squeaked your **⚔️ Excalibur (Plastic Replica)** at **${targetUser.username}** to duel!\n\n✨ You won and stole **${stealAmount.toLocaleString()}** Baubles from their wallet!`;
            color = 0xf1c40f;
        } else {
            const stealAmount = Math.min(baubleData.baubles, duelCoins);
            baubleData.baubles -= stealAmount;
            targetData.baubles += stealAmount;
            await targetData.save();

            msg = `⚔️ You squeaked your **⚔️ Excalibur (Plastic Replica)** at **${targetUser.username}** to duel!\n\n💨 Oh no! They disarm you with a feather and confiscated **${stealAmount.toLocaleString()}** Baubles from you!`;
            color = 0xe74c3c;
        }

    } else if (itemId === 'holy_grail') {
        removeItem(baubleData, 'holy_grail', 1);
        baubleData.activeExpedition = { startedAt: null, endTime: null, status: 'idle' }; // Cure expedition injuries
        baubleData.divineDuckExpiresAt = new Date(Date.now() + 3600000); // 1 hour +100% boost (represented by divineDuckExpiresAt)
        msg = `🏆 You drink from the **🏆 Shiny Wooden Cup**!\n\nYour expedition injuries are cured, and you receive a **+100% income boost** on all commands for 1 hour!`;
        color = 0xf1c40f;

    } else if (itemId === 'mona_lisa') {
        removeItem(baubleData, 'mona_lisa', 1);
        baubleData.baubles += 50000;
        baubleData.activeTitle = 'Art Vandal';
        if (!baubleData.titles.includes('Art Vandal')) {
            baubleData.titles.push('Art Vandal');
        }

        msg = `🖼️ You drew a giant mustard handlebar mustache onto the **🖼️ Mustard-Stained Mona Lisa**! \n\n🎭 The museum directors cried, but the chat donated **50,000 Baubles** to you! You unlocked the title **"Art Vandal"**! \n\n*(Note: Its sell value is defaced.)*`;
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
