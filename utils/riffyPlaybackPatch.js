function installRiffyPlaybackPatch(Player) {
    if (Player.prototype.__nishankaPlaybackPatched) return;

    Object.defineProperty(Player.prototype, '__nishankaPlaybackPatched', {
        value: true,
    });

    Player.prototype.play = async function play() {
        await this.connection.resolve();

        // Some Lavalink nodes only send playerUpdate.connected after receiving
        // the first track. Waiting for that event here creates a deadlock.
        // `playerUpdate.connected` may remain false until the first track is
        // submitted. Discord voice credentials are the reliable precondition.
        if (!this.connection?.isReady) {
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

        const previousState = {
            current: this.current,
            playing: this.playing,
            paused: this.paused,
            position: this.position,
        };

        // Lavalink can emit TrackStart before the PATCH response reaches Riffy.
        // Publish the selected track first so that event handlers never see null.
        this.current = track;
        this.playing = true;
        this.paused = false;
        this.position = 0;

        try {
            await this.node.rest.updatePlayer({
                guildId: this.guildId,
                data: { track: { encoded: track.track } },
            });
        } catch (error) {
            this.queue.unshift(track);
            this.current = previousState.current;
            this.playing = previousState.playing;
            this.paused = previousState.paused;
            this.position = previousState.position;
            throw error;
        }
        return this;
    };
}

module.exports = { installRiffyPlaybackPatch };
