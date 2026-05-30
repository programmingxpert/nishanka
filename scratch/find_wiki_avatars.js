const characters = {
    'Goku': 'https://dragonball.fandom.com/wiki/Goku',
    'Gojo Satoru': 'https://jujutsu-kaisen.fandom.com/wiki/Satoru_Gojo',
    'Saitama': 'https://onepunchman.fandom.com/wiki/Saitama',
    'Naruto': 'https://naruto.fandom.com/wiki/Naruto_Uzumaki',
    'Luffy': 'https://onepiece.fandom.com/wiki/Monkey_D._Luffy',
    'Rimuru': 'https://tensura.fandom.com/wiki/Rimuru_Tempest',
    'Sukuna': 'https://jujutsu-kaisen.fandom.com/wiki/Sukuna',
    'Madara Uchiha': 'https://naruto.fandom.com/wiki/Madara_Uchiha',
    'Kaido': 'https://onepiece.fandom.com/wiki/Kaido',
    'Frieza': 'https://dragonball.fandom.com/wiki/Frieza'
};

async function findAvatar(name, url) {
    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
            }
        });
        if (!res.ok) {
            console.log(`❌ Failed to fetch ${name}: Status ${res.status}`);
            return null;
        }
        const html = await res.text();
        
        // Find the infobox first
        // Fandom infoboxes typically use class="portable-infobox" or <aside>
        const asideMatch = html.match(/<aside[^>]*class="[^"]*portable-infobox[^"]*"[^>]*>([\s\S]*?)<\/aside>/);
        const searchScope = asideMatch ? asideMatch[1] : html;
        
        // Match img tag src containing static.wikia.nocookie.net
        const imgRegex = /src="(https:\/\/static\.wikia\.nocookie\.net\/[^"]+)"/g;
        let match;
        const urls = [];
        while ((match = imgRegex.exec(searchScope)) !== null) {
            let imgUrl = match[1];
            // Remove revision part if possible to get clean latest version
            imgUrl = imgUrl.split('/revision/')[0];
            urls.push(imgUrl);
        }

        if (urls.length > 0) {
            console.log(`✅ ${name}: ${urls[0]}`);
            return urls[0];
        } else {
            console.log(`❌ ${name}: No static wikia image found in infobox.`);
            return null;
        }
    } catch (e) {
        console.log(`❌ Error finding ${name}: ${e.message}`);
        return null;
    }
}

async function run() {
    console.log("Searching for character avatars on Fandom wikis...");
    for (const [name, url] of Object.entries(characters)) {
        await findAvatar(name, url);
        // Wait a bit to avoid hammering
        await new Promise(resolve => setTimeout(resolve, 500));
    }
}
run();
