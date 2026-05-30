async function test() {
    console.log("Testing Giphy scrape...");
    try {
        const res = await fetch('https://giphy.com/search/goku-kamehameha', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
            }
        });
        console.log(`Status: ${res.status}`);
        const html = await res.text();
        console.log(`HTML Length: ${html.length}`);
        console.log("Beginning of HTML:");
        console.log(html.substring(0, 500));
        
        // Try regex to find media URLs
        const regex = /https:\/\/media\d+\.giphy\.com\/media\/([a-zA-Z0-9]+)\/giphy\.gif/g;
        const matches = [];
        let match;
        while ((match = regex.exec(html)) !== null) {
            matches.push(match[1]);
        }
        console.log("Found matches:", matches.slice(0, 10));
    } catch (e) {
        console.error("Error scraping:", e);
    }
}
test();
