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
        
        // Match Giphy direct CDN media URLs and capture the unique ID group
        const regex = /https:\/\/media\d+\.giphy\.com\/media\/[a-zA-Z0-9_.\-\/]+\/([a-zA-Z0-9]+)\/giphy\.gif/g;
        const gifs = [];
        let match;
        while ((match = regex.exec(html)) !== null) {
            const id = match[1];
            gifs.push(id);
        }
        
        return [...new Set(gifs)];
    } catch (e) {
        console.error("Giphy scraper error:", e);
        return [];
    }
}

async function test() {
    const queries = [
        'goku kamehameha',
        'gojo satoru',
        'gojo satoru red',
        'saitama side steps',
        'naruto rasengan',
        'luffy gear 5',
        'rimuru megiddo',
        'sukuna cleave',
        'madara shattered heaven',
        'kaido thunder bagua',
        'frieza supernova'
    ];

    for (const q of queries) {
        console.log(`\nQuery: "${q}"`);
        const ids = await fetchGiphyGifs(q);
        console.log(`Found ${ids.length} unique IDs.`);
        for (const id of ids) {
            const testUrl = `https://i.giphy.com/media/${id}/giphy.gif`;
            try {
                const res = await fetch(testUrl);
                const buf = await res.arrayBuffer();
                const size = buf.byteLength;
                if (size === 239321) {
                    console.log(`  ❌ INVALID (placeholder size): ${id} (${testUrl})`);
                } else {
                    console.log(`  ✅ VALID (${size} bytes): ${id}`);
                }
            } catch (err) {
                console.log(`  ⚠️ Error fetching: ${id} - ${err.message}`);
            }
        }
    }
}
test();
