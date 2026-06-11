/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, StringSelectMenuBuilder } = require('discord.js');
const Family = require('../../models/familySchema');
const Bauble = require('../../models/baubleSchema');

const RING_ITEMS = {
    ring_silver: { name: '💍 Ring of Mild Interest', emoji: '💍' },
    ring_gold: { name: '💍 Ring of Financial Strain', emoji: '💍' },
    ring_diamond: { name: '💎 Ring of Devastating Debt', emoji: '💎' }
};

module.exports = {
    category: 'fun',
    cooldown: 8,
    data: new SlashCommandBuilder()
        .setName('marry')
        .setDescription('Propose marriage to another user!')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user you want to propose to')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply();
        const proposer = interaction.user;
        const target = interaction.options.getUser('user');

        await handleProposalLogic(interaction, proposer, target, true);
    },

    async executePrefix(message, args) {
        const proposer = message.author;
        const target = message.mentions.users.first() 
            || (args[0] ? await message.client.users.fetch(args[0].replace(/[<@!>]/g, '')).catch(() => null) : null);

        if (!target) {
            return message.reply('❌ Mention the user you want to propose to!').catch(() => {});
        }

        const msgIndicator = await message.reply('💍 Processing proposal...');
        await handleProposalLogic(msgIndicator, proposer, target, false, message);
    }
};

async function handleProposalLogic(replyContext, proposer, target, isSlash, prefixMessage) {
    if (proposer.id === target.id) {
        return editReply(replyContext, isSlash, "❌ You cannot marry yourself! That's just sad.");
    }
    if (target.bot) {
        return editReply(replyContext, isSlash, "❌ You cannot marry a bot! Robots don't feel love... yet.");
    }

    const proposerFamily = await Family.findOne({ userId: proposer.id }) || new Family({ userId: proposer.id });
    const targetFamily = await Family.findOne({ userId: target.id }) || new Family({ userId: target.id });

    if (proposerFamily.spouseId) {
        return editReply(replyContext, isSlash, "❌ You are already married! Do you want to be called out for cheating? Divorce your spouse first.");
    }
    if (targetFamily.spouseId) {
        return editReply(replyContext, isSlash, "❌ This person is already married! Don't try to break their family.");
    }

    const proposerEconomy = await Bauble.findOne({ userId: proposer.id });
    if (!proposerEconomy || !proposerEconomy.inventory) {
        return editReply(replyContext, isSlash, "❌ You don't have a wedding ring! Buy a `ring_silver`, `ring_gold`, or `ring_diamond` from the shop (`-shop`) first!");
    }

    const availableRings = proposerEconomy.inventory.filter(i => ['ring_silver', 'ring_gold', 'ring_diamond'].includes(i.itemId) && i.quantity > 0);
    if (availableRings.length === 0) {
        return editReply(replyContext, isSlash, "❌ You don't have a wedding ring! Buy one from the shop (`-shop`) first!");
    }

    if (availableRings.length === 1) {
        // Only one ring, proceed immediately
        return await sendProposal(replyContext, proposer, target, availableRings[0].itemId, isSlash);
    }

    // Multiple rings, prompt selection
    const options = availableRings.map(ring => {
        const itemDef = RING_ITEMS[ring.itemId];
        return {
            label: itemDef.name,
            description: `You own ${ring.quantity} of these`,
            value: ring.itemId,
            emoji: itemDef.emoji
        };
    });

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('select_ring')
        .setPlaceholder('Select a ring to propose with')
        .addOptions(options);

    const row = new ActionRowBuilder().addComponents(selectMenu);
    const embed = new EmbedBuilder()
        .setColor(0xf472b6)
        .setTitle('💍 Choose Your Ring')
        .setDescription(`You have multiple wedding rings. Which one do you want to use to propose to **${target.username}**?`);

    let msg;
    if (isSlash) {
        msg = await replyContext.editReply({ embeds: [embed], components: [row] });
    } else {
        msg = await replyContext.edit({ content: null, embeds: [embed], components: [row] });
    }

    const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        time: 60000,
        filter: i => i.user.id === proposer.id
    });

    collector.on('collect', async i => {
        await i.deferUpdate();
        collector.stop('selected');
        await sendProposal(isSlash ? replyContext : msg, proposer, target, i.values[0], isSlash, true);
    });

    collector.on('end', (collected, reason) => {
        if (reason === 'time') {
            msg.edit({ content: '❌ Ring selection timed out.', embeds: [], components: [] }).catch(() => {});
        }
    });
}

async function editReply(replyContext, isSlash, content) {
    if (isSlash) {
        return replyContext.editReply({ content });
    } else {
        return replyContext.edit({ content });
    }
}

async function sendProposal(replyContext, proposer, target, ringId, isSlash, isUpdate = false) {
    const proposerFamily = await Family.findOne({ userId: proposer.id }) || new Family({ userId: proposer.id });
    const targetFamily = await Family.findOne({ userId: target.id }) || new Family({ userId: target.id });

    // Check if target had already proposed to proposer (auto-accept)
    if (proposerFamily.pendingSpouseProposal === target.id) {
        const ringUsed = proposerFamily.pendingSpouseRing || 'ring_silver';
        proposerFamily.spouseId = target.id;
        targetFamily.spouseId = proposer.id;
        proposerFamily.ringUsed = ringUsed;
        targetFamily.ringUsed = ringUsed;
        proposerFamily.pendingSpouseProposal = null;
        targetFamily.pendingSpouseProposal = null;
        proposerFamily.pendingSpouseRing = null;
        targetFamily.pendingSpouseRing = null;
        await proposerFamily.save();
        await targetFamily.save();

        const embed = new EmbedBuilder()
            .setColor(0x4ade80)
            .setTitle('💖 MARRIAGE ACCEPTED!')
            .setDescription(`**${proposer.username}** and **${target.username}** had already proposed to each other, so they are now officially married! 🎉`)
            .setTimestamp();
        
        if (isUpdate && !isSlash) return replyContext.edit({ embeds: [embed], components: [] });
        return editReply(replyContext, isSlash, { content: null, embeds: [embed] });
    }

    targetFamily.pendingSpouseProposal = proposer.id;
    targetFamily.pendingSpouseRing = ringId; // Store which ring is being used
    await targetFamily.save();

    const ringDef = RING_ITEMS[ringId];

    const embed = new EmbedBuilder()
        .setColor(0x7c6cf0)
        .setTitle('💍 Marriage Proposal!')
        .setDescription(`**${proposer.username}** has proposed to **${target.username}** with a **${ringDef.name}**!\n\n*${target.username}, do you accept?*`)
        .setFooter({ text: 'This proposal will expire in 60 seconds.' })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('accept_marriage')
            .setLabel('Accept')
            .setStyle(ButtonStyle.Success)
            .setEmoji('💖'),
        new ButtonBuilder()
            .setCustomId('decline_marriage')
            .setLabel('Decline')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('💔')
    );

    let mainMsg;
    if (isUpdate && !isSlash) {
        mainMsg = await replyContext.edit({ content: null, embeds: [embed], components: [row] });
    } else {
        if (isSlash) {
            mainMsg = await replyContext.editReply({ content: null, embeds: [embed], components: [row] });
        } else {
            mainMsg = await replyContext.edit({ content: null, embeds: [embed], components: [row] });
        }
    }

    handleMarriageCollector(mainMsg, proposer, target, ringId);
}

function handleMarriageCollector(message, proposer, target, ringId) {
    const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60000
    });

    collector.on('collect', async i => {
        if (i.user.id !== target.id) {
            return i.reply({ content: `❌ Only **${target.username}** can respond to this proposal!`, ephemeral: true });
        }

        await i.deferUpdate();

        const proposerFamily = await Family.findOne({ userId: proposer.id });
        const targetFamily = await Family.findOne({ userId: target.id });

        if (!proposerFamily || !targetFamily) {
            return i.followUp({ content: '❌ Data error occurred.', ephemeral: true });
        }

        if (i.customId === 'accept_marriage') {
            if (proposerFamily.spouseId || targetFamily.spouseId) {
                targetFamily.pendingSpouseProposal = null;
                targetFamily.pendingSpouseRing = null;
                await targetFamily.save();
                const embed = new EmbedBuilder()
                    .setColor(0xf87171)
                    .setTitle('💔 Proposal Cancelled')
                    .setDescription('One of you got married to someone else in the meantime!');
                return message.edit({ embeds: [embed], components: [] });
            }

            // Verify the proposer still has the specific ring
            const proposerEco = await Bauble.findOne({ userId: proposer.id });
            const ringIndex = proposerEco?.inventory?.findIndex(item => item.itemId === ringId && item.quantity > 0);
            
            if (!proposerEco || ringIndex === -1 || ringIndex === undefined) {
                const embed = new EmbedBuilder()
                    .setColor(0xf87171)
                    .setTitle('❌ Missing Ring')
                    .setDescription(`**${proposer.username}** no longer has the **${RING_ITEMS[ringId].name}** in their inventory! The proposal failed.`);
                return message.edit({ embeds: [embed], components: [] });
            }

            // Deduct the ring
            proposerEco.inventory[ringIndex].quantity -= 1;
            await proposerEco.save();

            proposerFamily.spouseId = target.id;
            targetFamily.spouseId = proposer.id;
            proposerFamily.ringUsed = ringId;
            targetFamily.ringUsed = ringId;
            proposerFamily.pendingSpouseProposal = null;
            targetFamily.pendingSpouseProposal = null;
            proposerFamily.pendingSpouseRing = null;
            targetFamily.pendingSpouseRing = null;
            
            await proposerFamily.save();
            await targetFamily.save();

            const embed = new EmbedBuilder()
                .setColor(0x4ade80)
                .setTitle('💖 JUST MARRIED!')
                .setDescription(`🎉 **${target.username}** accepted the proposal! **${proposer.username}** and **${target.username}** are now officially married with a **${RING_ITEMS[ringId].name}**! 🎉`)
                .setTimestamp();

            await message.edit({ embeds: [embed], components: [] });
        } else {
            targetFamily.pendingSpouseProposal = null;
            targetFamily.pendingSpouseRing = null;
            await targetFamily.save();

            const embed = new EmbedBuilder()
                .setColor(0xf87171)
                .setTitle('💔 Proposal Declined')
                .setDescription(`**${target.username}** has politely declined the marriage proposal. Ouch.`);

            await message.edit({ embeds: [embed], components: [] });
        }
        collector.stop();
    });

    collector.on('end', async (collected, reason) => {
        if (reason === 'time') {
            const targetFamily = await Family.findOne({ userId: target.id });
            if (targetFamily && targetFamily.pendingSpouseProposal === proposer.id) {
                targetFamily.pendingSpouseProposal = null;
                targetFamily.pendingSpouseRing = null;
                await targetFamily.save();
            }

            const embed = new EmbedBuilder()
                .setColor(0xf87171)
                .setTitle('⏰ Proposal Expired')
                .setDescription(`The marriage proposal from **${proposer.username}** to **${target.username}** has expired.`);

            await message.edit({ embeds: [embed], components: [] }).catch(() => {});
        }
    });
}
