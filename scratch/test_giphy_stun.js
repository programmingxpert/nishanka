async function test() {
    const url = 'https://i.giphy.com/media/3o7bu3XilJ5BOiSGic/giphy.gif';
    try {
        const res = await fetch(url);
        const buf = await res.arrayBuffer();
        console.log(`Length: ${buf.byteLength} bytes - ${url}`);
    } catch(e) {
        console.log("Error:", e.message);
    }
}
test();
