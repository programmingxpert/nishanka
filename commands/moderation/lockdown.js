const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');

module.exports = {
    category: 'moderation',
    data: new SlashCommandBuilder()
        .setName('lockdown')
        .setDescription('Manage server-wide channel lockdowns')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addStringOption(option =>
            option.setName('action')
                .setDescription('Lock, unlock, or check status')
                .setRequired(true)
                .addChoices(
                    { name: '🔒 Lock Server', value: 'lock' },
                    { name: '🔓 Unlock Server', value: 'unlock' },
                    { name: 'ℹ️ Check Status', value: 'status' }
                ))
        .addStringOption(option =>
            option.setName('scope')
                .setDescription('Which channels to affect')
                .setRequired(false)
                .addChoices(
                    { name: 'Public Channels (Recommended)', value: 'public' },
                    { name: 'All Channels', value: 'all' }
                ))
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('The member role to lock out (defaults to Citizen or @everyone)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the lockdown')
                .setRequired(false)),

    async execute(interaction) {
        const action = interaction.options.getString('action');
        const scope = interaction.options.getString('scope') || 'public';
        const role = interaction.options.getRole('role');
        const reason = interaction.options.getString('reason') || 'No reason provided.';

        await interaction.deferReply();
        await handleLockdown(interaction, action, scope, role, reason);
    },

    async executePrefix(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return message.reply('❌ You do not have permission to run server lockdowns (requires Manage Server).');
        }

        const action = args[0]?.toLowerCase();
        if (!['lock', 'unlock', 'status'].includes(action)) {
            return message.reply('❌ Invalid syntax. Use `-lockdown <lock/unlock/status> [public/all] [@Role/RoleID] [reason]`');
        }

        let scope = 'public';
        let targetRole = null;
        let reasonWords = [];

        // Parse remaining arguments
        const remainingArgs = args.slice(1);
        for (const arg of remainingArgs) {
            if (arg.toLowerCase() === 'all' || arg.toLowerCase() === 'public') {
                scope = arg.toLowerCase();
                continue;
            }

            // Check if it's a role mention
            const roleMatch = arg.match(/^<@&(\d+)>$/);
            if (roleMatch) {
                const r = message.guild.roles.cache.get(roleMatch[1]);
                if (r) {
                    targetRole = r;
                    continue;
                }
            } else if (/^\d{17,19}$/.test(arg)) {
                const r = message.guild.roles.cache.get(arg);
                if (r) {
                    targetRole = r;
                    continue;
                }
            }

            reasonWords.push(arg);
        }

        const reason = reasonWords.join(' ') || 'No reason provided.';
        await handleLockdown(message, action, scope, targetRole, reason);
    }
};

async function handleLockdown(interactionOrMessage, action, scope, role, reason) {
    const isSlash = !!interactionOrMessage.reply && !interactionOrMessage.author;
    const guild = interactionOrMessage.guild;
    const operator = isSlash ? interactionOrMessage.user : interactionOrMessage.author;

    // Resolve target role if not provided
    let targetRole = role;
    if (!targetRole) {
        const citizenRole = guild.roles.cache.find(r => r.name.toLowerCase() === 'citizen' || r.name.toLowerCase() === 'citizens');
        targetRole = citizenRole || guild.roles.everyone;
    }

    if (action === 'status') {
        // Count currently locked channels in the scope
        const textChannels = guild.channels.cache.filter(c => 
            c.type === ChannelType.GuildText || 
            c.type === ChannelType.GuildAnnouncement || 
            c.type === ChannelType.GuildForum
        );

        let total = 0;
        let locked = 0;

        for (const [_, channel] of textChannels) {
            // Check if it falls into scope
            if (scope === 'public') {
                const perms = channel.permissionsFor(guild.roles.everyone);
                const canView = perms ? perms.has(PermissionFlagsBits.ViewChannel) : true;
                if (!canView) continue;
            }

            total++;
            // Check if SendMessages is explicitly denied for targetRole
            const overwrite = channel.permissionOverwrites.cache.get(targetRole.id);
            if (overwrite && overwrite.deny.has(PermissionFlagsBits.SendMessages)) {
                locked++;
            }
        }

        const embed = new EmbedBuilder()
            .setTitle('ℹ️ Server Lockdown Status')
            .setDescription(`Checking status for role **${targetRole.name}** in **${scope}** channels.`)
            .setColor(0x7c6cf0)
            .addFields(
                { name: '📊 Channels Locked', value: `**${locked} / ${total}** channels locked.`, inline: true },
                { name: '🛡️ Target Role', value: `${targetRole}`, inline: true }
            )
            .setTimestamp();

        return isSlash
            ? interactionOrMessage.editReply({ embeds: [embed] })
            : interactionOrMessage.reply({ embeds: [embed] });
    }

    // Perform Lock / Unlock
    const channelsToModify = [];
    const textChannels = guild.channels.cache.filter(c => 
        c.type === ChannelType.GuildText || 
        c.type === ChannelType.GuildAnnouncement || 
        c.type === ChannelType.GuildForum
    );

    for (const [_, channel] of textChannels) {
        if (scope === 'public') {
            const perms = channel.permissionsFor(guild.roles.everyone);
            const canView = perms ? perms.has(PermissionFlagsBits.ViewChannel) : true;
            if (!canView) continue;
        }
        channelsToModify.push(channel);
    }

    if (channelsToModify.length === 0) {
        return isSlash
            ? interactionOrMessage.editReply(`❌ No channels found within the **${scope}** scope.`)
            : interactionOrMessage.reply(`❌ No channels found within the **${scope}** scope.`);
    }

    const initialEmbed = new EmbedBuilder()
        .setTitle(action === 'lock' ? '🔒 Server Lockdown Initiated' : '🔓 Server Unlock Initiated')
        .setDescription(`Modifying permissions for **${channelsToModify.length}** channels...`)
        .setColor(action === 'lock' ? 0xff3c38 : 0x00cc66)
        .setTimestamp();

    const statusMsg = isSlash
        ? await interactionOrMessage.editReply({ embeds: [initialEmbed] })
        : await interactionOrMessage.reply({ embeds: [initialEmbed] });

    let succeeded = 0;
    let failed = 0;

    for (const channel of channelsToModify) {
        try {
            if (action === 'lock') {
                await channel.permissionOverwrites.edit(targetRole, {
                    SendMessages: false,
                    AddReactions: false,
                    CreatePublicThreads: false,
                    CreatePrivateThreads: false
                }, { reason: `Server Lockdown by ${operator.tag}: ${reason}` });
            } else {
                await channel.permissionOverwrites.edit(targetRole, {
                    SendMessages: null,
                    AddReactions: null,
                    CreatePublicThreads: null,
                    CreatePrivateThreads: null
                }, { reason: `Server Unlock by ${operator.tag}: ${reason}` });
            }
            succeeded++;
        } catch (err) {
            console.error(`Failed to modify permissions for #${channel.name}:`, err);
            failed++;
        }
    }

    // Log event to server logger
    try {
        const { logServerEvent } = require('../../utils/serverLogger');
        await logServerEvent(guild.id, action.toUpperCase(), `Server-wide ${action} for role ${targetRole.name}. Channels modified: ${succeeded} succeeded, ${failed} failed. Reason: ${reason}`, operator);
    } catch (e) {
        console.error('[lockdown] Logging failed:', e);
    }

    const finalEmbed = new EmbedBuilder()
        .setTitle(action === 'lock' ? '🔒 Lockdown Complete' : '🔓 Unlock Complete')
        .setDescription(`Successfully updated permissions for channels.`)
        .setColor(action === 'lock' ? 0xff3c38 : 0x00cc66)
        .addFields(
            { name: '🟢 Success', value: `**${succeeded}** channels`, inline: true },
            { name: '🔴 Failed', value: `**${failed}** channels`, inline: true },
            { name: '🛡️ Role Affected', value: `${targetRole.name}`, inline: true },
            { name: 'Reason', value: reason, inline: false }
        )
        .setTimestamp();

    if (isSlash) {
        await interactionOrMessage.editReply({ embeds: [finalEmbed] });
    } else {
        await statusMsg.edit({ embeds: [finalEmbed] });
    }
}
