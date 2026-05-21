module.exports = {
    name: 'inviteDelete',
    async execute(invite, client) {
        if (!client.invites) return;
        try {
            const guildInvites = client.invites.get(invite.guild.id);
            if (guildInvites) {
                guildInvites.delete(invite.code);
            }
        } catch (e) {
            console.error('Error tracking inviteDelete:', e);
        }
    }
};
