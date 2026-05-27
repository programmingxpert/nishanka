/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const Family = require('../../models/familySchema');

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

        const { embed, components, error, directAccept } = await proposeMarriage(proposer, target, interaction.guild);

        if (error) {
            return interaction.editReply({ content: `❌ ${error}` });
        }

        if (directAccept) {
            return interaction.editReply({ embeds: [embed] });
        }

        const msg = await interaction.editReply({ embeds: [embed], components: [components] });
        handleMarriageCollector(msg, proposer, target);
    },

    async executePrefix(message, args) {
        const proposer = message.author;
        const target = message.mentions.users.first() 
            || (args[0] ? await message.client.users.fetch(args[0].replace(/[<@!>]/g, '')).catch(() => null) : null);

        if (!target) {
            return message.reply('❌ Mention the user you want to propose to!').catch(() => {});
        }

        const msgIndicator = await message.reply('💍 Processing proposal...');
        const { embed, components, error, directAccept } = await proposeMarriage(proposer, target, message.guild);

        if (error) {
            return msgIndicator.edit({ content: `❌ ${error}` }).catch(() => {});
        }

        if (directAccept) {
            await msgIndicator.delete().catch(() => {});
            return message.reply({ embeds: [embed] });
        }

        await msgIndicator.delete().catch(() => {});
        const mainMsg = await message.reply({ embeds: [embed], components: [components] });
        handleMarriageCollector(mainMsg, proposer, target);
    }
};

async function proposeMarriage(proposer, target, guild) {
    if (proposer.id === target.id) {
        return { error: "You cannot marry yourself! That's just sad." };
    }
    if (target.bot) {
        return { error: "You cannot marry a bot! Robots don't feel love... yet." };
    }

    // Helper to get/create family
    const getFamily = async (id) => {
        let f = await Family.findOne({ userId: id });
        if (!f) {
            f = new Family({ userId: id });
            await f.save();
        }
        return f;
    };

    const proposerFamily = await getFamily(proposer.id);
    const targetFamily = await getFamily(target.id);

    if (proposerFamily.spouseId) {
        return { error: "You are already married! Do you want to be called out for cheating? Divorce your spouse first." };
    }
    if (targetFamily.spouseId) {
        return { error: "This person is already married! Don't try to break their family." };
    }

    // Check if target had already proposed to proposer (auto-accept)
    if (proposerFamily.pendingSpouseProposal === target.id) {
        proposerFamily.spouseId = target.id;
        targetFamily.spouseId = proposer.id;
        proposerFamily.pendingSpouseProposal = null;
        targetFamily.pendingSpouseProposal = null;
        await proposerFamily.save();
        await targetFamily.save();

        const embed = new EmbedBuilder()
            .setColor(0x4ade80)
            .setTitle('💖 MARRIAGE ACCEPTED!')
            .setDescription(`**${proposer.username}** and **${target.username}** had already proposed to each other, so they are now officially married! 🎉`)
            .setTimestamp();
        return { embed, directAccept: true };
    }

    // Save proposal in DB
    targetFamily.pendingSpouseProposal = proposer.id;
    await targetFamily.save();

    const embed = new EmbedBuilder()
        .setColor(0x7c6cf0)
        .setTitle('💍 Marriage Proposal!')
        .setDescription(`**${proposer.username}** has proposed to **${target.username}**!\n\n*${target.username}, do you accept?*`)
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

    return { embed, components: row };
}

function handleMarriageCollector(message, proposer, target) {
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
                await targetFamily.save();
                const embed = new EmbedBuilder()
                    .setColor(0xf87171)
                    .setTitle('💔 Proposal Cancelled')
                    .setDescription('One of you got married to someone else in the meantime!');
                return message.edit({ embeds: [embed], components: [] });
            }

            proposerFamily.spouseId = target.id;
            targetFamily.spouseId = proposer.id;
            proposerFamily.pendingSpouseProposal = null;
            targetFamily.pendingSpouseProposal = null;
            await proposerFamily.save();
            await targetFamily.save();

            const embed = new EmbedBuilder()
                .setColor(0x4ade80)
                .setTitle('💖 JUST MARRIED!')
                .setDescription(`🎉 **${target.username}** accepted the proposal! **${proposer.username}** and **${target.username}** are now officially married! 🎉`)
                .setTimestamp();

            await message.edit({ embeds: [embed], components: [] });
        } else {
            targetFamily.pendingSpouseProposal = null;
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
