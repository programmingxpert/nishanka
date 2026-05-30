async function test() {
    const urls = [
        'https://i.imgur.com/non_existent_123456_image.png',
        'https://i.imgur.com/Kz8Jp58.png',
        'https://i.imgur.com/6a6Q46L.png',
        'https://i.imgur.com/8Q8W17Y.png',
        'https://i.imgur.com/gK9C1lS.png',
        'https://i.imgur.com/E16J5xK.png',
        'https://i.imgur.com/KqW426A.png',
        'https://i.imgur.com/eB0rNpe.png',
        'https://i.imgur.com/X4yD3mB.png',
        'https://i.imgur.com/w2LdO9A.png',
        'https://i.imgur.com/7KylvE6.png'
    ];
    for (const url of urls) {
        try {
            const res = await fetch(url);
            const buf = await res.arrayBuffer();
            console.log(`Length: ${buf.byteLength} bytes - ${url}`);
        } catch (e) {
            console.log(`Error: ${e.message} - ${url}`);
        }
    }
}
test();
