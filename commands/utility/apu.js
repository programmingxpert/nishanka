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

async function displayStatus(interactionOrMessage, callerUser, targetUser) {
    const isSlash = !!interactionOrMessage.reply && !interactionOrMessage.author;
    const tier = getUserPremiumTier(targetUser.id);
    const apu = await getUserAPU(targetUser.id);
    const maxApu = TIER_APU_LIMITS[tier] || TIER_APU_LIMITS.free;
    const cooldown = COOLDOWNS[tier] || '60s';

    const embed = new EmbedBuilder()
        .setColor(0x7c6cf0)
        .setTitle('🤖 AI Power Status')
        .setDescription(targetUser.id === callerUser.id
            ? 'Check your daily AI Power Units (APU) and recharge if needed.'
            : `Checking daily AI Power Units (APU) for **${targetUser.username}**.`)
        .addFields(
            { name: '👤 Premium Tier', value: `**${tier.toUpperCase()}**`, inline: true },
            { name: '⏳ AI Cooldown', value: `**${cooldown}**`, inline: true },
            { name: '⚡ APU Balance', value: `**${apu} / ${maxApu} APU**`, inline: false }
        )
        .setFooter({ text: 'APUs reset daily at 00:00 UTC' })
        .setTimestamp();

    // Only show the recharge button if the user is checking their own status
    const isSelf = targetUser.id === callerUser.id;
    const components = [];

    if (isSelf) {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`ai_recharge_${callerUser.id}`)
                .setLabel(`Recharge 100 APU (-${APU_RECHARGE_COST.toLocaleString()} Baubles)`)
                .setStyle(ButtonStyle.Success)
        );
        components.push(row);
    }

    let replyMsg;
    if (isSlash) {
        replyMsg = await interactionOrMessage.reply({ embeds: [embed], components, fetchReply: true });
    } else {
        replyMsg = await interactionOrMessage.reply({ embeds: [embed], components });
    }

    if (!isSelf) return; // No collector needed if they checked someone else

    const filter = i => i.customId === `ai_recharge_${callerUser.id}` && i.user.id === callerUser.id;
    try {
        const btnInteraction = await replyMsg.awaitMessageComponent({ filter, time: 30000 });
        await btnInteraction.deferUpdate();

        const result = await rechargeAPU(callerUser.id);
        if (!result.success) {
            let errorMsg = '❌ Failed to recharge APU.';
            if (result.reason === 'insufficient_baubles') {
                errorMsg = `❌ **Insufficient Baubles!**\nRecharging costs **${APU_RECHARGE_COST.toLocaleString()} Baubles**, but you only have **${result.currentBaubles.toLocaleString()} Baubles**.`;
            }
            return isSlash 
                ? interactionOrMessage.followUp({ content: errorMsg, ephemeral: true })
                : interactionOrMessage.channel.send({ content: `<@${callerUser.id}> ${errorMsg}` });
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
                .setCustomId(`ai_recharge_${callerUser.id}`)
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
                .setCustomId(`ai_recharge_${callerUser.id}`)
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
    aliases: ['alu'],
    cooldown: 5,
    premiumCooldown: 1,
    data: new SlashCommandBuilder()
        .setName('apu')
        .setDescription('Check AI Power Units (APU) and limits')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to check the APU balance of')
                .setRequired(false)
        ),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        await displayStatus(interaction, interaction.user, targetUser);
    },

    async executePrefix(message, args) {
        const targetUser = message.mentions.users.first() || message.author;
        await displayStatus(message, message.author, targetUser);
    }
};
