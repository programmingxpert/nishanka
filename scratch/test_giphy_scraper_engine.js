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
        
        // Match standard Giphy direct media URLs
        // Format: https://mediaX.giphy.com/media/ID/giphy.gif or with client credentials
        const regex = /https:\/\/media\d+\.giphy\.com\/media\/[a-zA-Z0-9_.\-\/]+\/giphy\.gif/g;
        const matches = html.match(regex) || [];
        
        // Deduplicate and filter out avatar / unrelated gifs
        const unique = [...new Set(matches)];
        return unique;
    } catch (e) {
        console.error("Giphy scraper error:", e);
        return [];
    }
}

async function test() {
    const queries = [
        'goku kamehameha',
        'gojo satoru unlimited void',
        'saitama serious punch',
        'naruto rasengan',
        'luffy gear 5'
    ];

    for (const q of queries) {
        console.log(`\nSearching for: "${q}"...`);
        const gifs = await fetchGiphyGifs(q);
        console.log(`Found ${gifs.length} GIF(s).`);
        if (gifs.length > 0) {
            console.log("Sample matches:");
            for (let i = 0; i < Math.min(3, gifs.length); i++) {
                const gif = gifs[i];
                // Check if URL is valid
                try {
                    const check = await fetch(gif, { method: 'HEAD' });
                    console.log(`  [${i}] ${check.ok ? '✅ 200 OK' : `❌ Status ${check.status}`}: ${gif}`);
                } catch (err) {
                    console.log(`  [${i}] ❌ Error: ${err.message}`);
                }
            }
        }
    }
}
test();
