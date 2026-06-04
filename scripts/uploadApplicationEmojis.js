const fs = require('fs');
const path = require('path');
require('dotenv').config();

const root = path.join(__dirname, '..');
const manifestPath = path.join(root, 'assets', 'emojis', 'manifest.json');
const localMapPath = path.join(root, 'assets', 'emojis', 'discord-emojis.local.json');
const apiBase = 'https://discord.com/api/v10';

const shouldApply = process.argv.includes('--apply');

function readJson(filePath, fallback) {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function emojiMarkup(name, id, animated = false) {
    return `<${animated ? 'a' : ''}:${name}:${id}>`;
}

async function discordRequest(route, options = {}) {
    const token = process.env.TOKEN;
    if (!token) throw new Error('Missing TOKEN in environment.');

    const response = await fetch(`${apiBase}${route}`, {
        ...options,
        headers: {
            Authorization: `Bot ${token}`,
            'Content-Type': 'application/json',
            ...(options.headers || {})
        }
    });

    const text = await response.text();
    const body = text ? JSON.parse(text) : null;

    if (!response.ok) {
        const message = body?.message || response.statusText;
        throw new Error(`${response.status} ${message}`);
    }

    return body;
}

async function main() {
    const applicationId = process.env.DISCORD_CLIENT_ID || process.env.CLIENT_ID;
    if (!applicationId) {
        throw new Error('Missing DISCORD_CLIENT_ID or CLIENT_ID in environment.');
    }

    const manifest = readJson(manifestPath, { assets: [] });
    const localMap = readJson(localMapPath, {});
    const generatedAssets = (manifest.assets || []).filter(asset => asset.status === 'generated' && asset.png);

    const existingResponse = await discordRequest(`/applications/${applicationId}/emojis`);
    const existing = new Map((existingResponse.items || existingResponse || []).map(item => [item.name, item]));

    console.log(`${shouldApply ? 'Uploading' : 'Dry run for'} ${generatedAssets.length} generated emoji asset(s).`);

    for (const asset of generatedAssets) {
        const pngPath = path.join(root, asset.png);
        if (!fs.existsSync(pngPath)) {
            console.warn(`Skipping ${asset.key}: missing ${asset.png}`);
            continue;
        }

        const found = existing.get(asset.discordName);
        if (found) {
            localMap[asset.key] = emojiMarkup(found.name, found.id, found.animated);
            console.log(`Exists: ${asset.discordName} -> ${localMap[asset.key]}`);
            continue;
        }

        if (!shouldApply) {
            console.log(`Would upload: ${asset.discordName} from ${asset.png}`);
            continue;
        }

        const image = `data:image/png;base64,${fs.readFileSync(pngPath).toString('base64')}`;
        const created = await discordRequest(`/applications/${applicationId}/emojis`, {
            method: 'POST',
            body: JSON.stringify({
                name: asset.discordName,
                image
            })
        });

        localMap[asset.key] = emojiMarkup(created.name, created.id, created.animated);
        console.log(`Uploaded: ${asset.discordName} -> ${localMap[asset.key]}`);
    }

    if (shouldApply) {
        fs.writeFileSync(localMapPath, `${JSON.stringify(localMap, null, 2)}\n`);
        console.log(`Wrote ${path.relative(root, localMapPath)}`);
    } else {
        console.log('Dry run only. Re-run with --apply to upload and write the local mapping.');
    }
}

main().catch(error => {
    console.error(`[EmojiUpload] ${error.message}`);
    process.exitCode = 1;
});
