async function test() {
    const urls = [
        'https://i.giphy.com/media/invalid12345/giphy.gif',
        'https://media.giphy.com/media/invalid12345/giphy.gif',
        'https://media0.giphy.com/media/invalid12345/giphy.gif',
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExengwaDk5aXRrcmZxOWl5azN2Mmt5dDR6Y2VvcGhya25pdHVvdmJqYyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/invalid12345/giphy.gif'
    ];
    for (const url of urls) {
        try {
            const res = await fetch(url);
            const buf = await res.arrayBuffer();
            console.log(`[${res.status}] Length: ${buf.byteLength} bytes - ${url}`);
        } catch (e) {
            console.log(`Error: ${e.message} - ${url}`);
        }
    }
}
test();
