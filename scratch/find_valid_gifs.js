const fs = require('fs');

const ABILITY_QUERIES = {
    'goku-kamehameha': 'goku kamehameha',
    'goku-super-saiyan-power-up': 'goku super saiyan power up',
    'goku-instant-transmission': 'goku instant transmission',
    'goku-spirit-bomb': 'goku spirit bomb',
    'gojo-reversal-red': 'gojo red curse technique',
    'gojo-infinity': 'gojo satoru infinity',
    'gojo-lapse-blue': 'gojo blue curse technique',
    'gojo-satoru-unlimited-void': 'gojo unlimited void domain expansion',
    'saitama-normal-punch': 'saitama normal punch',
    'saitama-serious-side-steps': 'saitama serious side steps dodge',
    'saitama-consecutive-normal-punches': 'saitama consecutive normal punches',
    'saitama-serious-punch': 'saitama serious punch',
    'naruto-rasengan': 'naruto rasengan',
    'naruto-shadow-clone-jutsu': 'naruto shadow clone jutsu',
    'naruto-kurama-link-mode': 'naruto kurama link mode mode',
    'naruto-rasenshuriken': 'naruto rasenshuriken',
    'luffy-gum-gum-pistol': 'luffy gum gum pistol',
    'luffy-gear-second': 'luffy gear second',
    'luffy-armament-haki': 'luffy armament haki',
    'luffy-gear-5-bajrang-gun': 'luffy gear 5 bajrang gun',
    'goku-dodge': 'goku dodge',
    'gojo-dodge': 'gojo satoru dodge',
    'saitama-dodge': 'saitama dodge',
    'naruto-dodge': 'naruto dodge',
    'luffy-dodge': 'luffy dodge',
    'rimuru-dodge': 'rimuru tempest dodge'
};

async function fetchGiphyGifs(query) {
    const formattedQuery = encodeURIComponent(query.replace(/\s+/g, '-'));
    const url = `https://giphy.com/search/${formattedQuery}`;
    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
            }
        });
        if (!res.ok) return [];
        const html = await res.text();
        const regex = /https:\/\/media\d+\.giphy\.com\/media\/[a-zA-Z0-9_.\-\/]+\/([a-zA-Z0-9]+)\/giphy\.gif/g;
        const ids = [];
        let match;
        while ((match = regex.exec(html)) !== null) {
            ids.push(match[1]);
        }
        return [...new Set(ids)];
    } catch (e) {
        return [];
    }
}

async function validateGifId(id) {
    const testUrl = `https://i.giphy.com/media/${id}/giphy.gif`;
    try {
        const res = await fetch(testUrl);
        if (!res.ok) return false;
        const buf = await res.arrayBuffer();
        if (buf.byteLength === 239321) {
            return false; // placeholder image
        }
        return true;
    } catch (err) {
        return false;
    }
}

async function main() {
    console.log("Starting GIF discovery...");
    const results = {};
    for (const [key, searchQ] of Object.entries(ABILITY_QUERIES)) {
        console.log(`Searching for ${key} ("${searchQ}")...`);
        const ids = await fetchGiphyGifs(searchQ);
        console.log(`  Found ${ids.length} raw IDs.`);
        const validUrls = [];
        for (const id of ids) {
            if (validUrls.length >= 3) break;
            const isValid = await validateGifId(id);
            if (isValid) {
                validUrls.push(`https://media.giphy.com/media/${id}/giphy.gif`);
                console.log(`    ✅ VALID: ${id}`);
            } else {
                console.log(`    ❌ INVALID/Blocked: ${id}`);
            }
        }
        results[key] = validUrls;
    }
    fs.writeFileSync('scratch/valid_discovered_gifs.json', JSON.stringify(results, null, 2));
    console.log("Discovery complete! Saved to scratch/valid_discovered_gifs.json");
}

main();
