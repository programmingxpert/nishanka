function createMusicConnection(riffy, options) {
    const primaryNode = riffy.nodeMap.get('node-1');

    if (primaryNode?.connected) {
        const existingPlayer = riffy.players.get(options.guildId);
        return existingPlayer || riffy.createPlayer(primaryNode, options);
    }

    return riffy.createConnection(options);
}

module.exports = { createMusicConnection };

