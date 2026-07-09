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
        
        let res = null;
        const connectedNodes = [...client.riffy.nodeMap.values()].filter(node => node.connected);
        
        // Iterate through connected nodes to find one that resolves the HTTP stream successfully (skipping broken nodes)
        for (const node of connectedNodes) {
            try {
                const tempRes = await client.riffy.resolve({ query: ttsUrl, requester: client.user, node: node });
                if (tempRes && tempRes.tracks && tempRes.tracks.length > 0 && tempRes.loadType !== 'error') {
                    res = tempRes;
                    break;
                }
            } catch (resolveErr) {
                console.error(`[TTS Manager] Node "${node.name}" failed to resolve TTS URL:`, resolveErr.message);
            }
        }

        if (!res || !res.tracks || res.tracks.length === 0) {
            console.error(`[TTS Manager] Failed to resolve TTS URL on all connected Lavalink nodes.`);
            guildQueue.playing = false;
            setTimeout(() => processTtsQueue(client, guildId), 500);
            return;
        }

        const ttsTrack = res.tracks[0];
        // Inject custom properties to identify as TTS
        ttsTrack.info.isTTS = true;
        ttsTrack.info.title = `TTS: ${nextTts.text.substring(0, 30)}`;
        ttsTrack.info.author = nextTts.author;

        const isCurrentActive = player.current && (player.playing || player.paused);

        // If there's already a track playing (and it's not a TTS track itself), interrupt it
        const isCurrentTTS = player.current?.info?.isTTS || (player.current?.info?.uri && player.current.info.uri.includes('translate.google.com/translate_tts'));
        if (isCurrentActive && !isCurrentTTS) {
            player.interruptedTrack = {
                track: player.current,
                position: player.position
            };
        }

        // Put TTS track at the front of the queue
        player.queue.unshift(ttsTrack);

        if (isCurrentActive) {
            player.stop();
        } else {
            try {
                await player.play();
            } catch (playErr) {
                console.error("[TTS Manager] Error playing TTS track directly:", playErr);
                guildQueue.playing = false;
                setTimeout(() => processTtsQueue(client, guildId), 500);
            }
        }

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

    const isCurrentTTS = player.current?.info?.isTTS || (player.current?.info?.uri && player.current.info.uri.includes('translate.google.com/translate_tts'));
    if (player.current && isCurrentTTS) {
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
