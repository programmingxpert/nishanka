const characters = [
    'Goku',
    'Satoru Gojo',
    'Saitama',
    'Naruto Uzumaki',
    'Monkey D. Luffy',
    'Rimuru Tempest',
    'Ryomen Sukuna',
    'Madara Uchiha',
    'Kaido',
    'Frieza'
];

async function getAvatar(name) {
    try {
        const query = encodeURIComponent(name);
        const url = `https://api.jikan.moe/v4/characters?q=${query}&limit=1`;
        const res = await fetch(url);
        if (!res.ok) {
            console.log(`❌ ${name}: Status ${res.status}`);
            return null;
        }
        const data = await res.json();
        if (data.data && data.data.length > 0) {
            const char = data.data[0];
            const imageUrl = char.images.jpg.image_url;
            console.log(`✅ ${name}: ${imageUrl}`);
            return imageUrl;
        } else {
            console.log(`❌ ${name}: No character found on MAL.`);
            return null;
        }
    } catch (e) {
        console.log(`❌ ${name}: Error - ${e.message}`);
        return null;
    }
}

async function run() {
    console.log("Searching Jikan API for anime character images...");
    for (const name of characters) {
        await getAvatar(name);
        // Wait 1 second to respect Jikan API rate limits (1 req/sec is safe, limit is 3 req/sec)
        await new Promise(resolve => setTimeout(resolve, 1200));
    }
}
run();
