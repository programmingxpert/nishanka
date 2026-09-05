function waitForPlayerConnection(player, timeoutMs) {
    if (player.connected && player.connection?.isReady && !player.connection.establishing) {
        return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            cleanup();
            reject(new Error(`Voice connection did not become ready within ${timeoutMs}ms`));
        }, timeoutMs);

        const onConnected = () => {
            cleanup();
            resolve();
        };

        const cleanup = () => {
            clearTimeout(timeout);
            player.off('connectionRestored', onConnected);
        };

        player.once('connectionRestored', onConnected);
    });
}

function installRiffyPlaybackPatch(Player) {
    if (Player.prototype.__nishankaPlaybackPatched) return;

    Object.defineProperty(Player.prototype, '__nishankaPlaybackPatched', {
        value: true,
    });

    Player.prototype.play = async function play() {
        await this.connection.resolve();

        if (this.connection?.establishing || !this.connection?.isReady) {
            await waitForPlayerConnection(this, this.connectionTimeout);
        }

        if (!this.connected || !this.connection?.isReady || this.connection.establishing) {
            throw new Error('The Lavalink voice connection is not ready.');
        }
        if (!this.queue.length) {
            throw new Error(`Unable to play for guild ${this.guildId}: the queue is empty.`);
        }

        const queuedTrack = this.queue.shift();
        let track = queuedTrack;

        if (!track.track) track = await track.resolve(this.riffy);
        if (!track?.track) {
            this.queue.unshift(queuedTrack);
            throw new Error('Lavalink could not resolve the queued track.');
        }

        try {
            await this.node.rest.updatePlayer({
                guildId: this.guildId,
                data: { track: { encoded: track.track } },
            });
        } catch (error) {
            this.queue.unshift(track);
            throw error;
        }

        this.current = track;
        this.playing = true;
        this.paused = false;
        this.position = 0;
        return this;
    };
}

module.exports = { installRiffyPlaybackPatch };
