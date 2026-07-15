const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { consumeAPU } = require('./aiManager');
const GuildSettings = require('../models/guildSettingsSchema');

// Default introduction layout template (used as a fallback placeholder in configurations)
const DEFAULT_INTRO_TEMPLATE = `╭────── ౨ৎ ──────╮
   ✨ 𝖬𝖤𝖬𝖡𝖤𝖱  𝖨𝖭𝖳𝖱𝖮𝖣𝖴𝖢𝖳𝖨𝖮𝖭 ✨
╰────── ౨ৎ ──────╯

────── 🎀༘⋆──𐀔˚˖♡ ──────
✦ 👤 **Nickname:** {name}
✦ 🎂 **Age/Pronouns:** {age}
✦ 🎮 **Interests:** {interests}
────── 𓂃✿𓈒𓏸 ──────
📝 **About Me:**
{about}
────── ⋆˚𝜗𝜚˚⋆🥥⑅⁺₊ ──────`;

/**
 * Generates a dynamic-field layout directly from AI.
 */
async function processDefaultIntroWithAI(ownerId, userInput) {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey || apiKey === 'your_deepseek_api_key_here') {
        throw new Error('DeepSeek API key is not configured.');
    }

    const systemPrompt = `You are a parser that processes user self-introductions for a Discord server.

Analyze the user's input.
A message is considered low-effort/generic ONLY if it is extremely short (e.g., under 15 characters), or consists solely of simple greetings (e.g., "hi", "wsp", "hello", "yo", "wsg", "test", "wup", "sup"), or general questions (e.g., "what is this channel"), without providing any personal details.
If the input is indeed low-effort/generic, reply with the exact word: GENERIC

If the input is a valid introduction containing personal details, you must format it into a cute, aesthetic, non-boring Discord post.
Structure the introduction exactly as follows:

╭────── ౨ৎ ──────╮
   ✨ 𝖬𝖤𝖬𝖡𝖤𝖱  𝖨𝖭𝖳𝖱𝖮𝖣𝖴𝖢𝖳𝖨𝖮𝖭 ✨
╰────── ౨ৎ ──────╯

────── 🎀༘⋆──𐀔˚˖♡ ──────
[DYNAMIC FIELDS]
────── 𓂃✿𓈒𓏸 ──────
📝 **About Me:**
[ABOUT ME PARAGRAPH]
────── ⋆˚𝜗𝜚˚⋆🥥⑅⁺₊ ──────

For [DYNAMIC FIELDS]:
Extract all details the user shared (e.g., name/alias, age/pronouns, location, hobbies, favorite games, music, study/profession, etc.).
Format each extracted detail on a new line using this format:
✦ [emoji] **[Field Title]:** [Value]
Choose an appropriate emoji for the field (e.g. 👤 for Name, 🎂 for Age/Pronouns, 📍 for Location, 🎮 for Games, 🎵 for Music, 📚 for Studies, etc.). Do not include empty or "Not specified" fields. Only include fields they actually provided details for.

For [ABOUT ME PARAGRAPH]:
Write a clean, cohesive, 2-3 sentence summary of their introduction in first person (e.g., "I am Yuki from Odisha...").

Do not return any other text, greetings, or markdown code block syntax. Return only the formatted introduction starting with ╭────── ౨ৎ ──────╮.`;

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
                max_tokens: 500
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
 * Extracts structured JSON for custom format template replacements.
 */
async function processIntroJSONWithAI(ownerId, userInput) {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey || apiKey === 'your_deepseek_api_key_here') {
        throw new Error('DeepSeek API key is not configured.');
    }

    const systemPrompt = `You are a parser that processes user self-introductions for a Discord server.

Analyze the user's input.
A message is considered low-effort/generic ONLY if it is extremely short (e.g., under 15 characters), or consists solely of simple greetings (e.g., "hi", "wsp", "hello", "yo", "wsg", "test", "wup", "sup"), or general questions (e.g., "what is this channel"), without providing any personal details.
If the input is indeed low-effort/generic, reply with the exact word: GENERIC

If the input is a valid introduction containing personal details, extract the key details and return a raw JSON object with the following keys. Do NOT include markdown code blocks, do NOT write anything else, just return the JSON:
{
  "name": "extracted name or alias (fallback to 'Not specified')",
  "age": "extracted age, pronouns, or gender (fallback to 'Not specified')",
  "interests": "extracted interests, hobbies, games, or things they like (fallback to 'Not specified')",
  "about": "a clean, well-written, 2-3 sentence summary of their introduction in first person (e.g., 'I am a 19-year-old developer from Odisha. I enjoy anime, coding, and gaming.')"
}

Do not return any conversational text. Return only the JSON object or the word GENERIC.`;

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
                max_tokens: 450
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
        if (customFormat) {
            // Process using JSON extraction for custom format template
            const result = await processIntroJSONWithAI(ownerId, userInput);

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
                // Parse JSON
                let introData;
                try {
                    const cleanJson = result.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
                    introData = JSON.parse(cleanJson);
                } catch (jsonErr) {
                    console.error('[Intro Manager] Failed to parse JSON:', result, jsonErr);
                    throw new Error('AI output was not in valid JSON format.');
                }

                // Delete original message
                await message.delete().catch(() => {});

                const formattedText = customFormat
                    .replace(/{user}/g, userMention)
                    .replace(/{name}/g, introData.name || 'Not specified')
                    .replace(/{age}/g, introData.age || 'Not specified')
                    .replace(/{interests}/g, introData.interests || 'Not specified')
                    .replace(/{about}/g, introData.about || 'Not specified');

                // Send formatted custom introduction
                await message.channel.send(`${userMention}\n${formattedText}`).catch(() => {});
            }
        } else {
            // Process using gorgeous default dynamic-fields layout directly from AI
            const result = await processDefaultIntroWithAI(ownerId, userInput);

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
                // Delete original message
                await message.delete().catch(() => {});

                // Send formatted dynamic introduction
                await message.channel.send(`${userMention}\n${result}`).catch(() => {});
            }
        }

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
    processDefaultIntroWithAI,
    processIntroJSONWithAI,
    DEFAULT_INTRO_TEMPLATE
};
