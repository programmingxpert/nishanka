const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '..', 'assets', 'emojis', 'manifest.json');
const localOverridePath = path.join(__dirname, '..', 'assets', 'emojis', 'discord-emojis.local.json');

function readJson(filePath, fallback) {
    try {
        if (!fs.existsSync(filePath)) return fallback;
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
        console.warn(`[CustomEmojis] Failed to read ${filePath}:`, error.message);
        return fallback;
    }
}

const manifest = readJson(manifestPath, { assets: [] });
const localOverrides = readJson(localOverridePath, {});
const assetsByKey = new Map((manifest.assets || []).map(asset => [asset.key, asset]));

function envNameForKey(key) {
    return `NISHANKA_EMOJI_${key.replace(/[^a-z0-9]+/gi, '_').toUpperCase()}`;
}

function emoji(key, fallback = '') {
    const envValue = process.env[envNameForKey(key)];
    if (envValue) return envValue;

    if (localOverrides[key]) return localOverrides[key];

    const asset = assetsByKey.get(key);
    if (asset?.discord) return asset.discord;
    if (asset?.fallback) return asset.fallback;

    return fallback;
}

function emojiName(key) {
    const asset = assetsByKey.get(key);
    if (asset?.discordName) return asset.discordName;

    return `nk_${key.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').toLowerCase()}`;
}

function stripLeadingEmoji(name, fallbackEmoji) {
    if (!name) return '';

    let clean = name.replace(/^<a?:[a-zA-Z0-9_~]+:\d+>\s*/, '');
    if (fallbackEmoji && clean.startsWith(fallbackEmoji)) {
        clean = clean.slice(fallbackEmoji.length);
    } else {
        clean = clean.replace(/^[\p{Extended_Pictographic}\p{Emoji_Presentation}\u2600-\u27BF][\uFE0F\uFE0E]?(?:\u200D[\p{Extended_Pictographic}\p{Emoji_Presentation}\u2600-\u27BF][\uFE0F\uFE0E]?)*\s*/u, '');
    }

    return clean.trimStart();
}

function formatEmojiName(key, fallbackEmoji, name) {
    const displayEmoji = emoji(key, fallbackEmoji);
    const cleanName = stripLeadingEmoji(name, fallbackEmoji);
    return cleanName ? `${displayEmoji} ${cleanName}` : name;
}

function decorateEmojiDefinition(definition, key) {
    if (!definition) return definition;

    const fallbackEmoji = definition.emoji || '';
    definition.baseEmoji = fallbackEmoji;
    definition.emojiKey = key;
    definition.emoji = emoji(key, fallbackEmoji);

    if (definition.name) {
        definition.name = formatEmojiName(key, fallbackEmoji, definition.name);
    }

    return definition;
}

module.exports = {
    emoji,
    emojiName,
    stripLeadingEmoji,
    formatEmojiName,
    decorateEmojiDefinition
};
