const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, ChannelType, PermissionFlagsBits } = require('discord.js');
const ReactionRole = require('../../models/reactionRoleSchema');
const { checkCommandPermission } = require('../../utils/permissions');
const { logServerEvent } = require('../../utils/serverLogger');

module.exports = {
    category: 'admin',
    cooldown: 10,
    data: new SlashCommandBuilder()
        .setName('reactionroles')
        .setDescription('Manage interactive reaction roles on the server.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(sub =>
            sub.setName('setup')
                .setDescription('Start the interactive step-by-step setup wizard.')
        )
        .addSubcommand(sub =>
            sub.setName('add')
                .setDescription('Manually add a reaction role to an existing message.')
                .addChannelOption(opt => opt.setName('channel').setDescription('The channel containing the message').addChannelTypes(ChannelType.GuildText).setRequired(true))
                .addStringOption(opt => opt.setName('message_id').setDescription('The Discord message ID').setRequired(true))
                .addStringOption(opt => opt.setName('emoji').setDescription('The emoji to use (Unicode or Custom)').setRequired(true))
                .addRoleOption(opt => opt.setName('role').setDescription('The role to assign').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('remove')
                .setDescription('Remove a reaction role from a message.')
                .addStringOption(opt => opt.setName('message_id').setDescription('The message ID').setRequired(true))
                .addStringOption(opt => opt.setName('emoji').setDescription('The emoji mapping to remove').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('list')
                .setDescription('List all reaction roles configured in this server.')
        ),

    async execute(interaction) {
        if (!await checkCommandPermission(interaction, 'bot')) {
            return interaction.reply({ content: '❌ You do not have permission to run this command.', ephemeral: true });
        }

        const sub = interaction.options.getSubcommand();
        const guild = interaction.guild;

        if (sub === 'setup') {
            return runInteractiveSetup(interaction, interaction.user, true);
        }

        if (sub === 'add') {
            await interaction.deferReply();
            const channel = interaction.options.getChannel('channel');
            const messageId = interaction.options.getString('message_id');
            const emojiStr = interaction.options.getString('emoji');
            const role = interaction.options.getRole('role');

            const result = await addReactionRole({ guild, channel, messageId, emojiStr, role, executor: interaction.user });
            return interaction.editReply(result);
        }

        if (sub === 'remove') {
            await interaction.deferReply();
            const messageId = interaction.options.getString('message_id');
            const emojiStr = interaction.options.getString('emoji');

            const result = await removeReactionRole({ guild, messageId, emojiStr, executor: interaction.user });
            return interaction.editReply(result);
        }

        if (sub === 'list') {
            await interaction.deferReply();
            const embed = await listReactionRoles(guild);
            return interaction.editReply({ embeds: [embed] });
        }
    },

    async executePrefix(message, args) {
        if (!await checkCommandPermission(message, 'bot')) {
            return message.reply('❌ You do not have permission to run this command.');
        }

        const sub = args[0]?.toLowerCase();
        const guild = message.guild;

        if (!sub || sub === 'setup') {
            return runInteractiveSetup(message, message.author, false);
        }

        if (sub === 'add') {
            const channelMention = args[1];
            const messageId = args[2];
            const emojiStr = args[3];
            const roleMentionOrId = args[4];

            if (!channelMention || !messageId || !emojiStr || !roleMentionOrId) {
                return message.reply('❌ Usage: `-reactionroles add <#channel> <message_id> <emoji> <@role>`');
            }

            const channelId = channelMention.replace(/[<#&>]/g, '');
            const channel = guild.channels.cache.get(channelId);
            if (!channel || channel.type !== ChannelType.GuildText) {
                return message.reply('❌ Please mention a valid text channel.');
            }

            const roleId = roleMentionOrId.replace(/[<@&>]/g, '');
            const role = guild.roles.cache.get(roleId);
            if (!role) {
                return message.reply('❌ Please mention a valid role.');
            }

            const result = await addReactionRole({ guild, channel, messageId, emojiStr, role, executor: message.author });
            return message.reply(result);
        }

        if (sub === 'remove') {
            const messageId = args[1];
            const emojiStr = args[2];

            if (!messageId || !emojiStr) {
                return message.reply('❌ Usage: `-reactionroles remove <message_id> <emoji>`');
            }

            const result = await removeReactionRole({ guild, messageId, emojiStr, executor: message.author });
            return message.reply(result);
        }

        if (sub === 'list') {
            const embed = await listReactionRoles(guild);
            return message.reply({ embeds: [embed] });
        }

        return message.reply('❌ Unknown subcommand. Use: `setup`, `add`, `remove`, or `list`.');
    }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseEmoji(emojiStr) {
    // Custom emoji regex: <:name:id> or <a:name:id>
    const match = emojiStr.match(/<?a?:?\w+:(\d+)>?/);
    if (match) {
        return match[1]; // Return custom emoji ID
    }
    return emojiStr.trim(); // Return unicode emoji
}

async function addReactionRole({ guild, channel, messageId, emojiStr, role, executor }) {
    try {
        const msg = await channel.messages.fetch(messageId).catch(() => null);
        if (!msg) {
            return { content: `❌ Could not find message with ID **${messageId}** in channel ${channel}.` };
        }

        // Validate bot permissions for roles
        const botMember = guild.members.me;
        if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return { content: '❌ I do not have permission to manage roles in this server!' };
        }
        if (role.position >= botMember.roles.highest.position) {
            return { content: `❌ The role **${role.name}** is higher than my highest role! Please drag my role above it in the server settings.` };
        }

        const emojiKey = parseEmoji(emojiStr);

        // Save mapping
        await ReactionRole.findOneAndUpdate(
            { guildId: guild.id, messageId, emoji: emojiKey },
            { channelId: channel.id, roleId: role.id },
            { upsert: true, new: true }
        );

        // React to the message
        await msg.react(emojiStr).catch(() => {});

        // Log setting update
        await logServerEvent(
            guild.id,
            'REACTION_ROLE_CREATE',
            `Reaction role created on message ${messageId} for @${role.name} with emoji ${emojiStr}`,
            executor,
            role,
            { channelId: channel.id, messageId, emoji: emojiStr, roleId: role.id }
        );

        return { content: `✅ Reaction role added successfully! Users reacting with ${emojiStr} on that message will receive the **${role.name}** role.` };
    } catch (err) {
        console.error(err);
        return { content: '❌ An error occurred while adding the reaction role.' };
    }
}

async function removeReactionRole({ guild, messageId, emojiStr, executor }) {
    try {
        const emojiKey = parseEmoji(emojiStr);

        const mapping = await ReactionRole.findOneAndDelete({
            guildId: guild.id,
            messageId,
            emoji: emojiKey
        });

        if (!mapping) {
            return { content: `❌ No reaction role mapping exists for message ID **${messageId}** with emoji **${emojiStr}**.` };
        }

        // Try to remove bot's reaction from message
        try {
            const channel = guild.channels.cache.get(mapping.channelId);
            if (channel) {
                const msg = await channel.messages.fetch(messageId);
                const reaction = msg.reactions.cache.get(emojiKey);
                if (reaction) {
                    await reaction.users.remove(guild.members.me.id);
                }
            }
        } catch (e) {}

        const role = guild.roles.cache.get(mapping.roleId);

        // Log setting update
        await logServerEvent(
            guild.id,
            'REACTION_ROLE_DELETE',
            `Reaction role mapping removed on message ${messageId} for emoji ${emojiStr}`,
            executor,
            role,
            { messageId, emoji: emojiStr, roleId: mapping.roleId }
        );

        return { content: `✅ Reaction role mapping removed successfully.` };
    } catch (err) {
        console.error(err);
        return { content: '❌ An error occurred while removing the reaction role.' };
    }
}

async function listReactionRoles(guild) {
    const list = await ReactionRole.find({ guildId: guild.id }).lean();

    const embed = new EmbedBuilder()
        .setColor(0x7c6cf0)
        .setTitle('🎭 Configured Reaction Roles')
        .setDescription(`Here are all reaction role panels configured in **${guild.name}**:`)
        .setTimestamp();

    if (list.length === 0) {
        embed.setDescription('No reaction roles have been configured yet. Use `/reactionroles setup` to get started!');
        return embed;
    }

    const grouped = {};
    for (const item of list) {
        if (!grouped[item.messageId]) {
            grouped[item.messageId] = [];
        }
        grouped[item.messageId].push(item);
    }

    for (const [msgId, items] of Object.entries(grouped)) {
        const first = items[0];
        const lines = items.map(item => {
            const role = guild.roles.cache.get(item.roleId);
            const emojiDisplay = isNaN(item.emoji) ? item.emoji : `<:emoji:${item.emoji}>`;
            return `${emojiDisplay} ➜ ${role ? `<@&${role.id}>` : `Unknown Role (${item.roleId})`}`;
        });

        embed.addFields({
            name: `📟 Message: ${msgId} (in <#${first.channelId}>)`,
            value: lines.join('\n'),
            inline: false
        });
    }

    return embed;
}

// ─── Interactive Wizard ───────────────────────────────────────────────────────

async function runInteractiveSetup(context, author, isSlash) {
    const channel = context.channel;
    const guild = context.guild;

    // Send initial prompt
    const initialEmbed = new EmbedBuilder()
        .setColor(0x7c6cf0)
        .setTitle('⚙️ Reaction Roles Setup Wizard')
        .setDescription('Let\'s set up reaction roles for this server! ⚡\n\n**Step 1:** Please mention the text channel where you want the reaction role panel to be (or send its ID).\n\n*Type `cancel` to exit at any time.*')
        .setFooter({ text: 'Setup will timeout after 60 seconds of inactivity.' });

    let initialMsg;
    if (isSlash) {
        initialMsg = await context.reply({ embeds: [initialEmbed], fetchReply: true });
    } else {
        initialMsg = await context.reply({ embeds: [initialEmbed] });
    }

    const filter = m => m.author.id === author.id;
    const collector = channel.createMessageCollector({ filter, time: 60_000 });

    let step = 1;
    let targetChannel = null;
    let isNewMsg = true;
    let existingMsgId = null;
    let panelTitle = 'Select Roles';
    let panelDesc = 'React with the emojis below to claim your roles!';
    const reactionRoles = [];

    collector.on('collect', async m => {
        // Reset timer
        collector.resetTimer();

        const input = m.content.trim();

        if (input.toLowerCase() === 'cancel') {
            collector.stop('cancelled');
            m.reply('🚫 Reaction roles setup cancelled.').catch(() => {});
            return;
        }

        if (step === 1) {
            // Channel selection
            const channelId = input.replace(/[<#&>]/g, '');
            const selectedChannel = guild.channels.cache.get(channelId);
            if (!selectedChannel || selectedChannel.type !== ChannelType.GuildText) {
                return m.reply('❌ Invalid channel! Please mention a valid text channel or send a channel ID.').catch(() => {});
            }

            targetChannel = selectedChannel;
            step = 2;

            const step2Embed = new EmbedBuilder()
                .setColor(0x7c6cf0)
                .setTitle('⚙️ Reaction Roles Setup Wizard')
                .setDescription(`Selected Channel: ${targetChannel}\n\n**Step 2:** Would you like to create a **New Panel Message** or use an **Existing Message**?\n\nType \`new\` to create a new beautiful embed panel.\nType \`existing\` to link to a message already in that channel.`);
            await initialMsg.edit({ embeds: [step2Embed] }).catch(() => {});
            return;
        }

        if (step === 2) {
            // New or existing selection
            const lowerInput = input.toLowerCase();
            if (lowerInput === 'new') {
                isNewMsg = true;
                step = 3; // Go to panel details
                const step3Embed = new EmbedBuilder()
                    .setColor(0x7c6cf0)
                    .setTitle('⚙️ Reaction Roles Setup Wizard')
                    .setDescription(`Channel: ${targetChannel}\nPanel Type: **New Message**\n\n**Step 3:** Enter the **Title** of the embed panel. (e.g. \`Roles Selection\` or \`Color Roles\`).`);
                await initialMsg.edit({ embeds: [step3Embed] }).catch(() => {});
                return;
            } else if (lowerInput === 'existing') {
                isNewMsg = false;
                step = 5; // Go to message ID input
                const step5Embed = new EmbedBuilder()
                    .setColor(0x7c6cf0)
                    .setTitle('⚙️ Reaction Roles Setup Wizard')
                    .setDescription(`Channel: ${targetChannel}\nPanel Type: **Existing Message**\n\n**Step 3:** Enter the **Message ID** of the message already sent in ${targetChannel}.`);
                await initialMsg.edit({ embeds: [step5Embed] }).catch(() => {});
                return;
            } else {
                return m.reply('❌ Please type `new` or `existing`.').catch(() => {});
            }
        }

        if (step === 3) {
            // Title input
            panelTitle = input;
            step = 4;
            const step4Embed = new EmbedBuilder()
                .setColor(0x7c6cf0)
                .setTitle('⚙️ Reaction Roles Setup Wizard')
                .setDescription(`Channel: ${targetChannel}\nTitle: **${panelTitle}**\n\n**Step 4:** Enter the **Description** of the embed panel. (e.g. \`React to get updates or colors!\`).`);
            await initialMsg.edit({ embeds: [step4Embed] }).catch(() => {});
            return;
        }

        if (step === 4) {
            // Description input
            panelDesc = input;
            step = 6; // Go to mapping configuration
            const step6Embed = new EmbedBuilder()
                .setColor(0x7c6cf0)
                .setTitle('⚙️ Reaction Roles Setup Wizard')
                .setDescription(`Channel: ${targetChannel}\nTitle: **${panelTitle}**\nDescription: *${panelDesc}*\n\n**Step 5:** Send your emoji-to-role mappings in the format: \`<emoji> <@role>\` (e.g. \`⭐ @Subscribers\` or \`🔴 123456789012345678\`).\n\nSend mappings one by one. Send **done** when you are finished.`);
            await initialMsg.edit({ embeds: [step6Embed] }).catch(() => {});
            return;
        }

        if (step === 5) {
            // Message ID input for existing
            const msg = await targetChannel.messages.fetch(input).catch(() => null);
            if (!msg) {
                return m.reply(`❌ Message ID **${input}** was not found in ${targetChannel}. Make sure you paste the correct ID.`).catch(() => {});
            }
            existingMsgId = input;
            step = 6;
            const step6Embed = new EmbedBuilder()
                .setColor(0x7c6cf0)
                .setTitle('⚙️ Reaction Roles Setup Wizard')
                .setDescription(`Channel: ${targetChannel}\nMessage ID: **${existingMsgId}**\n\n**Step 4:** Send your emoji-to-role mappings in the format: \`<emoji> <@role>\` (e.g. \`⭐ @Subscribers\`).\n\nSend mappings one by one. Send **done** when you are finished.`);
            await initialMsg.edit({ embeds: [step6Embed] }).catch(() => {});
            return;
        }

        if (step === 6) {
            // Mapping collector
            if (input.toLowerCase() === 'done') {
                if (reactionRoles.length === 0) {
                    return m.reply('❌ You must add at least one mapping! Send an emoji and role.').catch(() => {});
                }
                collector.stop('completed');
                return;
            }

            const parts = input.split(/\s+/);
            if (parts.length < 2) {
                return m.reply('❌ Invalid format! Please send mapping as: `<emoji> <@role>` (e.g. `⭐ @VIPRole`)').catch(() => {});
            }

            const emojiStr = parts[0];
            const roleMentionOrId = parts[1];

            const emojiKey = parseEmoji(emojiStr);
            const roleId = roleMentionOrId.replace(/[<@&>]/g, '');
            const role = guild.roles.cache.get(roleId);

            if (!role) {
                return m.reply('❌ Invalid role! Please ping the role or send a valid role ID.').catch(() => {});
            }

            // Verify bot permission for this role
            const botMember = guild.members.me;
            if (role.position >= botMember.roles.highest.position) {
                return m.reply(`❌ The role **${role.name}** is higher than my highest role. I won't be able to assign it! Please drag my role higher.`).catch(() => {});
            }

            reactionRoles.push({ emojiStr, emojiKey, roleId, roleName: role.name });
            m.reply(`✅ Added: ${emojiStr} ➜ **${role.name}**. (Total configured: ${reactionRoles.length}).\nSend more mappings or type **done** to finish.`).catch(() => {});
            return;
        }
    });

    collector.on('end', async (collected, reason) => {
        if (reason === 'time') {
            initialEmbed.setDescription('❌ Wizard timed out due to inactivity. Configuration cancelled.').setColor(0xef4444);
            await initialMsg.edit({ embeds: [initialEmbed] }).catch(() => {});
        }

        if (reason === 'completed') {
            initialEmbed.setDescription('⏳ Creating panel message and saving configuration...').setColor(0x7c6cf0);
            await initialMsg.edit({ embeds: [initialEmbed] }).catch(() => {});

            try {
                let msg;
                if (isNewMsg) {
                    // Send new message
                    const panelEmbed = new EmbedBuilder()
                        .setColor(0x7c6cf0)
                        .setTitle(`🎭 ${panelTitle}`)
                        .setDescription(panelDesc)
                        .setTimestamp();

                    const fieldsText = reactionRoles.map(r => `${r.emojiStr} ➜ <@&${r.roleId}>`).join('\n');
                    panelEmbed.addFields({ name: 'Roles List', value: fieldsText || '*None*' });

                    msg = await targetChannel.send({ embeds: [panelEmbed] });
                } else {
                    // Fetch existing message
                    msg = await targetChannel.messages.fetch(existingMsgId);
                }

                // Add reactions and save to database
                for (const item of reactionRoles) {
                    await msg.react(item.emojiStr).catch(() => {});

                    await ReactionRole.findOneAndUpdate(
                        { guildId: guild.id, messageId: msg.id, emoji: item.emojiKey },
                        { channelId: targetChannel.id, roleId: item.roleId },
                        { upsert: true, new: true }
                    );

                    // Log log event
                    const role = guild.roles.cache.get(item.roleId);
                    await logServerEvent(
                        guild.id,
                        'REACTION_ROLE_CREATE',
                        `Reaction role created on message ${msg.id} for @${item.roleName} with emoji ${item.emojiStr}`,
                        author,
                        role,
                        { channelId: targetChannel.id, messageId: msg.id, emoji: item.emojiStr, roleId: item.roleId }
                    );
                }

                // Finish setup embed
                const finalEmbed = new EmbedBuilder()
                    .setColor(0x2ecc71)
                    .setTitle('🎉 Reaction Roles Setup Complete!')
                    .setDescription(`Successfully set up reaction roles for channel ${targetChannel}!\n\n📟 Message URL: [Click here to view message](${msg.url})`)
                    .addFields({
                        name: 'Configured Roles',
                        value: reactionRoles.map(r => `${r.emojiStr} ➜ <@&${r.roleId}>`).join('\n')
                    })
                    .setTimestamp();

                await initialMsg.edit({ embeds: [finalEmbed] }).catch(() => {});
            } catch (err) {
                console.error(err);
                initialEmbed.setDescription('❌ Failed to create reaction role setup. Make sure I have permission to read/send in the channel and react to messages.').setColor(0xef4444);
                await initialMsg.edit({ embeds: [initialEmbed] }).catch(() => {});
            }
        }
    });
}
