const urls = [
    'https://raw.githubusercontent.com/TheMostafax/My_Anime_App/main/assets/goku.png',
    'https://raw.githubusercontent.com/TheMostafax/My_Anime_App/master/assets/goku.png',
    'https://raw.githubusercontent.com/TheMostafax/My_Anime_App/main/assets/luffy.png',
    'https://raw.githubusercontent.com/TheMostafax/My_Anime_App/master/assets/luffy.png',
    'https://raw.githubusercontent.com/TheMostafax/My_Anime_App/main/assets/naruto.png',
    'https://raw.githubusercontent.com/TheMostafax/My_Anime_App/master/assets/naruto.png',
    'https://raw.githubusercontent.com/TheMostafax/My_Anime_App/main/assets/saitama.png',
    'https://raw.githubusercontent.com/TheMostafax/My_Anime_App/master/assets/saitama.png'
];

async function test() {
    for (const url of urls) {
        try {
            const res = await fetch(url, { method: 'HEAD' });
            console.log(`[${res.status}] ${url}`);
        } catch (e) {
            console.log(`Error: ${e.message} - ${url}`);
        }
    }
}
test();
