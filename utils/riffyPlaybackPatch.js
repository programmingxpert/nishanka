function waitForPlayerConnection(player, timeoutMs) {
    if (player.connected) return Promise.resolve();

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

        if (!this.connected && this.connection.establishing) {
            await waitForPlayerConnection(this, this.connectionTimeout);
        }

        if (!this.connected) {
            throw new Error('The Lavalink voice connection is not ready.');
        }
        if (!this.queue.length) {
            throw new Error(`Unable to play for guild ${this.guildId}: the queue is empty.`);
        }

        const nextTrack = this.queue.shift();
        let resolvedTrack = nextTrack;

        if (!resolvedTrack.track) {
            resolvedTrack = await resolvedTrack.resolve(this.riffy);
        }
        if (!resolvedTrack?.track) {
            this.queue.unshift(nextTrack);
            throw new Error('Lavalink could not resolve the queued track.');
        }

        this.current = resolvedTrack;
        this.playing = true;
        this.paused = false;
        this.position = 0;

        try {
            await this.node.rest.updatePlayer({
                guildId: this.guildId,
                data: { track: { encoded: resolvedTrack.track } },
            });
        } catch (error) {
            this.current = null;
            this.playing = false;
            this.queue.unshift(resolvedTrack);
            throw error;
        }

        return this;
    };
}

module.exports = { installRiffyPlaybackPatch };
