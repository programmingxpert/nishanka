const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const { getUserAPU, TIER_APU_LIMITS, rechargeAPU, APU_RECHARGE_COST } = require('../../utils/aiManager');
const { getUserPremiumTier } = require('../../utils/premiumPromo');

// Cooldown display helper
const COOLDOWNS = {
    free: '60s',
    lite: '30s',
    pro: '10s',
    network: '5s',
    lifetime: '0s'
};

async function displayStatus(interactionOrMessage, user) {
    const isSlash = !!interactionOrMessage.reply && !interactionOrMessage.author;
    const tier = getUserPremiumTier(user.id);
    const apu = await getUserAPU(user.id);
    const maxApu = TIER_APU_LIMITS[tier] || TIER_APU_LIMITS.free;
    const cooldown = COOLDOWNS[tier] || '60s';

    const embed = new EmbedBuilder()
        .setColor(0x7c6cf0)
        .setTitle('🤖 AI Power Status')
        .setDescription(`Check your daily AI Power Units (APU) and recharge if needed.`)
        .addFields(
            { name: '👤 Premium Tier', value: `**${tier.toUpperCase()}**`, inline: true },
            { name: '⏳ AI Cooldown', value: `**${cooldown}**`, inline: true },
            { name: '⚡ APU Balance', value: `**${apu} / ${maxApu} APU**`, inline: false }
        )
        .setFooter({ text: 'APUs reset daily at 00:00 UTC' })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`ai_recharge_${user.id}`)
            .setLabel(`Recharge 100 APU (-${APU_RECHARGE_COST.toLocaleString()} Baubles)`)
            .setStyle(ButtonStyle.Success)
    );

    let replyMsg;
    if (isSlash) {
        replyMsg = await interactionOrMessage.reply({ embeds: [embed], components: [row], fetchReply: true });
    } else {
        replyMsg = await interactionOrMessage.reply({ embeds: [embed], components: [row] });
    }

    const filter = i => i.customId === `ai_recharge_${user.id}` && i.user.id === user.id;
    try {
        const btnInteraction = await replyMsg.awaitMessageComponent({ filter, time: 30000 });
        await btnInteraction.deferUpdate();

        const result = await rechargeAPU(user.id);
        if (!result.success) {
            let errorMsg = '❌ Failed to recharge APU.';
            if (result.reason === 'insufficient_baubles') {
                errorMsg = `❌ **Insufficient Baubles!**\nRecharging costs **${APU_RECHARGE_COST.toLocaleString()} Baubles**, but you only have **${result.currentBaubles.toLocaleString()} Baubles**.`;
            }
            return isSlash 
                ? interactionOrMessage.followUp({ content: errorMsg, ephemeral: true })
                : interactionOrMessage.channel.send({ content: `<@${user.id}> ${errorMsg}` });
        }

        const updatedEmbed = new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle('⚡ Recharge Successful!')
            .setDescription(`Successfully recharged your APU balance!`)
            .addFields(
                { name: '👤 Premium Tier', value: `**${tier.toUpperCase()}**`, inline: true },
                { name: '⏳ AI Cooldown', value: `**${cooldown}**`, inline: true },
                { name: '⚡ APU Balance', value: `**${result.apuBalance} APU**`, inline: false },
                { name: '🪙 Baubles Remaining', value: `**${result.baublesLeft.toLocaleString()} Baubles**`, inline: true }
            )
            .setFooter({ text: 'APUs reset daily at 00:00 UTC' })
            .setTimestamp();

        const disabledRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`ai_recharge_${user.id}`)
                .setLabel(`Recharged!`)
                .setStyle(ButtonStyle.Success)
                .setDisabled(true)
        );

        if (isSlash) {
            await interactionOrMessage.editReply({ embeds: [updatedEmbed], components: [disabledRow] });
        } else {
            await replyMsg.edit({ embeds: [updatedEmbed], components: [disabledRow] });
        }
    } catch (err) {
        const disabledRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`ai_recharge_${user.id}`)
                .setLabel(`Recharge Expired`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true)
        );
        if (isSlash) {
            await interactionOrMessage.editReply({ components: [disabledRow] }).catch(() => {});
        } else {
            await replyMsg.edit({ components: [disabledRow] }).catch(() => {});
        }
    }
}

module.exports = {
    category: 'ai',
    isAI: true,
    cooldown: 5,
    premiumCooldown: 1,
    data: new SlashCommandBuilder()
        .setName('apu')
        .setDescription('Check your daily AI Power Units (APU) and limits'),

    async execute(interaction) {
        await displayStatus(interaction, interaction.user);
    },

    async executePrefix(message, args) {
        await displayStatus(message, message.author);
    }
};
