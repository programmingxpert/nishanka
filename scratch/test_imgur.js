const avatars = [
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

async function test() {
    for (const url of avatars) {
        try {
            const res = await fetch(url, { method: 'HEAD' });
            console.log(`[${res.status}] ${url}`);
        } catch (e) {
            console.log(`Error: ${e.message} - ${url}`);
        }
    }
}
test();
