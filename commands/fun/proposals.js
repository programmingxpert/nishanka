/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const Family = require('../../models/familySchema');
const Bauble = require('../../models/baubleSchema');

module.exports = {
    category: 'fun',
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('proposals')
        .setDescription('View and respond to pending marriage or adoption proposals!'),

    async execute(interaction) {
        await interaction.deferReply();
        const user = interaction.user;

        const { embed, components, error } = await getProposalsMessage(user);

        if (error) {
            return interaction.editReply({ content: `❌ ${error}` });
        }

        if (!components) {
            return interaction.editReply({ embeds: [embed] });
        }

        const msg = await interaction.editReply({ embeds: [embed], components: [components] });
        handleProposalsCollector(msg, user);
    },

    async executePrefix(message, args) {
        const user = message.author;
        const msgIndicator = await message.reply('📬 Fetching proposals...');
        const { embed, components, error } = await getProposalsMessage(user);

        if (error) {
            return msgIndicator.edit({ content: `❌ ${error}` }).catch(() => {});
        }

        await msgIndicator.delete().catch(() => {});
        if (!components) {
            return message.reply({ embeds: [embed] });
        }

        const mainMsg = await message.reply({ embeds: [embed], components: [components] });
        handleProposalsCollector(mainMsg, user);
    }
};

async function getProposalsMessage(user) {
    let familyData = await Family.findOne({ userId: user.id });
    if (!familyData) {
        familyData = new Family({ userId: user.id });
        await familyData.save();
    }

    const embed = new EmbedBuilder()
        .setColor(0x7c6cf0)
        .setTitle('📬 Pending Family Proposals')
        .setTimestamp()
        .setFooter({ text: 'Use buttons below to accept/decline' });

    let hasProposals = false;
    const row = new ActionRowBuilder();

    // Marriage Proposal
    if (familyData.pendingSpouseProposal) {
        const ringId = familyData.pendingSpouseRing;
        let ringText = "a Wedding Ring";
        if (ringId === 'ring_silver') ringText = "a 💍 Silver Wedding Ring";
        if (ringId === 'ring_gold') ringText = "a 💍 Gold Wedding Ring";
        if (ringId === 'ring_diamond') ringText = "a 💎 Diamond Wedding Ring";
        
        embed.addFields({ name: '💍 Marriage Proposal', value: `Proposer: <@${familyData.pendingSpouseProposal}>\nThey proposed with ${ringText}!\n*Do you want to accept?*` });
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`prop_accept_marriage_${familyData.pendingSpouseProposal}`)
                .setLabel('Accept Marriage')
                .setStyle(ButtonStyle.Success)
                .setEmoji('💖'),
            new ButtonBuilder()
                .setCustomId(`prop_decline_marriage_${familyData.pendingSpouseProposal}`)
                .setLabel('Decline Marriage')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('💔')
        );
        hasProposals = true;
    }

    // Adoption Proposals (limit to first one for UI button handling)
    if (familyData.pendingAdoptionProposals && familyData.pendingAdoptionProposals.length > 0 && !familyData.pendingSpouseProposal) {
        const parentId = familyData.pendingAdoptionProposals[0];
        embed.addFields({ name: '👶 Adoption Proposal', value: `Proposer: <@${parentId}>\n*Do you want to be adopted by them?*` });
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`prop_accept_adoption_${parentId}`)
                .setLabel('Accept Adoption')
                .setStyle(ButtonStyle.Success)
                .setEmoji('🍼'),
            new ButtonBuilder()
                .setCustomId(`prop_decline_adoption_${parentId}`)
                .setLabel('Decline Adoption')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🚪')
        );
        hasProposals = true;
    }

    if (!hasProposals) {
        embed.setDescription('You have no pending proposals at the moment. Go find someone to propose to!');
        return { embed };
    }

    return { embed, components: row };
}

function handleProposalsCollector(message, user) {
    const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60000
    });

    collector.on('collect', async i => {
        if (i.user.id !== user.id) {
            return i.reply({ content: '❌ You cannot interact with this menu!', ephemeral: true });
        }

        await i.deferUpdate();

        const customId = i.customId;
        const familyData = await Family.findOne({ userId: user.id });
        if (!familyData) return;

        if (customId.startsWith('prop_accept_marriage_')) {
            const proposerId = customId.split('_')[3];
            const proposerFamily = await Family.findOne({ userId: proposerId });

            if (!proposerFamily || familyData.spouseId || proposerFamily.spouseId) {
                familyData.pendingSpouseProposal = null;
                await familyData.save();
                const embed = new EmbedBuilder()
                    .setColor(0xf87171)
                    .setTitle('❌ Failed to Accept')
                    .setDescription('One of you got married to someone else!');
                return message.edit({ embeds: [embed], components: [] });
            }

            // Verify the proposer still has the specific ring
            const proposerEco = await Bauble.findOne({ userId: proposerId });
            const requiredRingId = familyData.pendingSpouseRing;
            
            let ringIndex = -1;
            if (requiredRingId) {
                ringIndex = proposerEco?.inventory?.findIndex(item => item.itemId === requiredRingId && item.quantity > 0);
            } else {
                // Fallback for older proposals before the ring selection was added
                ringIndex = proposerEco?.inventory?.findIndex(item => ['ring_diamond', 'ring_gold', 'ring_silver'].includes(item.itemId) && item.quantity > 0);
            }

            if (!proposerEco || ringIndex === -1 || ringIndex === undefined) {
                const embed = new EmbedBuilder()
                    .setColor(0xf87171)
                    .setTitle('❌ Missing Ring')
                    .setDescription(`<@${proposerId}> no longer has the wedding ring in their inventory! The proposal failed.`);
                return message.edit({ embeds: [embed], components: [] });
            }

            // Deduct the ring
            proposerEco.inventory[ringIndex].quantity -= 1;
            await proposerEco.save();

            familyData.spouseId = proposerId;
            proposerFamily.spouseId = user.id;
            familyData.pendingSpouseProposal = null;
            proposerFamily.pendingSpouseProposal = null;
            familyData.pendingSpouseRing = null;
            proposerFamily.pendingSpouseRing = null;
            
            const allChildren = new Set([...familyData.children, ...proposerFamily.children]);
            const sharedChildren = Array.from(allChildren);
            
            familyData.children = sharedChildren;
            proposerFamily.children = sharedChildren;
            
            for (const childId of sharedChildren) {
                const childFamily = await Family.findOne({ userId: childId });
                if (childFamily) {
                    if (!childFamily.parents.includes(user.id)) childFamily.parents.push(user.id);
                    if (!childFamily.parents.includes(proposerId)) childFamily.parents.push(proposerId);
                    await childFamily.save();
                }
            }

            await familyData.save();
            await proposerFamily.save();

            const embed = new EmbedBuilder()
                .setColor(0x4ade80)
                .setTitle('💖 MARRIAGE ACCEPTED')
                .setDescription(`🎉 You accepted the proposal from <@${proposerId}>! You are now married. 🎉`);
            await message.edit({ embeds: [embed], components: [] });

        } else if (customId.startsWith('prop_decline_marriage_')) {
            const proposerId = customId.split('_')[3];
            familyData.pendingSpouseProposal = null;
            familyData.pendingSpouseRing = null;
            await familyData.save();

            const embed = new EmbedBuilder()
                .setColor(0xf87171)
                .setTitle('💔 Proposal Declined')
                .setDescription(`You declined the marriage proposal from <@${proposerId}>.`);
            await message.edit({ embeds: [embed], components: [] });

        } else if (customId.startsWith('prop_accept_adoption_')) {
            const parentId = customId.split('_')[3];
            if (familyData.parents.length >= 2) {
                familyData.pendingAdoptionProposals = familyData.pendingAdoptionProposals.filter(id => id !== parentId);
                await familyData.save();
                const embed = new EmbedBuilder()
                    .setColor(0xf87171)
                    .setTitle('❌ Adoption Failed')
                    .setDescription('You already have 2 parents!');
                return message.edit({ embeds: [embed], components: [] });
            }

            const parentFamily = await Family.findOne({ userId: parentId });
            
            // Verify proposer still has adoption papers
            const proposerEco = await Bauble.findOne({ userId: parentId });
            const paperIndex = proposerEco?.inventory?.findIndex(item => item.itemId === 'adoption_papers' && item.quantity > 0);
            if (!proposerEco || paperIndex === -1 || paperIndex === undefined) {
                const embed = new EmbedBuilder()
                    .setColor(0xf87171)
                    .setTitle('❌ Missing Papers')
                    .setDescription(`<@${parentId}> no longer has adoption papers in their inventory! The adoption failed.`);
                return message.edit({ embeds: [embed], components: [] });
            }

            if (parentFamily) {
                // Deduct papers
                proposerEco.inventory[paperIndex].quantity -= 1;
                await proposerEco.save();

                if (!familyData.parents.includes(parentId)) familyData.parents.push(parentId);
                if (!parentFamily.children.includes(user.id)) parentFamily.children.push(user.id);
                
                if (parentFamily.spouseId) {
                    const spouseFamily = await Family.findOne({ userId: parentFamily.spouseId });
                    if (spouseFamily) {
                        if (!familyData.parents.includes(parentFamily.spouseId)) {
                            familyData.parents.push(parentFamily.spouseId);
                        }
                        if (!spouseFamily.children.includes(user.id)) {
                            spouseFamily.children.push(user.id);
                        }
                        await spouseFamily.save();
                    }
                }
                familyData.pendingAdoptionProposals = familyData.pendingAdoptionProposals.filter(id => id !== parentId);
                await familyData.save();
                await parentFamily.save();

                const embed = new EmbedBuilder()
                    .setColor(0x4ade80)
                    .setTitle('🍼 ADOPTION SUCCESS')
                    .setDescription(`🎉 You have been adopted by <@${parentId}>! 🎉`);
                await message.edit({ embeds: [embed], components: [] });
            }

        } else if (customId.startsWith('prop_decline_adoption_')) {
            const parentId = customId.split('_')[3];
            familyData.pendingAdoptionProposals = familyData.pendingAdoptionProposals.filter(id => id !== parentId);
            await familyData.save();

            const embed = new EmbedBuilder()
                .setColor(0xf87171)
                .setTitle('❌ Adoption Declined')
                .setDescription(`You declined the adoption request from <@${parentId}>.`);
            await message.edit({ embeds: [embed], components: [] });
        }

        collector.stop();
    });

    collector.on('end', async (collected, reason) => {
        if (reason === 'time') {
            const embed = new EmbedBuilder()
                .setColor(0xf87171)
                .setTitle('⏰ proposals Expired')
                .setDescription('The proposals menu has expired.');
            await message.edit({ embeds: [embed], components: [] }).catch(() => {});
        }
    });
}
