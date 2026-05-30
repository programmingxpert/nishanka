const urls = [
    'https://media1.tenor.com/m/u1t0xV-mB6kAAAAd/goku-kamehameha.gif',
    'https://media1.tenor.com/m/o2K8bM0u7wUAAAAd/goku-kamehameha.gif',
    'https://media1.tenor.com/m/Z4w01p_tQ14AAAAd/goku-ssj.gif',
    'https://media1.tenor.com/m/P_jQ4j-VnFAAAAAd/goku-instant-transmission.gif',
    'https://media1.tenor.com/m/ZfJg3WbWwWAAAAAd/goku-spirit-bomb.gif'
];

async function test() {
    console.log("Testing Tenor /m/ paths...");
    for (const url of urls) {
        try {
            const res = await fetch(url, { method: 'HEAD' });
            console.log(`URL: ${url} -> Status: ${res.status} (${res.ok ? 'OK' : 'FAILED'})`);
        } catch (e) {
            console.error(`URL: ${url} -> Error: ${e.message}`);
        }
    }
}
test();
