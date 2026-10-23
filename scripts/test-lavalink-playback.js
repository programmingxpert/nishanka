const path = require('path');
const WebSocket = require('ws');

require('dotenv').config({
    path: path.join(__dirname, '..', '.env'),
    override: true,
});

const suffix = process.argv[2] || '';
if (suffix && !/^_[23]$/.test(suffix)) {
    throw new Error('Node suffix must be empty, _2, or _3');
}

const host = process.env[`LAVALINK_HOST${suffix}`];
const port = process.env[`LAVALINK_PORT${suffix}`] || '2333';
const secure = process.env[`LAVALINK_SECURE${suffix}`] !== 'false';
const password = process.env[`LAVALINK_PASSWORD${suffix}`];
const baseUrl = `${secure ? 'https' : 'http'}://${host}:${port}`;
const wsUrl = `${secure ? 'wss' : 'ws'}://${host}:${port}/v4/websocket`;
const testGuildId = '999999999999999999';
const timeoutMs = 12_000;

async function request(pathname, options = {}) {
    const response = await fetch(`${baseUrl}${pathname}`, {
        ...options,
        headers: {
            Authorization: password,
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    if (!response.ok) {
        throw new Error(`Lavalink request failed with HTTP ${response.status}`);
    }

    return response.status === 204 ? null : response.json();
}

async function run() {
    const socket = new WebSocket(wsUrl, {
        headers: {
            Authorization: password,
            'User-Id': '1357752347643609198',
            'Client-Name': 'Nishanka/PlaybackProbe',
        },
    });

    let sessionId;
    let started = false;
    let settled = false;

    const cleanup = async () => {
        if (sessionId) {
            await request(`/v4/sessions/${sessionId}/players/${testGuildId}`, {
                method: 'DELETE',
            }).catch(() => {});
        }
        socket.close();
    };

    const finish = async (error) => {
        if (settled) return;
        settled = true;
        await cleanup();
        if (error) throw error;
    };

    await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error('Timed out waiting for Lavalink playback validation'));
        }, timeoutMs);

        socket.on('error', reject);
        socket.on('message', async (raw) => {
            try {
                const payload = JSON.parse(raw.toString());
                if (payload.op === 'ready') {
                    sessionId = payload.sessionId;
                    const result = await request('/v4/loadtracks?identifier=ytmsearch%3Acloser%20chainsmokers');
                    const track = result.data?.[0];
                    if (!track?.encoded) throw new Error('Playback probe could not resolve a YouTube track');

                    await request(`/v4/sessions/${sessionId}/players/${testGuildId}`, {
                        method: 'PATCH',
                        body: JSON.stringify({ track: { encoded: track.encoded } }),
                    });
                    return;
                }

                if (payload.op !== 'event' || payload.guildId !== testGuildId) return;
                if (payload.type === 'TrackExceptionEvent') {
                    throw new Error(payload.exception?.message || 'Lavalink playback probe failed');
                }
                if (payload.type === 'TrackEndEvent' && payload.reason === 'loadFailed') {
                    throw new Error('Lavalink playback probe ended with loadFailed');
                }
                if (payload.type === 'TrackStartEvent') {
                    started = true;
                    setTimeout(() => {
                        clearTimeout(timeout);
                        resolve();
                    }, 5_000);
                }
            } catch (error) {
                clearTimeout(timeout);
                reject(error);
            }
        });
    });

    if (!started) throw new Error('Lavalink never started the playback probe');
    await finish();
    console.log(`Lavalink YouTube playback probe passed for ${host}`);
}

run().catch((error) => {
    console.error(error.message);
    process.exit(1);
});

