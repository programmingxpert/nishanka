const ReactionRole = require('../models/reactionRoleSchema');

module.exports = {
    name: 'messageReactionAdd',
    async execute(reaction, user, client) {
        // Ignore bots
        if (user.bot) return;

        // If the reaction is partial, fetch it
        if (reaction.partial) {
            try {
                await reaction.fetch();
            } catch (err) {
                console.error('[ReactionRoles] Failed to fetch partial reaction:', err);
                return;
            }
        }

        // If the message is partial, fetch it
        if (reaction.message.partial) {
            try {
                await reaction.message.fetch();
            } catch (err) {
                console.error('[ReactionRoles] Failed to fetch partial message:', err);
                return;
            }
        }

        const guild = reaction.message.guild;
        if (!guild) return;

        // Normalize the emoji representation: use ID for custom, name for unicode
        const emojiKey = reaction.emoji.id ? reaction.emoji.id : reaction.emoji.name;

        try {
            // Find mapping in our database
            const mapping = await ReactionRole.findOne({
                guildId: guild.id,
                messageId: reaction.message.id,
                emoji: emojiKey
            }).lean();

            if (!mapping) return;

            // Fetch member
            const member = await guild.members.fetch(user.id).catch(() => null);
            if (!member) return;

            // Fetch role
            const role = guild.roles.cache.get(mapping.roleId);
            if (!role) return;

            // Check if the bot can assign this role
            const botMember = guild.members.me;
            if (!botMember.permissions.has('ManageRoles') || role.position >= botMember.roles.highest.position) {
                return;
            }

            // Assign the role
            if (!member.roles.cache.has(role.id)) {
                await member.roles.add(role);
                
                // Log the event
                const { logServerEvent } = require('../utils/serverLogger');
                await logServerEvent(
                    guild.id,
                    'ROLE_ADD',
                    `Assigned role @${role.name} to ${user.username} via reaction role`,
                    botMember.user,
                    user,
                    { roleId: role.id, roleName: role.name, messageId: reaction.message.id }
                );
            }
        } catch (err) {
            console.error('[ReactionRoles] Error handling messageReactionAdd:', err);
        }
    }
};
