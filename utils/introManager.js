const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { consumeAPU } = require('./aiManager');
const GuildSettings = require('../models/guildSettingsSchema');

// Default introduction layout template
const DEFAULT_INTRO_TEMPLATE = `✨ **Member Introduction** ✨
━━━━━━━━━━━━━━━━━━━━━━━━
👤 **User:** {user}
🏷️ **Name/Alias:** {name}
🎂 **Age/Pronouns:** {age}
🎮 **Interests:** {interests}
📝 **About Me:** {about}
━━━━━━━━━━━━━━━━━━━━━━━━`;

/**
 * Validates and formats the user's introduction using the DeepSeek API.
 * Consumes 1 APU credit from the server owner's balance.
 */
async function processIntroWithAI(ownerId, userInput, customFormat, userMention) {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    const hasKey = apiKey && apiKey !== 'your_deepseek_api_key_here';
    if (!hasKey) {
        throw new Error('DeepSeek API key is not configured.');
    }

    const formatTemplate = customFormat || DEFAULT_INTRO_TEMPLATE;

    const systemPrompt = `You are an assistant that processes user self-introductions for a Discord server. Your task is to analyze the user's input.

A message is considered low-effort/generic ONLY if it is extremely short (e.g., under 15 characters), or consists solely of simple greetings (e.g., "hi", "wsp", "hello", "yo", "wsg", "test", "wup", "sup"), or general questions (e.g., "what is this channel"), without providing any personal details (like name, age, location, hobbies, interests, or about me).
If the input is indeed low-effort/generic, reply with the exact word: GENERIC

If the input contains ANY meaningful personal details (such as their name, age, interests, hobbies, games they play, or a short description of themselves, e.g., "Hi, I'm Yuki. I'm 19 years old and I'm from Angul, odisha. I like to watch anime, code, game, cosplay"), it is a VALID introduction. In this case, you MUST format it into a beautiful, neat, aesthetic introduction layout based on the requested template. Do NOT reply with GENERIC for such messages.

The format to use is:
${formatTemplate}

Extract the information from the user's input and replace the placeholders:
- {user} with the user's mention: ${userMention}
- {name} with their name/alias (or "Not specified")
- {age} with their age/pronouns/gender (or "Not specified")
- {interests} with their interests/hobbies/games (or "Not specified")
- {about} with a clean, well-written summary of their introduction.

Ensure all fields are extracted from the user's input, cleaned up, and formatted nicely. Do not add any extra commentary or conversational text outside the formatted introduction. Keep the exact styling, emojis, and structure of the layout.`;

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
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userInput }
                ],
                temperature: 0.7,
                max_tokens: 400
            })
        });

        if (!response.ok) {
            throw new Error(`DeepSeek API returned status ${response.status}`);
        }

        const data = await response.json();
        const replyText = data.choices?.[0]?.message?.content?.trim();
        return replyText || 'GENERIC';
    } catch (error) {
        console.error('[Intro Manager] DeepSeek API Error:', error);
        throw error;
    }
}

/**
 * Handles incoming messages in the configured intro channel.
 */
async function handleIntroMessage(message, settings) {
    // Ignore bot messages
    if (message.author.bot) return;

    const guild = message.guild;
    const ownerId = guild.ownerId;

    // Check if owner has APU balance
    const apuCheck = await consumeAPU(ownerId, 1);
    if (!apuCheck.success) {
        // Warn about owner out of APUs
        const warnEmbed = new EmbedBuilder()
            .setColor('#ef4444')
            .setTitle('🚨 AI Services Offline')
            .setDescription(`Introductions cannot be processed because the server owner (<@${ownerId}>) has run out of daily APU credits.\n\nThe owner can upgrade their premium tier or recharge APUs using \`/ai status\`! 💜`)
            .setTimestamp();
        
        await message.channel.send({ embeds: [warnEmbed] }).catch(() => {});
        return;
    }

    const userInput = message.content;
    const userMention = `<@${message.author.id}>`;
    const customFormat = settings.intro?.format;

    // Send a typing indicator while AI processes
    await message.channel.sendTyping().catch(() => {});

    try {
        const result = await processIntroWithAI(ownerId, userInput, customFormat, userMention);

        if (result === 'GENERIC' || result.startsWith('GENERIC')) {
            // Delete generic message
            await message.delete().catch(() => {});

            // Send temporary warning
            const replyMsg = await message.channel.send(
                `❌ ${userMention}, please write a proper, meaningful introduction about yourself! (e.g. your name, age, interests, hobbies). Simple greetings like "hi" or "wsp" are not allowed.`
            ).catch(() => null);

            if (replyMsg) {
                setTimeout(() => {
                    replyMsg.delete().catch(() => {});
                }, 8000);
            }
        } else {
            // Valid introduction! Delete the raw message
            await message.delete().catch(() => {});

            // Post formatted introduction, ensuring the user is mentioned
            await message.channel.send(`<@${message.author.id}>\n${result}`).catch(() => {});

            // Lock channel for the user by setting SendMessages: false overwrite
            try {
                if (guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles) || guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
                    await message.channel.permissionOverwrites.create(message.author.id, {
                        SendMessages: false
                    }, { reason: 'Introduction submitted successfully.' });
                }
            } catch (permError) {
                console.error(`[Intro Manager] Failed to lock channel for user ${message.author.id}:`, permError);
            }
        }
    } catch (error) {
        console.error('[Intro Manager] Error processing introduction:', error);
        
        // Notify user about temporary error
        const replyMsg = await message.channel.send(
            `❌ ${userMention}, there was an error processing your introduction via AI. Please try again in a few seconds.`
        ).catch(() => null);

        if (replyMsg) {
            setTimeout(() => {
                replyMsg.delete().catch(() => {});
            }, 5000);
        }
    }
}

module.exports = {
    handleIntroMessage,
    processIntroWithAI,
    DEFAULT_INTRO_TEMPLATE
};
