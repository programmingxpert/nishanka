const MemberStats = require('../models/MemberStats');

module.exports = {
    name: 'guildMemberAdd',
    async execute(member, client) {
        if (!client.invites) return;
        try {
            const newInvites = await member.guild.invites.fetch();
            const oldInvites = client.invites.get(member.guild.id);
            if (!oldInvites) return;

            const invite = newInvites.find(i => i.uses > (oldInvites.get(i.code) || 0));
            
            if (invite && invite.inviterId) {
                // Increment inviter's inviteCount
                await MemberStats.findOneAndUpdate(
                    { guildId: member.guild.id, userId: invite.inviterId },
                    { $inc: { invitesCount: 1 } },
                    { upsert: true }
                );
            }

            // Update cache
            client.invites.set(member.guild.id, new Map(newInvites.map((i) => [i.code, i.uses])));
        } catch (e) {
            console.error('Error tracking guildMemberAdd invite:', e);
        }
    }
};
