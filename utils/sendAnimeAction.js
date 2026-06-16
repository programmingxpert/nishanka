/* eslint-disable */
const { EmbedBuilder } = require('discord.js');

const FALLBACK_GIFS = {
    hug: 'https://media.giphy.com/media/lrr9rHuoJOE0w/giphy.gif',
    pat: 'https://media.giphy.com/media/5tmQbXY89uS84A6NM5/giphy.gif',
    kiss: 'https://media.giphy.com/media/K7o1n1rvhQypy/giphy.gif',
    slap: 'https://media.giphy.com/media/IYg0Z4S74L49Q/giphy.gif',
    happy: 'https://media.giphy.com/media/1136UBdSNn6yY0/giphy.gif',
    dance: 'https://media.giphy.com/media/13CoXDiaCcC2EA/giphy.gif',
    cry: 'https://media.giphy.com/media/X3Gb6WWdm2T60/giphy.gif'
};
const DEFAULT_FALLBACK = 'https://media.giphy.com/media/1136UBdSNn6yY0/giphy.gif';

async function fetchGifukai(endpoint) {
    const gifukaiCategories = [
        'angry', 'bite', 'blowkiss', 'blush', 'bonk', 'carry', 'clap', 'cry',
        'cuddle', 'dance', 'eat', 'facepalm', 'feed', 'happy', 'hi', 'highfive',
        'hug', 'kick', 'kill', 'kiss', 'laugh', 'nod', 'nope', 'pat',
        'peek', 'poke', 'pout', 'punch', 'run', 'shrug', 'shy', 'sip',
        'slap', 'sleep', 'smile', 'smug', 'stare', 'taunt', 'think', 'thumbsup',
        'tickle', 'wallslam', 'wave', 'wink'
    ];
    if (!gifukaiCategories.includes(endpoint)) return null;
    try {
        const response = await fetch(`https://api.gifukai.com/${endpoint}`, {
            headers: { 'User-Agent': 'NishankaBot/2.0' },
            signal: AbortSignal.timeout(4000)
        });
        if (response.ok) {
            const data = await response.json();
            return {
                url: data?.url ?? null,
                anime: data?.anime ?? null
            };
        }
    } catch (e) {}
    return null;
}

async function fetchWaifuPics(endpoint) {
    // waifu.pics is permanently offline / domain expired
    return null;
}

async function fetchOtakuGifs(endpoint) {
    const otakuGifsCategories = [
        'airkiss', 'angrystare', 'bite', 'bleh', 'blush', 'brofist', 'celebrate', 'cheers', 'clap', 'confused',
        'cool', 'cry', 'cuddle', 'dance', 'drool', 'evillaugh', 'facepalm', 'handhold', 'happy', 'headbang',
        'hug', 'huh', 'kiss', 'laugh', 'lick', 'love', 'mad', 'nervous', 'no', 'nom', 'nosebleed', 'nuzzle',
        'nyah', 'pat', 'peek', 'pinch', 'poke', 'pout', 'punch', 'roll', 'run', 'sad', 'scared', 'shout',
        'shrug', 'shy', 'sigh', 'sing', 'sip', 'slap', 'sleep', 'slowclap', 'smack', 'smile', 'smug', 'sneeze',
        'sorry', 'stare', 'stop', 'surprised', 'sweat', 'thumbsup', 'tickle', 'tired', 'wave', 'wink', 'woah',
        'yawn', 'yay', 'yes'
    ];
    if (!otakuGifsCategories.includes(endpoint)) return null;
    try {
        const response = await fetch(`https://api.otakugifs.xyz/gif?reaction=${endpoint}&format=gif`, {
            headers: { 'User-Agent': 'Nishanka/2.0 (https://nishanka.xyz)' },
            signal: AbortSignal.timeout(4000)
        });
        if (response.ok) {
            const data = await response.json();
            return { url: data?.url ?? null, anime: null };
        }
    } catch (e) {}
    return null;
}

async function fetchNekosBest(endpoint) {
    try {
        const response = await fetch(`https://nekos.best/api/v2/${endpoint}`, {
            headers: { 'User-Agent': 'Nishanka/2.0 (https://nishanka.xyz)' },
            signal: AbortSignal.timeout(4000)
        });
        if (response.ok) {
            const data = await response.json();
            const result = data.results?.[0];
            return {
                url: result?.url ?? null,
                anime: result?.anime_name ?? null
            };
        }
    } catch (e) {}
    return null;
}


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
    let animeSource = null;
    let apiResultFrom = null;

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

        // Shuffling priority list for slap to ensure variety across APIs
        let result = null;
        let providers = ['gifukai', 'primary', 'nekosbest'];
        if (endpoint === 'slap') {
            for (let i = providers.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [providers[i], providers[j]] = [providers[j], providers[i]];
            }
        }

        for (const provider of providers) {
            if (result && result.url) break;

            if (provider === 'gifukai') {
                result = await fetchGifukai(endpoint);
                if (result && result.url) apiResultFrom = 'Gifukai';
            } else if (provider === 'primary') {
                const primaryAPI = waifuPicsCategories.includes(endpoint) ? 'waifu' : 'otaku';
                if (primaryAPI === 'waifu') {
                    result = await fetchWaifuPics(endpoint);
                    if (result && result.url) {
                        apiResultFrom = 'WaifuPics';
                    } else {
                        result = await fetchOtakuGifs(endpoint);
                        if (result && result.url) apiResultFrom = 'OtakuGifs';
                    }
                } else {
                    result = await fetchOtakuGifs(endpoint);
                    if (result && result.url) {
                        apiResultFrom = 'OtakuGifs';
                    } else {
                        result = await fetchWaifuPics(endpoint);
                        if (result && result.url) apiResultFrom = 'WaifuPics';
                    }
                }
            } else if (provider === 'nekosbest') {
                result = await fetchNekosBest(endpoint);
                if (result && result.url) apiResultFrom = 'NekosBest';
            }
        }

        // 4. Resolve URL and anime source
        if (result && result.url) {
            gifUrl = result.url;
            animeSource = result.anime;
        } else {
            gifUrl = FALLBACK_GIFS[endpoint] || FALLBACK_GIFS[actionType] || DEFAULT_FALLBACK;
            console.warn(`[sendAnimeAction] All API fetches failed. Used fallback GIF for "${actionType}"`);
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

    let description = actionText;
    if (customMsg) {
        description += `\n*"${customMsg}"*`;
    }
    if (animeSource) {
        description += `\n\n🎬 **Anime:** *${animeSource}*`;
    }

    const authorMember = isSlash ? interaction.member : message.member;

    let footerText = 'Action!';
    if (!hardcodedGifs) {
        if (apiResultFrom === 'Gifukai') footerText = 'Powered by Gifukai';
        else if (apiResultFrom === 'WaifuPics') footerText = 'Powered by Waifu.pics';
        else if (apiResultFrom === 'OtakuGifs') footerText = 'Powered by OtakuGIFs';
        else if (apiResultFrom === 'NekosBest') footerText = 'Powered by nekos.best';
        else footerText = 'Powered by Waifu.pics & OtakuGIFs';
    }

    const embed = new EmbedBuilder()
        .setColor(color ?? 0x7289DA)
        .setTitle(`${emoji} ${actionType.charAt(0).toUpperCase() + actionType.slice(1)}!`)
        .setDescription(description)
        .setFooter({ text: footerText, iconURL: authorMember?.displayAvatarURL({ dynamic: true }) || author.displayAvatarURL({ dynamic: true }) })
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
