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
        angry:      'is angry at',
        baka:       'calls baka to',
        bite:       'bites',
        blush:      'blushes at',
        bored:      'is bored with',
        cry:        'cries to',
        cuddle:     'cuddles with',
        dance:      'dances with',
        facepalm:   'facepalms at',
        feed:       'feeds',
        handhold:   'holds hands with',
        handshake:  'shakes hands with',
        happy:      'is happy with',
        highfive:   'high fives',
        hug:        'hugs',
        husbando:   'claims as husbando',
        kick:       'kicks',
        kiss:       'kisses',
        kitsune:    'shows a kitsune to',
        laugh:      'laughs with',
        lewd:       'is lewd towards',
        lurk:       'lurks at',
        neko:       'shows a neko to',
        nod:        'nods at',
        nom:        'noms',
        nope:       'says nope to',
        pat:        'pats',
        peck:       'pecks',
        pout:       'pouts at',
        punch:      'punches',
        run:        'runs from',
        shoot:      'shoots at',
        shrug:      'shrugs at',
        slap:       'slaps',
        sleep:      'sleeps with',
        smug:       'is smug towards',
        stare:      'stares at',
        think:      'thinks about',
        thumbsup:   'gives a thumbs up to',
        tickle:     'tickles',
        touch:      'touches',
        waifu:      'claims as waifu',
        wave:       'waves at',
        wink:       'winks at',
        yawn:       'yawns at',
        yeet:       'yeets',
    };

    const phrase = actionPhrases[actionType] || actionType;

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

    const description = customMsg
        ? `**<@${author.id}>** ${phrase} **<@${targetUser.id}>**\n*"${customMsg}"*`
        : `**<@${author.id}>** ${phrase} **<@${targetUser.id}>**`;

    const embed = new EmbedBuilder()
        .setColor(color ?? 0x7289DA)
        .setTitle(`${emoji} ${actionType.charAt(0).toUpperCase() + actionType.slice(1)}!`)
        .setDescription(description)
        .setFooter({ text: `Powered by Nekos.best`, iconURL: author.displayAvatarURL({ dynamic: true }) })
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
