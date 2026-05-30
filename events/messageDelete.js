/* eslint-disable */
module.exports = {
    name: 'messageDelete',

    async execute(message, client) {
        // Ignore bots and direct messages
        if (!message.guild || message.author?.bot) return;

        // Skip partial messages where data isn't loaded (can't snipe uncached messages)
        if (message.partial) return;

        // Initialize client snipes Map if not present
        if (!client.snipes) {
            client.snipes = new Map();
        }

        // Store the deleted message info keyed by channel ID
        client.snipes.set(message.channel.id, {
            content: message.content || '',
            author: message.author,
            timestamp: message.createdAt || new Date(),
            attachment: message.attachments.first()?.url || null
        });
    }
};
