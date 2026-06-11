/* eslint-disable */
const { EmbedBuilder } = require('discord.js');

/**
 * Fetches an anime action GIF from the Nekos.best API and sends an embed.
 *
 * @param {Object} opts
 * @param {import('discord.js').ChatInputCommandInteraction|null} opts.interaction - Slash command interaction (pass null for prefix)
 * @param {import('discord.js').Message|null}                     opts.message     - Prefix command message (pass null for slash)
 * @param {import('discord.js').User}                             opts.targetUser  - The user being targeted
 * @param {string}                                                opts.actionType  - Nekos.best endpoint (e.g. 'hug', 'pat', 'kiss')
 * @param {string}                                                opts.emoji       - Emoji to prefix the embed title
 * @param {number}                                                opts.color       - Embed hex color
 * @param {string}                                               [opts.customMsg]  - Optional custom message to append
 * @param {string[]}                                             [opts.hardcodedGifs] - Optional array of GIF URLs to use instead of the API
 */
async function sendAnimeAction({ interaction, message, targetUser, actionType, emoji, color, customMsg, hardcodedGifs }) {
    const isSlash = !!interaction;
    const author  = isSlash ? interaction.user : message.author;

    // Build a readable action phrase, e.g. "hugs", "pats", "kisses"
    // Use {target} to specify where the target's mention should go in the sentence.
    const actionPhrases = {
        angry:      { alone: 'is angry', targeted: 'is angry at {target}' },
        baka:       { alone: 'is acting like a baka!', targeted: 'calls {target} a baka!' },
        bite:       { alone: 'bites themselves', targeted: 'bites {target}' },
        blush:      { alone: 'blushes', targeted: 'blushes at {target}' },
        bored:      { alone: 'is bored', targeted: 'is bored with {target}' },
        cry:        { alone: 'cries', targeted: 'cries with {target}' },
        cuddle:     { alone: 'cuddles alone', targeted: 'cuddles with {target}' },
        cheer:      { alone: 'cheers!', targeted: 'cheers for {target}!' },
        dance:      { alone: 'dances', targeted: 'dances with {target}' },
        facepalm:   { alone: 'facepalms', targeted: 'facepalms at {target}' },
        feed:       { alone: 'eats', targeted: 'feeds {target}' },
        handhold:   { alone: 'holds their own hands', targeted: 'holds hands with {target}' },
        handshake:  { alone: 'shakes their own hand', targeted: 'shakes hands with {target}' },
        happy:      { alone: 'is happy', targeted: 'is happy with {target}' },
        highfive:   { alone: 'high fives themselves', targeted: 'high fives {target}' },
        hug:        { alone: 'hugs themselves', targeted: 'hugs {target}' },
        husbando:   { alone: 'claims a husbando', targeted: 'claims {target} as their husbando!' },
        kick:       { alone: 'kicks the air', targeted: 'kicks {target}' },
        kiss:       { alone: 'kisses themselves', targeted: 'kisses {target}' },
        kitsune:    { alone: 'shows off a kitsune', targeted: 'shows a kitsune to {target}' },
        laugh:      { alone: 'laughs', targeted: 'laughs with {target}' },
        lewd:       { alone: 'is being lewd', targeted: 'is lewd towards {target}' },
        lurk:       { alone: 'lurks', targeted: 'lurks at {target}' },
        neko:       { alone: 'shows off a neko', targeted: 'shows a neko to {target}' },
        nod:        { alone: 'nods', targeted: 'nods at {target}' },
        nom:        { alone: 'is munching on something', targeted: 'noms on {target}' },
        nope:       { alone: 'says nope', targeted: 'says nope to {target}' },
        pat:        { alone: 'pats themselves', targeted: 'pats {target}' },
        peck:       { alone: 'pecks themselves', targeted: 'pecks {target}' },
        pout:       { alone: 'pouts', targeted: 'pouts at {target}' },
        punch:      { alone: 'punches the air', targeted: 'punches {target}' },
        run:        { alone: 'runs', targeted: 'runs from {target}' },
        shoot:      { alone: 'shoots the air', targeted: 'shoots at {target}' },
        shocked:    { alone: 'is shocked!', targeted: 'is shocked by {target}!' },
        shrug:      { alone: 'shrugs', targeted: 'shrugs at {target}' },
        slap:       { alone: 'slaps themselves', targeted: 'slaps {target}' },
        sleep:      { alone: 'sleeps', targeted: 'sleeps next to {target}' },
        smug:       { alone: 'is being smug', targeted: 'is smug towards {target}' },
        stare:      { alone: 'stares', targeted: 'stares at {target}' },
        surprised:  { alone: 'is surprised!', targeted: 'is surprised by {target}!' },
        think:      { alone: 'thinks', targeted: 'thinks about {target}' },
        thumbsup:   { alone: 'gives a thumbs up', targeted: 'gives a thumbs up to {target}' },
        tickle:     { alone: 'tickles themselves', targeted: 'tickles {target}' },
        touch:      { alone: 'touches themselves', targeted: 'touches {target}' },
        waifu:      { alone: 'claims a waifu', targeted: 'claims {target} as their waifu!' },
        wave:       { alone: 'waves', targeted: 'waves at {target}' },
        wink:       { alone: 'winks', targeted: 'winks at {target}' },
        whoop:      { alone: 'cracks a whip!', targeted: 'whoops {target}!' },
        yawn:       { alone: 'yawns', targeted: 'yawns at {target}' },
        yay:        { alone: 'cheers! Yay!', targeted: 'cheers with {target}! Yay!' },
        yeet:       { alone: 'yeets something', targeted: 'yeets {target}' },
    };

    const phrases = actionPhrases[actionType] || { alone: actionType, targeted: `${actionType}s at {target}` };

    let gifUrl = null;
    if (hardcodedGifs && hardcodedGifs.length > 0) {
        gifUrl = hardcodedGifs[Math.floor(Math.random() * hardcodedGifs.length)];
    } else {
        // Map some actions to valid endpoints if they differ
        const endpointMap = { 
            yay: 'happy',
            peck: 'kiss',
            touch: 'pat'
        };
        const endpoint = endpointMap[actionType] || actionType;

        const waifuPicsCategories = [
            'bite', 'blush', 'cry', 'cuddle', 'dance', 'handhold', 'happy', 'highfive', 
            'hug', 'kick', 'kiss', 'neko', 'nom', 'pat', 'slap', 'smug', 'waifu', 'wave', 'wink', 'yeet'
        ];

        const otakuGifsCategories = [
            'angry', 'facepalm', 'pout', 'shrug', 'sleep', 'stare', 'thumbsup', 'yawn',
            'punch', 'run', 'shoot', 'tickle', 'nod', 'nope', 'feed', 'laugh', 'baka'
        ];

        try {
            if (waifuPicsCategories.includes(endpoint)) {
                // Fetch from Waifu.pics
                const response = await fetch(`https://api.waifu.pics/sfw/${endpoint}`, {
                    headers: { 'User-Agent': 'NishankaBot/2.0' }
                });
                if (response.ok) {
                    const data = await response.json();
                    gifUrl = data?.url ?? null;
                }
            } else if (otakuGifsCategories.includes(endpoint)) {
                // Fetch from OtakuGIFs
                const response = await fetch(`https://api.otakugifs.xyz/gif?reaction=${endpoint}&format=gif`, {
                    headers: { 'User-Agent': 'NishankaBot/2.0' }
                });
                if (response.ok) {
                    const data = await response.json();
                    gifUrl = data?.url ?? null;
                }
            } else {
                // General fallback for unsupported categories (like husbando, kitsune, etc.)
                const response = await fetch(`https://api.waifu.pics/sfw/smile`, {
                    headers: { 'User-Agent': 'NishankaBot/2.0' }
                });
                if (response.ok) {
                    const data = await response.json();
                    gifUrl = data?.url ?? null;
                }
            }
        } catch (err) {
            console.warn(`[sendAnimeAction] Failed to fetch GIF for "${actionType}":`, err.message);
        }
    }

    const isAlone = !targetUser || targetUser.id === author.id;
    const phraseDef = isAlone ? phrases.alone : phrases.targeted;

    let actionText = '';
    if (isAlone) {
        actionText = `**<@${author.id}>** ${phraseDef}`;
    } else {
        if (phraseDef.includes('{target}')) {
            actionText = `**<@${author.id}>** ${phraseDef.replace('{target}', `**<@${targetUser.id}>**`)}`;
        } else {
            actionText = `**<@${author.id}>** ${phraseDef} **<@${targetUser.id}>**`;
        }
    }

    let description;
    if (customMsg) {
        description = `${actionText}\n*"${customMsg}"*`;
    } else {
        description = actionText;
    }

    const authorMember = isSlash ? interaction.member : message.member;

    const embed = new EmbedBuilder()
        .setColor(color ?? 0x7289DA)
        .setTitle(`${emoji} ${actionType.charAt(0).toUpperCase() + actionType.slice(1)}!`)
        .setDescription(description)
        .setFooter({ text: hardcodedGifs ? `Action!` : `Powered by Waifu.pics & OtakuGIFs`, iconURL: authorMember?.displayAvatarURL({ dynamic: true }) || author.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();

    if (gifUrl) embed.setImage(gifUrl);

    if (isSlash) {
        if (interaction.deferred) {
            await interaction.editReply({ embeds: [embed] });
        } else {
            await interaction.reply({ embeds: [embed] });
        }
    } else {
        await message.channel.send({ embeds: [embed] });
    }
}

module.exports = { sendAnimeAction };
