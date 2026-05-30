async function test() {
    const urls = [
        'https://i.imgur.com/removed.png',
        'https://imgur.com/images/removed.png'
    ];
    for (const url of urls) {
        try {
            const res = await fetch(url);
            const buf = await res.arrayBuffer();
            console.log(`Length: ${buf.byteLength} - ${url}`);
        } catch (e) {
            console.log("Error:", e);
        }
    }
}
test();
