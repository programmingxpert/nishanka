const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const { consumeAPU, getUserAPU, rechargeAPU, TIER_APU_LIMITS, APU_RECHARGE_COST } = require('../../utils/aiManager');
const { getUserPremiumTier } = require('../../utils/premiumPromo');
const AIAdventure = require('../../models/aiAdventureSchema');

// Cooldown display helper
const COOLDOWNS = {
    free: '60s',
    lite: '30s',
    pro: '10s',
    network: '5s',
    lifetime: '0s'
};

const RPG_SYSTEM_PROMPT = `You are a text RPG Dungeon Master (DM) guiding the player on their adventure.
Generate short, immersive narrative updates (under 120 words) detailing what happens next.
IMPORTANT: At the end of every response, you MUST provide 4 options for the player to choose from:
A: [First action]
B: [Second action]
C: [Third action]
D: [Fourth action]
Never forget to output these options! Be descriptive, dangerous, and exciting.`;

const TAROT_CARDS = [
    'The Fool', 'The Magician', 'The High Priestess', 'The Empress', 'The Emperor',
    'The Hierophant', 'The Lovers', 'The Chariot', 'Strength', 'The Hermit',
    'Wheel of Fortune', 'Justice', 'The Hanged Man', 'Death', 'Temperance',
    'The Devil', 'The Tower', 'The Star', 'The Moon', 'The Sun',
    'Judgement', 'The World'
];

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
        const msg = `❌ **Insufficient AI Power Units (APU)!**\nUsing AI ask costs **${cost} APU**.\nYou have **${apuResult.remaining}/${apuResult.max} APU** left.\n\nUse \`/ai status\` to check/recharge your APUs using Baubles. Get Premium for as low as **$1.99/mo** (VERY CHEAP!) to unlock higher limits!`;
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
        const msg = `❌ **Insufficient AI Power Units (APU)!**\nRoasting a user costs **${cost} APU**.\nYou have **${apuResult.remaining}/${apuResult.max} APU** left.\n\nUse \`/ai status\` to check/recharge your APUs using Baubles. Get Premium for as low as **$1.99/mo** (VERY CHEAP!) to unlock higher limits!`;
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

async function handleAdventureStart(interactionOrMessage, user, scenario, charName, charClass) {
    const isSlash = !!interactionOrMessage.reply && !interactionOrMessage.author;
    const apiKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey || apiKey === 'your_deepseek_api_key_here') {
        const msg = '⚠️ The AI features are currently unavailable. Please check back later!';
        return isSlash ? interactionOrMessage.reply({ content: msg, ephemeral: true }) : interactionOrMessage.reply(msg);
    }

    const cost = 20;
    const apuResult = await consumeAPU(user.id, cost);
    if (!apuResult.success) {
        const msg = `❌ **Insufficient AI Power Units (APU)!**\nStarting an adventure costs **${cost} APU**.\nYou have **${apuResult.remaining}/${apuResult.max} APU** left.\n\nUse \`/ai status\` to check/recharge your APUs using Baubles. Get Premium for as low as **$1.99/mo** (VERY CHEAP!) to unlock higher limits!`;
        return isSlash ? interactionOrMessage.reply({ content: msg, ephemeral: true }) : interactionOrMessage.reply(msg);
    }

    if (isSlash) {
        if (!interactionOrMessage.deferred && !interactionOrMessage.replied) {
            await interactionOrMessage.deferReply();
        }
    } else {
        await interactionOrMessage.channel.sendTyping().catch(() => {});
    }

    try {
        await AIAdventure.deleteOne({ userId: user.id });

        const setupPrompt = `Start a new text adventure in the setting '${scenario}'. My character is '${charName}', a brave ${charClass}. Begin the story, describe the starting environment, and provide my first set of 4 options (A, B, C, D).`;

        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    { role: 'system', content: RPG_SYSTEM_PROMPT },
                    { role: 'user', content: setupPrompt }
                ],
                temperature: 0.8,
                max_tokens: 350
            })
        });

        if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
        }

        const data = await response.json();
        const storyText = data.choices[0].message.content.trim();

        const newAdventure = new AIAdventure({
            userId: user.id,
            scenario,
            characterName: charName,
            characterClass: charClass,
            history: [
                { role: 'user', content: setupPrompt },
                { role: 'assistant', content: storyText }
            ]
        });
        await newAdventure.save();

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`adv_choice_A_${user.id}`).setLabel('A').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`adv_choice_B_${user.id}`).setLabel('B').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`adv_choice_C_${user.id}`).setLabel('C').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`adv_choice_D_${user.id}`).setLabel('D').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`adv_custom_${user.id}`).setLabel('Custom Action ✍️').setStyle(ButtonStyle.Success)
        );

        const embed = new EmbedBuilder()
            .setColor(0x7c6cf0)
            .setTitle(`⚔️ Adventure Started: ${scenario.toUpperCase()}`)
            .setDescription(`**Hero:** ${charName} (${charClass})\n\n${storyText}`)
            .setFooter({ text: `Deducted ${cost} APU | Choose an option below to continue!` })
            .setTimestamp();

        if (isSlash) {
            await interactionOrMessage.editReply({ embeds: [embed], components: [buttons] });
        } else {
            await interactionOrMessage.reply({ embeds: [embed], components: [buttons] });
        }
    } catch (err) {
        console.error('Adventure start error:', err);
        const msg = '⚠️ An error occurred while starting your adventure. Please try again.';
        if (isSlash) {
            await interactionOrMessage.editReply({ content: msg });
        } else {
            await interactionOrMessage.reply(msg);
        }
    }
}

async function handleAdventureChoose(interactionOrMessage, user, choice) {
    const isSlash = !!interactionOrMessage.reply && !interactionOrMessage.author;
    const apiKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey || apiKey === 'your_deepseek_api_key_here') {
        const msg = '⚠️ The AI features are currently unavailable. Please check back later!';
        return isSlash ? interactionOrMessage.reply({ content: msg, ephemeral: true }) : interactionOrMessage.reply(msg);
    }

    const adventure = await AIAdventure.findOne({ userId: user.id });
    if (!adventure) {
        const msg = '❌ You do not have an active adventure! Start one using `/ai adventure start`.';
        return isSlash ? interactionOrMessage.reply({ content: msg, ephemeral: true }) : interactionOrMessage.reply(msg);
    }

    const cost = 15;
    const apuResult = await consumeAPU(user.id, cost);
    if (!apuResult.success) {
        const msg = `❌ **Insufficient AI Power Units (APU)!**\nContinuing your adventure costs **${cost} APU**.\nYou have **${apuResult.remaining}/${apuResult.max} APU** left.\n\nUse \`/ai status\` to check/recharge your APUs using Baubles. Get Premium for as low as **$1.99/mo** (VERY CHEAP!) to unlock higher limits!`;
        return isSlash ? interactionOrMessage.reply({ content: msg, ephemeral: true }) : interactionOrMessage.reply(msg);
    }

    if (isSlash) {
        if (!interactionOrMessage.deferred && !interactionOrMessage.replied) {
            await interactionOrMessage.deferReply();
        }
    } else {
        await interactionOrMessage.channel.sendTyping().catch(() => {});
    }

    try {
        const userPrompt = `I choose: ${choice}. Describe the outcome of this action, continue the story, and give me a new set of 4 options (A, B, C, D).`;
        
        const apiMessages = [
            { role: 'system', content: RPG_SYSTEM_PROMPT },
            ...adventure.history.map(h => ({ role: h.role, content: h.content })),
            { role: 'user', content: userPrompt }
        ];

        if (apiMessages.length > 12) {
            apiMessages.splice(1, apiMessages.length - 12);
        }

        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: apiMessages,
                temperature: 0.8,
                max_tokens: 350
            })
        });

        if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
        }

        const data = await response.json();
        const storyText = data.choices[0].message.content.trim();

        adventure.history.push({ role: 'user', content: userPrompt });
        adventure.history.push({ role: 'assistant', content: storyText });
        
        if (adventure.history.length > 20) {
            adventure.history = adventure.history.slice(-20);
        }
        adventure.updatedAt = new Date();
        await adventure.save();

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`adv_choice_A_${user.id}`).setLabel('A').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`adv_choice_B_${user.id}`).setLabel('B').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`adv_choice_C_${user.id}`).setLabel('C').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`adv_choice_D_${user.id}`).setLabel('D').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`adv_custom_${user.id}`).setLabel('Custom Action ✍️').setStyle(ButtonStyle.Success)
        );

        const embed = new EmbedBuilder()
            .setColor(0x7c6cf0)
            .setTitle(`⚔️ Adventure: ${adventure.characterName} (${adventure.characterClass})`)
            .setDescription(`**Action:** ${choice}\n\n${storyText}`)
            .setFooter({ text: `Deducted ${cost} APU | Choose an option below to continue!` })
            .setTimestamp();

        if (isSlash) {
            await interactionOrMessage.editReply({ embeds: [embed], components: [buttons] });
        } else {
            await interactionOrMessage.reply({ embeds: [embed], components: [buttons] });
        }
    } catch (err) {
        console.error('Adventure choose error:', err);
        const msg = '⚠️ An error occurred while continuing your adventure. Please try again.';
        if (isSlash) {
            await interactionOrMessage.editReply({ content: msg });
        } else {
            await interactionOrMessage.reply(msg);
        }
    }
}

async function handleTarot(interactionOrMessage, user, question) {
    const isSlash = !!interactionOrMessage.reply && !interactionOrMessage.author;
    const apiKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey || apiKey === 'your_deepseek_api_key_here') {
        const msg = '⚠️ The AI features are currently unavailable. Please check back later!';
        return isSlash ? interactionOrMessage.reply({ content: msg, ephemeral: true }) : interactionOrMessage.reply(msg);
    }

    if (!question || question.trim().length === 0) {
        const msg = '❌ Please provide a question for the tarot reading.';
        return isSlash ? interactionOrMessage.reply({ content: msg, ephemeral: true }) : interactionOrMessage.reply(msg);
    }

    const cost = 20;
    const apuResult = await consumeAPU(user.id, cost);
    if (!apuResult.success) {
        const msg = `❌ **Insufficient AI Power Units (APU)!**\nTarot readings cost **${cost} APU**.\nYou have **${apuResult.remaining}/${apuResult.max} APU** left.\n\nUse \`/ai status\` to check/recharge your APUs using Baubles. Get Premium for as low as **$1.99/mo** (VERY CHEAP!) to unlock higher limits!`;
        return isSlash ? interactionOrMessage.reply({ content: msg, ephemeral: true }) : interactionOrMessage.reply(msg);
    }

    if (isSlash) {
        await interactionOrMessage.deferReply();
    } else {
        await interactionOrMessage.channel.sendTyping().catch(() => {});
    }

    try {
        const shuffled = [...TAROT_CARDS].sort(() => 0.5 - Math.random());
        const card1 = shuffled[0];
        const card2 = shuffled[1];
        const card3 = shuffled[2];

        const prompt = `I drew 3 Tarot cards for my question: "${question}".
Card 1 (Past): ${card1}
Card 2 (Present): ${card2}
Card 3 (Future): ${card3}
Interpret these cards and give me a mystical, insightful reading in under 120 words. Speak directly to me.`;

        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    { role: 'system', content: 'You are a wise, mystical, and intuitive Tarot Card Reader.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.8,
                max_tokens: 300
            })
        });

        if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
        }

        const data = await response.json();
        const readingText = data.choices[0].message.content.trim();

        const embed = new EmbedBuilder()
            .setColor(0x9b59b6)
            .setTitle(`🔮 Mystical Tarot Reading`)
            .addFields(
                { name: '❓ Your Question', value: question, inline: false },
                { name: '🃏 Cards Drawn', value: `🌅 **Past:** ${card1}\n⚡ **Present:** ${card2}\n🌌 **Future:** ${card3}`, inline: false }
            )
            .setDescription(`**Reading:**\n${readingText}`)
            .setFooter({ text: `Deducted ${cost} APU | Balance: ${apuResult.remaining} APU` })
            .setTimestamp();

        if (isSlash) {
            await interactionOrMessage.editReply({ embeds: [embed] });
        } else {
            await interactionOrMessage.reply({ embeds: [embed] });
        }
    } catch (err) {
        console.error('DeepSeek tarot error:', err);
        const msg = '⚠️ An error occurred while communicating with DeepSeek. Your APU has been consumed but the request failed.';
        if (isSlash) {
            await interactionOrMessage.editReply({ content: msg });
        } else {
            await interactionOrMessage.reply(msg);
        }
    }
}

module.exports = {
    category: 'ai',
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
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('tarot')
                .setDescription('Receive a mystical 3-card Tarot reading for your question')
                .addStringOption(option =>
                    option
                        .setName('question')
                        .setDescription('The question you want the tarot cards to answer')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('adventure-start')
                .setDescription('Start a new DeepSeek-powered interactive text adventure game!')
                .addStringOption(option =>
                    option
                        .setName('scenario')
                        .setDescription('Select the theme/scenario of your RPG adventure')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Medieval Fantasy 🧙‍♂️', value: 'Fantasy' },
                            { name: 'Neon Cyberpunk 🌆', value: 'Cyberpunk' },
                            { name: 'Sci-Fi Space Voyage 🚀', value: 'Space Odyssey' },
                            { name: 'Zombie Apocalypse 🧟‍♂️', value: 'Zombie Apocalypse' }
                        )
                )
                .addStringOption(option =>
                    option
                        .setName('name')
                        .setDescription('Name of your character')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('class')
                        .setDescription('Your character Class')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Warrior 🛡️', value: 'Warrior' },
                            { name: 'Mage 🔮', value: 'Mage' },
                            { name: 'Rogue 🗡️', value: 'Rogue' },
                            { name: 'Cleric 💖', value: 'Cleric' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('adventure-choose')
                .setDescription('Make a choice or take a custom action in your adventure')
                .addStringOption(option =>
                    option
                        .setName('action')
                        .setDescription('A, B, C, D or any custom action you want to take')
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
        } else if (subcommand === 'tarot') {
            const question = interaction.options.getString('question');
            await handleTarot(interaction, interaction.user, question);
        } else if (subcommand === 'adventure-start') {
            const scenario = interaction.options.getString('scenario');
            const name = interaction.options.getString('name');
            const charClass = interaction.options.getString('class');
            await handleAdventureStart(interaction, interaction.user, scenario, name, charClass);
        } else if (subcommand === 'adventure-choose') {
            const action = interaction.options.getString('action');
            await handleAdventureChoose(interaction, interaction.user, action);
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
        } else if (subcommand === 'tarot') {
            const question = args.slice(1).join(' ');
            await handleTarot(message, message.author, question);
        } else if (subcommand === 'adventure') {
            const action = args[1]?.toLowerCase();
            if (action === 'start') {
                const scenario = args[2] || 'Fantasy';
                const name = args[3] || 'Hero';
                const charClass = args[4] || 'Warrior';
                await handleAdventureStart(message, message.author, scenario, name, charClass);
            } else if (action === 'choose' || action === 'choice' || action === 'act') {
                const actText = args.slice(2).join(' ');
                if (!actText) {
                    return message.reply('❌ Please provide your choice or action: `ai adventure choose <A/B/C/D/Action>`');
                }
                await handleAdventureChoose(message, message.author, actText);
            } else {
                const adventure = await AIAdventure.findOne({ userId: message.author.id });
                if (adventure) {
                    const lastAssistant = adventure.history.slice().reverse().find(h => h.role === 'assistant');
                    if (lastAssistant) {
                        const buttons = new ActionRowBuilder().addComponents(
                            new ButtonBuilder().setCustomId(`adv_choice_A_${message.author.id}`).setLabel('A').setStyle(ButtonStyle.Primary),
                            new ButtonBuilder().setCustomId(`adv_choice_B_${message.author.id}`).setLabel('B').setStyle(ButtonStyle.Primary),
                            new ButtonBuilder().setCustomId(`adv_choice_C_${message.author.id}`).setLabel('C').setStyle(ButtonStyle.Primary),
                            new ButtonBuilder().setCustomId(`adv_choice_D_${message.author.id}`).setLabel('D').setStyle(ButtonStyle.Primary),
                            new ButtonBuilder().setCustomId(`adv_custom_${message.author.id}`).setLabel('Custom Action ✍️').setStyle(ButtonStyle.Success)
                        );
                        const embed = new EmbedBuilder()
                            .setColor(0x7c6cf0)
                            .setTitle(`⚔️ Resuming Adventure: ${adventure.scenario.toUpperCase()}`)
                            .setDescription(`**Hero:** ${adventure.characterName} (${adventure.characterClass})\n\n${lastAssistant.content}`)
                            .setFooter({ text: `Choose an option below to continue!` })
                            .setTimestamp();
                        return message.reply({ embeds: [embed], components: [buttons] });
                    }
                }
                const scenario = 'Fantasy';
                const name = message.member?.displayName || message.author.username;
                const charClass = 'Warrior';
                await handleAdventureStart(message, message.author, scenario, name, charClass);
            }
        } else {
            return message.reply('❌ Unknown AI command. Use `ai status`, `ai ask <prompt>`, `ai roast <user>`, `ai tarot <question>`, or `ai adventure`.');
        }
    },
    handleAdventureStart,
    handleAdventureChoose
};
