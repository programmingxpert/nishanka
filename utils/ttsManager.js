const GuildSettings = require('../models/guildSettingsSchema');

// A map to track user cooldowns: key: `${guildId}-${userId}`, value: timestamp
const ttsCooldowns = new Map();

// A map to hold TTS queue per guild: key: guildId, value: { queue: [], playing: false }
const guildTtsQueues = new Map();

// Clean up text for TTS to make it non-annoying and strip trolls
function cleanTextForTTS(text, client, guild) {
    if (!text) return '';

    // 1. Remove URLs/links
    let cleaned = text.replace(/https?:\/\/\S+/gi, 'link');

    // 2. Replace user pings with display names
    cleaned = cleaned.replace(/<@!?(\d+)>/g, (match, id) => {
        const member = guild.members.cache.get(id);
        return member ? member.displayName : 'user';
    });

    // 3. Replace role pings with role names
    cleaned = cleaned.replace(/<@&(\d+)>/g, (match, id) => {
        const role = guild.roles.cache.get(id);
        return role ? role.name : 'role';
    });

    // 4. Replace channel pings with channel names
    cleaned = cleaned.replace(/<#(\d+)>/g, (match, id) => {
        const channel = guild.channels.cache.get(id);
        return channel ? channel.name : 'channel';
    });

    // 5. Strip custom emojis
    cleaned = cleaned.replace(/<a?:\w+:(\d+)>/g, '');

    // 6. Clean up repeated characters (e.g. hellooooo -> hello, ahhhhh -> ah)
    // Reduce 3+ repeats of any character to 2 to prevent "spam-spelled" speech
    cleaned = cleaned.replace(/(.)\1{2,}/g, '$1$1');

    // 7. Strip special symbols that sound weird in TTS
    cleaned = cleaned.replace(/[#_*`~|]/g, '');

    // 8. Trim and limit length
    cleaned = cleaned.trim();

    return cleaned;
}

// Queue a new TTS message
function queueTTS(client, guildId, text, voice, authorName) {
    if (!guildTtsQueues.has(guildId)) {
        guildTtsQueues.set(guildId, { queue: [], playing: false });
    }

    const guildQueue = guildTtsQueues.get(guildId);
    guildQueue.queue.push({ text, voice, author: authorName });

    processTtsQueue(client, guildId);
}

// Process the next TTS in queue
async function processTtsQueue(client, guildId) {
    const guildQueue = guildTtsQueues.get(guildId);
    if (!guildQueue || guildQueue.queue.length === 0 || guildQueue.playing) {
        return;
    }

    const player = client.activePlayers.get(guildId);
    if (!player) {
        guildQueue.queue = [];
        guildQueue.playing = false;
        return;
    }

    guildQueue.playing = true;
    const nextTts = guildQueue.queue.shift();

    try {
        // Construct standard Google Translate TTS API URL
        const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(`${nextTts.author} says: ${nextTts.text}`)}&tl=${nextTts.voice}&client=tw-ob`;
        const res = await client.riffy.resolve({ query: ttsUrl, requester: client.user });

        if (!res || !res.tracks || res.tracks.length === 0) {
            guildQueue.playing = false;
            setTimeout(() => processTtsQueue(client, guildId), 500);
            return;
        }

        const ttsTrack = res.tracks[0];
        // Inject custom properties to identify as TTS
        ttsTrack.info.isTTS = true;
        ttsTrack.info.title = `TTS: ${nextTts.text.substring(0, 30)}`;
        ttsTrack.info.author = nextTts.author;

        // If there's already a track playing (and it's not a TTS track itself), interrupt it
        if (player.current && !player.current.info.isTTS) {
            player.interruptedTrack = {
                track: player.current,
                position: player.position
            };
        }

        // Put TTS track at the front of the queue and stop current track to force immediate play
        player.queue.unshift(ttsTrack);
        player.stop();

    } catch (err) {
        console.error(`[TTS Manager] Error playing TTS track for guild ${guildId}:`, err);
        guildQueue.playing = false;
        setTimeout(() => processTtsQueue(client, guildId), 500);
    }
}

// Skip/cancel TTS and restore music if interrupted
function skipTTS(client, guildId) {
    const player = client.activePlayers.get(guildId);
    if (!player) return false;

    const guildQueue = guildTtsQueues.get(guildId);
    if (guildQueue) {
        guildQueue.queue = []; // Clear pending TTS
        guildQueue.playing = false;
    }

    if (player.current && player.current.info.isTTS) {
        player.stop(); // Stops the current TTS track. Riffy's trackEnd will trigger the music restore.
        return true;
    }

    return false;
}

module.exports = {
    cleanTextForTTS,
    queueTTS,
    processTtsQueue,
    skipTTS,
    ttsCooldowns,
    guildTtsQueues
};
