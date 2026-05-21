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
 */
async function sendAnimeAction({ interaction, message, targetUser, actionType, emoji, color, customMsg }) {
    const isSlash = !!interaction;
    const author  = isSlash ? interaction.user : message.author;

    // Build a readable action phrase, e.g. "hugs", "pats", "kisses"
    const actionPhrases = {
        angry:      { alone: 'is angry', targeted: 'is angry at' },
        baka:       { alone: 'is acting like a baka', targeted: 'calls out baka at' },
        bite:       { alone: 'bites themselves', targeted: 'bites' },
        blush:      { alone: 'blushes', targeted: 'blushes at' },
        bored:      { alone: 'is bored', targeted: 'is bored with' },
        cry:        { alone: 'cries', targeted: 'cries to' },
        cuddle:     { alone: 'cuddles alone', targeted: 'cuddles with' },
        dance:      { alone: 'dances', targeted: 'dances with' },
        facepalm:   { alone: 'facepalms', targeted: 'facepalms at' },
        feed:       { alone: 'eats', targeted: 'feeds' },
        handhold:   { alone: 'holds their own hands', targeted: 'holds hands with' },
        handshake:  { alone: 'shakes their own hand', targeted: 'shakes hands with' },
        happy:      { alone: 'is happy', targeted: 'is happy with' },
        highfive:   { alone: 'high fives themselves', targeted: 'high fives' },
        hug:        { alone: 'hugs themselves', targeted: 'hugs' },
        husbando:   { alone: 'claims a husbando', targeted: 'claims as husbando' },
        kick:       { alone: 'kicks the air', targeted: 'kicks' },
        kiss:       { alone: 'kisses themselves', targeted: 'kisses' },
        kitsune:    { alone: 'shows off a kitsune', targeted: 'shows a kitsune to' },
        laugh:      { alone: 'laughs', targeted: 'laughs with' },
        lewd:       { alone: 'is being lewd', targeted: 'is lewd towards' },
        lurk:       { alone: 'lurks', targeted: 'lurks at' },
        neko:       { alone: 'shows off a neko', targeted: 'shows a neko to' },
        nod:        { alone: 'nods', targeted: 'nods at' },
        nom:        { alone: 'is munching on something', targeted: 'noms on' },
        nope:       { alone: 'says nope', targeted: 'says nope to' },
        pat:        { alone: 'pats themselves', targeted: 'pats' },
        peck:       { alone: 'pecks themselves', targeted: 'pecks' },
        pout:       { alone: 'pouts', targeted: 'pouts at' },
        punch:      { alone: 'punches the air', targeted: 'punches' },
        run:        { alone: 'runs', targeted: 'runs from' },
        shoot:      { alone: 'shoots the air', targeted: 'shoots at' },
        shrug:      { alone: 'shrugs', targeted: 'shrugs at' },
        slap:       { alone: 'slaps themselves', targeted: 'slaps' },
        sleep:      { alone: 'sleeps', targeted: 'sleeps next to' },
        smug:       { alone: 'is being smug', targeted: 'is smug towards' },
        stare:      { alone: 'stares', targeted: 'stares at' },
        think:      { alone: 'thinks', targeted: 'thinks about' },
        thumbsup:   { alone: 'gives a thumbs up', targeted: 'gives a thumbs up to' },
        tickle:     { alone: 'tickles themselves', targeted: 'tickles' },
        touch:      { alone: 'touches themselves', targeted: 'touches' },
        waifu:      { alone: 'claims a waifu', targeted: 'claims as waifu' },
        wave:       { alone: 'waves', targeted: 'waves at' },
        wink:       { alone: 'winks', targeted: 'winks at' },
        yawn:       { alone: 'yawns', targeted: 'yawns at' },
        yeet:       { alone: 'yeets something', targeted: 'yeets' },
    };

    const phrases = actionPhrases[actionType] || { alone: actionType, targeted: `${actionType}s at` };

    let gifUrl = null;
    try {
        const response = await fetch(`https://nekos.best/api/v2/${actionType}`);
        if (response.ok) {
            const data = await response.json();
            gifUrl = data?.results?.[0]?.url ?? null;
        }
    } catch (err) {
        console.warn(`[sendAnimeAction] Failed to fetch GIF for "${actionType}":`, err.message);
    }

    const isAlone = !targetUser || targetUser.id === author.id;
    const phrase = isAlone ? phrases.alone : phrases.targeted;

    let description;
    if (isAlone) {
        description = customMsg
            ? `**<@${author.id}>** ${phrase}\n*"${customMsg}"*`
            : `**<@${author.id}>** ${phrase}`;
    } else {
        description = customMsg
            ? `**<@${author.id}>** ${phrase} **<@${targetUser.id}>**\n*"${customMsg}"*`
            : `**<@${author.id}>** ${phrase} **<@${targetUser.id}>**`;
    }

    const authorMember = isSlash ? interaction.member : message.member;

    const embed = new EmbedBuilder()
        .setColor(color ?? 0x7289DA)
        .setTitle(`${emoji} ${actionType.charAt(0).toUpperCase() + actionType.slice(1)}!`)
        .setDescription(description)
        .setFooter({ text: `Powered by Nekos.best`, iconURL: authorMember?.displayAvatarURL({ dynamic: true }) || author.displayAvatarURL({ dynamic: true }) })
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
