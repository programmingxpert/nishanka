function createMusicConnection(riffy, options, preferredNodeName = process.env.LAVALINK_MUSIC_NODE || 'node-1') {
    const primaryNode = riffy.nodeMap.get(preferredNodeName);

    if (primaryNode?.connected) {
        const existingPlayer = riffy.players.get(options.guildId);
        return existingPlayer || riffy.createPlayer(primaryNode, options);
    }

    return riffy.createConnection(options);
}

module.exports = { createMusicConnection };

