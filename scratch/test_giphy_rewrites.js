async function test() {
    const ids = [
        'EbRIxoUny8GJKkRZ8S',
        'jIgyPWFtAiwr3YLhgS',
        'dmFXUZ5up1T896HP8B',
        'UgV8Y7bDxsZDCP01eo',
        'WldPA6tzPPSgZDxiJc',
        '9Xx1OMQIiA9feabm70'
    ];

    for (const id of ids) {
        const formats = [
            `https://i.giphy.com/media/${id}/giphy.gif`,
            `https://media.giphy.com/media/${id}/giphy.gif`,
            `https://media0.giphy.com/media/${id}/giphy.gif`,
            `https://i.giphy.com/media/${id}/200.gif`
        ];

        console.log(`\nTesting ID: ${id}`);
        for (const url of formats) {
            try {
                const res = await fetch(url, { method: 'GET' });
                const buf = await res.arrayBuffer();
                const size = buf.byteLength;
                
                // Let's check if it's the "image does not exist" placeholder.
                // Giphy's "image does not exist" placeholder has a specific length or we can check header/response.
                // Usually it redirects or has a small size, or we can check content-type/redirected/etc.
                // Let's see if the request was redirected or if we can inspect the content.
                console.log(`  [${res.status}] Length: ${size} bytes - ${url}`);
            } catch (err) {
                console.log(`  Error: ${err.message} - ${url}`);
            }
        }
    }
}
test();
