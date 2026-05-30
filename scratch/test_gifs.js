const GIFS = {
    goku: {
        kamehameha: [
            'https://media.giphy.com/media/U3UP4fTE6Qfu8/giphy.gif',
            'https://media.giphy.com/media/yo3TC0yeHd53G/giphy.gif',
            'https://media.giphy.com/media/yo3TC0yeHd53G/giphy.gif',
            'https://media.tenor.com/u1t0xV-mB6kAAAAd/goku-kamehameha.gif',
            'https://media.tenor.com/o2K8bM0u7wUAAAAd/goku-kamehameha.gif'
        ],
        ssj: [
            'https://media.giphy.com/media/tYldYrFocclzO/giphy.gif',
            'https://media.giphy.com/media/Ul16jlGQHOCFW/giphy.gif',
            'https://media.tenor.com/vHqB-K9Nn4cAAAAd/goku-power-up.gif',
            'https://media.tenor.com/Z4w01p_tQ14AAAAd/goku-ssj.gif'
        ],
        transmission: [
            'https://media.giphy.com/media/JRlqKEIncTAVJ9hoET/giphy.gif',
            'https://media.tenor.com/P_jQ4j-VnFAAAAAd/goku-instant-transmission.gif'
        ],
        spiritbomb: [
            'https://media.giphy.com/media/zKRlddg4gcnQI/giphy.gif',
            'https://media.giphy.com/media/dlsGMYrO26cOWC7ViW/giphy.gif',
            'https://media.tenor.com/ZfJg3WbWwWAAAAAd/goku-spirit-bomb.gif'
        ]
    },
    gojo: {
        red: [
            'https://media.tenor.com/T0b7f-Gz5cIAAAAd/gojo-red.gif',
            'https://media.tenor.com/YwO5_Z5cIAAAAd/gojo-satoru-red.gif'
        ],
        infinity: [
            'https://media.tenor.com/u6wVf68P7QoAAAAd/gojo-infinity.gif',
            'https://media.tenor.com/HqB-K9Nn4cAAAAd/gojo-limitless.gif'
        ],
        blue: [
            'https://media.tenor.com/U8wVf68P7QoAAAAd/gojo-blue.gif',
            'https://media.tenor.com/6a6Q46LAAAAd/gojo-satoru-blue.gif'
        ],
        void: [
            'https://media.tenor.com/T_jQ4j-VnFAAAAAd/gojo-unlimited-void.gif',
            'https://media.tenor.com/8Qj4K74c-8QAAAAd/gojo-domain-expansion.gif'
        ]
    },
    saitama: {
        normal_punch: [
            'https://media.tenor.com/8Q8W17YAAAAd/saitama-normal-punch.gif',
            'https://media.giphy.com/media/yo3TC0yeHd53G/saitama-punch.gif'
        ],
        dodge: [
            'https://media.tenor.com/W2h0e3eE0Q8AAAAd/saitama-side-steps.gif',
            'https://media.tenor.com/fHqB48N4c-8AAAAd/saitama-dodge.gif'
        ],
        consecutive: [
            'https://media.tenor.com/kHqB48N4c-8AAAAd/saitama-consecutive-punches.gif',
            'https://media.giphy.com/media/cOz2ZfC9e9c70QO6yU/saitama-consecutive.gif'
        ],
        serious: [
            'https://media.tenor.com/lMameLIF8voLu8HxY6/saitama-serious-punch.gif',
            'https://media.tenor.com/o75ajIFH0QnQC3nCeD/saitama-serious-punch.gif'
        ]
    },
    naruto: {
        rasengan: [
            'https://media.tenor.com/U3UP4fTE6QfUAd/naruto-rasengan.gif'
        ],
        clones: [
            'https://media.tenor.com/k1uX5J0YLrj0cAd/naruto-shadow-clones.gif',
            'https://media.tenor.com/JRlqKEIncTAVJ9hoETAd/naruto-clones.gif'
        ],
        sage: [
            'https://media.tenor.com/Ul16jlGQHOCFWAd/naruto-kurama-mode.gif',
            'https://media.tenor.com/vHqB-K9Nn4cAAAAd/naruto-sage-mode.gif'
        ],
        rasenshuriken: [
            'https://media.tenor.com/xT39CVCn6zwkGeFdVmAd/naruto-rasenshuriken.gif',
            'https://media.tenor.com/ZfJg3WbWwWAAAAAd/naruto-tailed-beast-bomb.gif'
        ]
    },
    luffy: {
        pistol: [
            'https://media.tenor.com/8gP14r9kP0lM3h2u57Ad/luffy-punch.gif'
        ],
        gear2: [
            'https://media.tenor.com/JRlqKEIncTAVJ9hoETAd/luffy-gear-2.gif',
            'https://media.tenor.com/vHqB-K9Nn4cAAAAd/luffy-gear-second.gif'
        ],
        haki: [
            'https://media.tenor.com/12WnC0A4YSfS5WAd/luffy-armament-haki.gif'
        ],
        bajrang: [
            'https://media.tenor.com/luffy-gear5-punch.gif',
            'https://media.tenor.com/luffy-bajrang-gun.gif'
        ]
    }
};

async function test() {
    console.log("Starting GIF verification test...");
    let passed = 0;
    let failed = 0;

    for (const char in GIFS) {
        for (const move in GIFS[char]) {
            const urls = GIFS[char][move];
            for (let i = 0; i < urls.length; i++) {
                const url = urls[i];
                try {
                    const res = await fetch(url, { method: 'HEAD' });
                    if (res.ok) {
                        console.log(`✅ [${char} - ${move} - ${i}] PASSED: ${url}`);
                        passed++;
                    } else {
                        console.warn(`❌ [${char} - ${move} - ${i}] FAILED (Status ${res.status}): ${url}`);
                        failed++;
                    }
                } catch (err) {
                    console.error(`❌ [${char} - ${move} - ${i}] ERROR: ${url} - ${err.message}`);
                    failed++;
                }
            }
        }
    }
    console.log(`\nVerification finished: ${passed} passed, ${failed} failed.`);
}

test();
