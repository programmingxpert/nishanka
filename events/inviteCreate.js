module.exports = {
    name: 'inviteCreate',
    async execute(invite, client) {
        if (!client.invites) return;
        try {
            const guildInvites = client.invites.get(invite.guild.id);
            if (guildInvites) {
                guildInvites.set(invite.code, invite.uses);
            }
        } catch (e) {
            console.error('Error tracking inviteCreate:', e);
        }
    }
};
