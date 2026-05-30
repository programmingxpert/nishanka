async function test() {
    console.log("Analyzing Giphy HTML for image patterns...");
    try {
        const res = await fetch('https://giphy.com/search/goku-kamehameha', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
            }
        });
        const html = await res.text();
        
        // Find URLs that look like image sources
        const regexes = [
            /https?:\/\/[a-zA-Z0-9.\-]+\/media\/[a-zA-Z0-9_]+/g,
            /https?:\/\/i\.giphy\.com\/[a-zA-Z0-9_]+\.gif/g,
            /https?:\/\/media\d+\.giphy\.com\/[a-zA-Z0-9_\/]+\.gif/g,
            /https?:\/\/media\d+\.giphy\.com\/media\/[a-zA-Z0-9]+/g
        ];

        for (let idx = 0; idx < regexes.length; idx++) {
            const matches = html.match(regexes[idx]) || [];
            console.log(`Regex ${idx} found ${matches.length} matches. Sample:`, matches.slice(0, 5));
        }

        // Search for JSON state
        const nextStateMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);
        if (nextStateMatch) {
            console.log("Found __NEXT_DATA__ JSON!");
            const data = JSON.parse(nextStateMatch[1]);
            // Search inside JSON for Giphy IDs
            // Let's recursively search for objects with 'id' or 'images'
            const ids = [];
            function traverse(obj) {
                if (!obj || typeof obj !== 'object') return;
                if (obj.id && typeof obj.id === 'string' && obj.id.length === 12 && /^[a-zA-Z0-9]+$/.test(obj.id)) {
                    ids.push(obj.id);
                }
                for (const key in obj) {
                    traverse(obj[key]);
                }
            }
            traverse(data);
            console.log(`Found ${ids.length} potential Giphy IDs! Samples:`, ids.slice(0, 10));
        }
    } catch (e) {
        console.error("Error analyzing:", e);
    }
}
test();
