async function test() {
    const url = 'https://i.imgur.com/Kz8Jp58.png';
    try {
        const res = await fetch(url);
        const text = await res.text();
        console.log("Response text start:");
        console.log(text.substring(0, 1000));
    } catch (e) {
        console.error("Error:", e);
    }
}
test();
