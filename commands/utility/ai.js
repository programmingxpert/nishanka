const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const { consumeAPU, getUserAPU, rechargeAPU, TIER_APU_LIMITS, APU_RECHARGE_COST } = require('../../utils/aiManager');
const { getUserPremiumTier } = require('../../utils/premiumPromo');

// Cooldown display helper
const COOLDOWNS = {
    free: '60s',
    lite: '30s',
    pro: '10s',
    network: '5s',
    lifetime: '0s'
};

async function handleStatus(interactionOrMessage, user) {
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
            .setLabel(`Recharge 100 APU (-${APU_RECHARGE_COST} Baubles)`)
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
                errorMsg = `❌ **Insufficient Baubles!**\nRecharging costs **${APU_RECHARGE_COST} Baubles**, but you only have **${result.currentBaubles} Baubles**.`;
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
                { name: '🪙 Baubles Remaining', value: `**${result.baublesLeft} Baubles**`, inline: true }
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

async function handleAsk(interactionOrMessage, user, prompt) {
    const isSlash = !!interactionOrMessage.reply && !interactionOrMessage.author;
    const apiKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey || apiKey === 'your_deepseek_api_key_here') {
        const msg = '⚠️ The AI features are currently unavailable. Please check back later!';
        return isSlash ? interactionOrMessage.reply({ content: msg, ephemeral: true }) : interactionOrMessage.reply(msg);
    }

    if (!prompt || prompt.trim().length === 0) {
        const msg = '❌ Please provide a prompt for the AI.';
        return isSlash ? interactionOrMessage.reply({ content: msg, ephemeral: true }) : interactionOrMessage.reply(msg);
    }

    const cost = 15;
    const apuResult = await consumeAPU(user.id, cost);
    if (!apuResult.success) {
        const msg = `❌ **Insufficient AI Power Units (APU)!**\nUsing AI ask costs **${cost} APU**.\nYou have **${apuResult.remaining}/${apuResult.max} APU** left.\n\nUse \`/ai status\` to check or recharge your APUs.`;
        return isSlash ? interactionOrMessage.reply({ content: msg, ephemeral: true }) : interactionOrMessage.reply(msg);
    }

    if (isSlash) {
        await interactionOrMessage.deferReply();
    } else {
        await interactionOrMessage.channel.sendTyping().catch(() => {});
    }

    try {
        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    { role: 'system', content: 'You are Nishanka, a helpful, witty, and fun Discord assistant.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 500
            })
        });

        if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
        }

        const data = await response.json();
        const replyText = data.choices[0].message.content.trim();

        const embed = new EmbedBuilder()
            .setColor(0x7c6cf0)
            .setAuthor({ name: `${user.username} asked:`, iconURL: user.displayAvatarURL({ dynamic: true }) })
            .setDescription(`**Prompt:** ${prompt.slice(0, 1000)}\n\n**Response:**\n${replyText.slice(0, 3000)}`)
            .setFooter({ text: `Deducted ${cost} APU | Balance: ${apuResult.remaining} APU` })
            .setTimestamp();

        if (isSlash) {
            await interactionOrMessage.editReply({ embeds: [embed] });
        } else {
            await interactionOrMessage.reply({ embeds: [embed] });
        }
    } catch (err) {
        console.error('DeepSeek ask error:', err);
        const msg = '⚠️ An error occurred while communicating with DeepSeek. Your APU has been consumed but the request failed.';
        if (isSlash) {
            await interactionOrMessage.editReply({ content: msg });
        } else {
            await interactionOrMessage.reply(msg);
        }
    }
}

async function handleRoast(interactionOrMessage, user, targetUser) {
    const isSlash = !!interactionOrMessage.reply && !interactionOrMessage.author;
    const apiKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey || apiKey === 'your_deepseek_api_key_here') {
        const msg = '⚠️ The AI features are currently unavailable. Please check back later!';
        return isSlash ? interactionOrMessage.reply({ content: msg, ephemeral: true }) : interactionOrMessage.reply(msg);
    }

    if (!targetUser) {
        const msg = '❌ Please specify a user to roast.';
        return isSlash ? interactionOrMessage.reply({ content: msg, ephemeral: true }) : interactionOrMessage.reply(msg);
    }

    if (targetUser.id === (interactionOrMessage.client?.user?.id || interactionOrMessage.guild?.members?.me?.id)) {
        const msg = '❌ Nice try! You cannot roast me, I am perfection itself. Go roast someone else.';
        return isSlash ? interactionOrMessage.reply({ content: msg, ephemeral: true }) : interactionOrMessage.reply(msg);
    }

    const cost = 20;
    const apuResult = await consumeAPU(user.id, cost);
    if (!apuResult.success) {
        const msg = `❌ **Insufficient AI Power Units (APU)!**\nRoasting a user costs **${cost} APU**.\nYou have **${apuResult.remaining}/${apuResult.max} APU** left.\n\nUse \`/ai status\` to check or recharge your APUs.`;
        return isSlash ? interactionOrMessage.reply({ content: msg, ephemeral: true }) : interactionOrMessage.reply(msg);
    }

    if (isSlash) {
        await interactionOrMessage.deferReply();
    } else {
        await interactionOrMessage.channel.sendTyping().catch(() => {});
    }

    try {
        const prompt = `Generate a hilarious, highly witty, and savage roast targeting the Discord user '${targetUser.username}'. Keep it under 80 words. Be creative, sharp, and funny, but keep it within Discord's Community Guidelines (no hate speech, slurs, or extreme abuse). Speak directly to/about them.`;
        
        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    { role: 'system', content: 'You are a savage, funny stand-up comedian who roasts people in a lighthearted, witty way.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.85,
                max_tokens: 200
            })
        });

        if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
        }

        const data = await response.json();
        const roastText = data.choices[0].message.content.trim();

        const embed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle(`🔥 ROASTED!`)
            .setDescription(`🗣️ <@${user.id}> targets <@${targetUser.id}>:\n\n${roastText}`)
            .setFooter({ text: `Deducted ${cost} APU | Balance: ${apuResult.remaining} APU` })
            .setTimestamp();

        if (isSlash) {
            await interactionOrMessage.editReply({ content: `<@${targetUser.id}>`, embeds: [embed] });
        } else {
            await interactionOrMessage.reply({ content: `<@${targetUser.id}>`, embeds: [embed] });
        }
    } catch (err) {
        console.error('DeepSeek roast error:', err);
        const msg = '⚠️ An error occurred while communicating with DeepSeek. Your APU has been consumed but the request failed.';
        if (isSlash) {
            await interactionOrMessage.editReply({ content: msg });
        } else {
            await interactionOrMessage.reply(msg);
        }
    }
}

module.exports = {
    category: 'utility',
    isAI: true,
    cooldown: 60,
    premiumCooldown: 5,
    data: new SlashCommandBuilder()
        .setName('ai')
        .setDescription('AI commands powered by DeepSeek')
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Check your daily AI Power Units (APU) and limits')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('ask')
                .setDescription('Ask the AI a general prompt')
                .addStringOption(option =>
                    option
                        .setName('prompt')
                        .setDescription('The prompt to ask the AI')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('roast')
                .setDescription('Get a savage AI roast targeting a user')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('The user to roast')
                        .setRequired(true)
                )
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        if (subcommand === 'status') {
            await handleStatus(interaction, interaction.user);
        } else if (subcommand === 'ask') {
            const prompt = interaction.options.getString('prompt');
            await handleAsk(interaction, interaction.user, prompt);
        } else if (subcommand === 'roast') {
            const target = interaction.options.getUser('user');
            await handleRoast(interaction, interaction.user, target);
        }
    },

    async executePrefix(message, args) {
        const subcommand = args[0]?.toLowerCase();
        if (subcommand === 'status') {
            await handleStatus(message, message.author);
        } else if (subcommand === 'ask') {
            const prompt = args.slice(1).join(' ');
            await handleAsk(message, message.author, prompt);
        } else if (subcommand === 'roast') {
            const target = message.mentions.users.first() || (args[1] ? message.client.users.cache.get(args[1]) : null);
            if (!target) {
                return message.reply('❌ Please specify a user to roast (mention them or provide their ID).');
            }
            await handleRoast(message, message.author, target);
        } else {
            return message.reply('❌ Unknown AI command. Use `ai status`, `ai ask <prompt>`, or `ai roast <user>`.');
        }
    }
};
