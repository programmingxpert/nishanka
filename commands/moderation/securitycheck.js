/* eslint-disable */
const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    PermissionsBitField,
    ComponentType,
    ChannelType
} = require('discord.js');
const GuildSettings = require('../../models/guildSettingsSchema');
const { checkCommandPermission } = require('../../utils/permissions');
const { getGuildPremiumTier } = require('../../utils/premiumPromo');

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const VerificationLevels = {
    0: 'None',
    1: 'Low (Email Verified)',
    2: 'Medium (Registered > 5 mins)',
    3: 'High (Member of Server > 10 mins)',
    4: 'Very High (Verified Phone)'
};

const FilterLevels = {
    0: 'Disabled',
    1: 'Members Without Roles',
    2: 'All Members'
};

const MfaLevels = {
    0: 'None',
    1: 'Elevated (Requires 2FA for Moderation)'
};

module.exports = {
    category: 'moderation',
    cooldown: 10,
    data: new SlashCommandBuilder()
        .setName('securitycheck')
        .setDescription('Performs a comprehensive security and vulnerability audit of the server.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        await this.runSecurityCheck(interaction, true);
    },

    async executePrefix(message, args) {
        await this.runSecurityCheck(message, false);
    },

    async runSecurityCheck(context, isSlash) {
        const guild = context.guild;
        const user = isSlash ? context.user : context.author;
        const guildId = guild.id;

        // 1. Permissions Check (mods or admins)
        const isAuthorized = context.member.permissions.has(PermissionsBitField.Flags.ManageGuild) || 
                             context.member.permissions.has(PermissionsBitField.Flags.Administrator) || 
                             await checkCommandPermission(context, 'bot');
                             
        if (!isAuthorized) {
            const errorMsg = '❌ You do not have permission to run this command. You need the **Manage Server** permission or an authorized role.';
            return isSlash ? context.reply({ content: errorMsg, ephemeral: true }) : context.reply(errorMsg);
        }

        // 2. Rate limit check (free servers = once every 30 days)
        const premiumTier = await getGuildPremiumTier(guildId);
        const isPremium = premiumTier !== 'free';

        let settings = await GuildSettings.findOne({ guildId });
        if (!settings) {
            settings = new GuildSettings({ guildId });
        }

        if (!isPremium) {
            if (settings.lastSecurityCheck) {
                const lastCheck = new Date(settings.lastSecurityCheck);
                const nextCheckAllowed = new Date(lastCheck.getTime() + 30 * 24 * 60 * 60 * 1000);
                if (Date.now() < nextCheckAllowed.getTime()) {
                    const timeRemaining = nextCheckAllowed.getTime() - Date.now();
                    const days = Math.floor(timeRemaining / (24 * 60 * 60 * 1000));
                    const hours = Math.floor((timeRemaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
                    const minutes = Math.floor((timeRemaining % (60 * 60 * 1000)) / (60 * 1000));
                    
                    const embed = new EmbedBuilder()
                        .setColor(0xf59e0b)
                        .setTitle('⚠️ Security Check Cooldown')
                        .setDescription(
                            `The **Server Security Check** is an intensive audit (scanning roles, permissions, overrides, webhooks, and calling Nish AI).\n\n` +
                            `🔒 **Free Tier Limit:** Free servers can run this command **once per month** (every 30 days).\n` +
                            `⏳ **Available again in:** \`${days}d ${hours}h ${minutes}m\` (<t:${Math.floor(nextCheckAllowed.getTime() / 1000)}:R>).\n\n` +
                            `⭐ **Unlock Unlimited Scans:** Upgrade your server to any premium plan (Lite, Pro, Network) on our [Premium Page](https://nishanka.zeyuki.app/premium) to bypass this limit instantly!`
                        )
                        .setTimestamp();
                    
                    return isSlash ? context.reply({ embeds: [embed], ephemeral: true }) : context.reply({ embeds: [embed] });
                }
            }
        }

        // 3. Warning & Acknowledgement phase
        const warningEmbed = new EmbedBuilder()
            .setColor(0x7c6cf0)
            .setTitle('🛡️ Server Security Audit Initialization')
            .setDescription(
                `⚠️ **IMPORTANT SECURITY NOTICE:**\n` +
                `This command scans all roles, permission configurations, and channels. It reveals sensitive vulnerabilities. **Please ensure you run this command in a PRIVATE channel** to avoid disclosing vulnerabilities to regular members.\n\n` +
                `🤖 **RECOMMENDATION:**\n` +
                `Make sure the bot's role is placed at the **highest possible level/priority** of what the owner wants analysed (highly recommended to be above all regular member roles) so the bot can perform accurate administrative calculations.\n\n` +
                `Click **Proceed with Security Scan** to acknowledge and start the analysis.`
            )
            .setTimestamp()
            .setFooter({ text: `Requested by ${user.tag}` });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`security_confirm_${user.id}`)
                .setLabel('Proceed with Security Scan')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`security_cancel_${user.id}`)
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Danger)
        );

        const replyMsg = isSlash
            ? await context.reply({ embeds: [warningEmbed], components: [row], fetchReply: true })
            : await context.reply({ embeds: [warningEmbed], components: [row] });

        const collector = replyMsg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 30000
        });

        collector.on('collect', async (i) => {
            if (i.user.id !== user.id) {
                return i.reply({ content: '❌ You did not invoke this command.', ephemeral: true });
            }

            if (i.customId === `security_cancel_${user.id}`) {
                const cancelEmbed = new EmbedBuilder()
                    .setColor(0xef4444)
                    .setTitle('🛡️ Security Scan Cancelled')
                    .setDescription('❌ The security audit has been cancelled by the operator.');
                await i.update({ embeds: [cancelEmbed], components: [] });
                return collector.stop('cancelled');
            }

            if (i.customId === `security_confirm_${user.id}`) {
                await i.deferUpdate();
                collector.stop('confirmed');
            }
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'time') {
                const timeoutEmbed = new EmbedBuilder()
                    .setColor(0xef4444)
                    .setTitle('🛡️ Security Scan Timed Out')
                    .setDescription('❌ The scan initialization timed out. Acknowledgement is required within 30 seconds.');
                await replyMsg.edit({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
                return;
            }

            if (reason === 'confirmed') {
                // Save the timestamp immediately to prevent double-scan exploits
                settings.lastSecurityCheck = new Date();
                await settings.save();

                // Run scanning phase
                await this.runScanningProcess(replyMsg, guild, settings, premiumTier);
            }
        });
    },

    async runScanningProcess(replyMsg, guild, settings, premiumTier) {
        const logs = [];
        const isPremium = premiumTier !== 'free';
        
        const updateProgress = async (progressPercent, currentTask) => {
            const progressBar = '█'.repeat(Math.floor(progressPercent / 10)) + '░'.repeat(10 - Math.floor(progressPercent / 10));
            const progressEmbed = new EmbedBuilder()
                .setColor(0x7c6cf0)
                .setTitle('⚙️ Server Security Scan In Progress...')
                .setDescription(
                    `**Status:** Running comprehensive security audit...\n` +
                    `\`[${progressBar}]\` **${progressPercent}%**\n` +
                    `*Currently:* ${currentTask}\n\n` +
                    `**Scan Logs:**\n` +
                    logs.map(log => log).join('\n')
                )
                .setFooter({ text: 'Analyzing roles, channels, and rules...' });
            await replyMsg.edit({ embeds: [progressEmbed], components: [] }).catch(() => {});
        };

        const highFindings = [];
        const mediumFindings = [];
        const lowFindings = [];
        const safeSettings = [];

        // --- STEP 1 ---
        logs.push('🔍 Step 1: Auditing Server Verification & 2FA Settings...');
        await updateProgress(10, 'Checking guild settings...');
        await wait(800);

        // Verification level audit
        const vLevel = guild.verificationLevel;
        const vText = VerificationLevels[vLevel] || 'Unknown';
        if (vLevel === 0) {
            highFindings.push({
                name: '🔴 Verification Level Set to None',
                value: `**Vulnerability:** Anyone can join the server without email or phone verification.\n` +
                       `**Why it's vulnerable:** Self-bots and spam-bots can instantly join in huge numbers during a raid.\n` +
                       `**What could happen:** Mass mention spam, user direct-message phishing, and general server disruption.`
            });
        } else if (vLevel === 1 || vLevel === 2) {
            mediumFindings.push({
                name: '🟡 Low/Medium Server Verification',
                value: `**Current Setting:** \`${vText}\`.\n` +
                       `**Why it's vulnerable:** Email verification is simple for spammers to automate or bypass.\n` +
                       `**What could happen:** Automated bot accounts can join if their emails are verified, bypass limits, and spam members.`
            });
        } else {
            safeSettings.push(`🟢 **Verification level is high:** \`${vText}\`.`);
        }

        // Explicit content filter
        const filter = guild.explicitContentFilter;
        const filterText = FilterLevels[filter] || 'Unknown';
        if (filter === 0) {
            highFindings.push({
                name: '🔴 Explicit Content Filter Disabled',
                value: `**Vulnerability:** Media uploaded to the server is not scanned by Discord.\n` +
                       `**Why it's vulnerable:** Users can upload malicious, explicit, or illegal media in any open channels.\n` +
                       `**What could happen:** The server gets reported for sharing violating content, leading to a Discord Trust & Safety ban.`
            });
        } else if (filter === 1) {
            mediumFindings.push({
                name: '🟡 Partial Explicit Content Filter',
                value: `**Current Setting:** Scans messages from members without roles.\n` +
                       `**Why it's vulnerable:** If members get a default role upon joining (auto-role), they bypass media checks entirely.\n` +
                       `**What could happen:** Members with roles can upload harmful or unsafe media without detection.`
            });
        } else {
            safeSettings.push(`🟢 **Explicit Content Filter scans all media:** \`${filterText}\`.`);
        }

        // 2FA requirement
        const mfa = guild.mfaLevel;
        const mfaText = MfaLevels[mfa] || 'Unknown';
        if (mfa === 0) {
            mediumFindings.push({
                name: '🟡 2FA Requirement for Moderation Disabled',
                value: `**Vulnerability:** Server staff do not need 2FA enabled on their Discord account to perform moderation actions.\n` +
                       `**Why it's vulnerable:** If a staff member's account is compromised (phishing/token log), the hijacker can immediately ban/kick members.\n` +
                       `**What could happen:** Server destruction/pruning within seconds by a single compromised staff account.`
            });
        } else {
            safeSettings.push('🟢 **2FA requirement for moderators is enabled.**');
        }

        logs[0] = '🟢 Step 1: Server Verification & 2FA Settings audited.';

        // --- STEP 2 ---
        logs.push('🛡️ Step 2: Evaluating Role Hierarchy & Bot Priority...');
        await updateProgress(30, 'Comparing bot role priority...');
        await wait(800);

        const botMember = await guild.members.fetch(guild.client.user.id).catch(() => null);
        if (botMember) {
            const botHighest = botMember.roles.highest.position;
            const roles = await guild.roles.fetch();
            let highestAdminRole = null;
            let highestAdminPos = 0;

            for (const role of roles.values()) {
                if (role.managed || role.id === guild.roles.everyone.id) continue;
                if (role.permissions.has(PermissionsBitField.Flags.Administrator) || role.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
                    if (role.position > highestAdminPos) {
                        highestAdminPos = role.position;
                        highestAdminRole = role;
                    }
                }
            }

            if (botHighest < highestAdminPos) {
                mediumFindings.push({
                    name: '🟡 Nishanka Bot Role is Placed Low',
                    value: `**Vulnerability:** Bot's highest role is below administrative role **${highestAdminRole.name}**.\n` +
                           `**Why it's vulnerable:** Discord permission hierarchy prevents bots from moderating users or editing roles higher than the bot's highest role.\n` +
                           `**What could happen:** If a user with a higher role turns rogue or gets hijacked, Nishanka will fail to ban, timeout, or remove their roles.`
                });
            } else {
                safeSettings.push('🟢 **Nishanka Bot role is placed at a high priority.**');
            }
        }
        logs[1] = '🟢 Step 2: Role hierarchy and bot priority checked.';

        // --- STEP 3 ---
        logs.push('👥 Step 3: Classifying Civilian Roles & Auditing Permissions...');
        await updateProgress(50, 'Analyzing role permissions...');
        await wait(1000);

        const everyone = guild.roles.everyone;
        let everyoneUseAppCmds = everyone.permissions.has(PermissionsBitField.Flags.UseApplicationCommands);
        
        if (everyoneUseAppCmds) {
            highFindings.push({
                name: '🔴 @everyone Can Call External Apps',
                value: `**Vulnerability:** The \`Use Application Commands\` permission is enabled for the default **@everyone** role.\n` +
                       `**Why it's vulnerable:** This allows any user to execute slash commands of external apps (bots) that are *not* added to this server by admins.\n` +
                       `**What could happen:** Raid bots or spam apps can be called client-side to bypass server logs, send offensive slurs, bypass automod, or spam channels. These actions do not register in audit logs as they originate from external clients!`
            });
        } else {
            safeSettings.push('🟢 **@everyone cannot use external application commands.**');
        }

        // Dangerous permissions on everyone
        const dangerousListOnEveryone = [];
        const dPermissions = [
            { flag: PermissionsBitField.Flags.Administrator, label: 'Administrator' },
            { flag: PermissionsBitField.Flags.ManageGuild, label: 'Manage Server' },
            { flag: PermissionsBitField.Flags.ManageRoles, label: 'Manage Roles' },
            { flag: PermissionsBitField.Flags.ManageChannels, label: 'Manage Channels' },
            { flag: PermissionsBitField.Flags.KickMembers, label: 'Kick Members' },
            { flag: PermissionsBitField.Flags.BanMembers, label: 'Ban Members' },
            { flag: PermissionsBitField.Flags.ManageMessages, label: 'Manage Messages' },
            { flag: PermissionsBitField.Flags.MentionEveryone, label: 'Mention @everyone' },
            { flag: PermissionsBitField.Flags.ManageWebhooks, label: 'Manage Webhooks' },
            { flag: PermissionsBitField.Flags.ViewAuditLog, label: 'View Audit Log' }
        ];

        for (const perm of dPermissions) {
            if (everyone.permissions.has(perm.flag)) {
                dangerousListOnEveryone.push(perm.label);
            }
        }

        if (dangerousListOnEveryone.length > 0) {
            highFindings.push({
                name: '🔴 Default @everyone Has Administrative Permissions',
                value: `**Vulnerability:** The default @everyone role possesses: \`${dangerousListOnEveryone.join(', ')}\`.\n` +
                       `**Why it's vulnerable:** Every single user joining the server receives these permissions immediately.\n` +
                       `**What could happen:** Server takeover, instant deletions, mass bans, or webhook manipulation by any new account.`
            });
        }

        // Check civilian roles
        const allRoles = await guild.roles.fetch();
        let civilianCount = 0;
        let civilianFlaggedCount = 0;

        for (const role of allRoles.values()) {
            if (role.managed || role.id === everyone.id) continue;

            const nameLower = role.name.toLowerCase();
            const isModAdminRole = nameLower.includes('mod') || 
                                   nameLower.includes('admin') || 
                                   nameLower.includes('owner') || 
                                   nameLower.includes('staff') || 
                                   nameLower.includes('bot') || 
                                   nameLower.includes('helper') || 
                                   nameLower.includes('nishanka') ||
                                   nameLower.includes('moderator') ||
                                   nameLower.includes('developer');

            if (!isModAdminRole) {
                civilianCount++;
                const elevatedPerms = [];
                const highPerms = [];
                
                // Check for high danger perms
                if (role.permissions.has(PermissionsBitField.Flags.Administrator)) elevatedPerms.push('Administrator');
                if (role.permissions.has(PermissionsBitField.Flags.ManageGuild)) elevatedPerms.push('Manage Server');
                if (role.permissions.has(PermissionsBitField.Flags.ManageRoles)) elevatedPerms.push('Manage Roles');
                if (role.permissions.has(PermissionsBitField.Flags.ManageChannels)) elevatedPerms.push('Manage Channels');
                if (role.permissions.has(PermissionsBitField.Flags.KickMembers)) elevatedPerms.push('Kick Members');
                if (role.permissions.has(PermissionsBitField.Flags.BanMembers)) elevatedPerms.push('Ban Members');
                
                // Check for medium danger perms
                if (role.permissions.has(PermissionsBitField.Flags.ManageMessages)) highPerms.push('Manage Messages');
                if (role.permissions.has(PermissionsBitField.Flags.ManageWebhooks)) highPerms.push('Manage Webhooks');
                if (role.permissions.has(PermissionsBitField.Flags.ViewAuditLog)) highPerms.push('View Audit Log');
                if (role.permissions.has(PermissionsBitField.Flags.MentionEveryone)) highPerms.push('Mention Everyone');
                if (role.permissions.has(PermissionsBitField.Flags.UseApplicationCommands)) highPerms.push('Use Application Commands');

                if (elevatedPerms.length > 0) {
                    civilianFlaggedCount++;
                    highFindings.push({
                        name: `🔴 Civilian Role Has Moderation Access: ${role.name}`,
                        value: `**Vulnerability:** This regular member role has: \`${elevatedPerms.join(', ')}\`.\n` +
                               `**Why it's vulnerable:** It allows ordinary members to perform server alterations or ban other users.\n` +
                               `**What could happen:** Accidental modifications, rogue members destroying server structures, or hijacking bans.`
                    });
                } else if (highPerms.length > 0) {
                    civilianFlaggedCount++;
                    mediumFindings.push({
                        name: `🟡 Civilian Role Has Elevated Access: ${role.name}`,
                        value: `**Vulnerability:** This role has permission: \`${highPerms.join(', ')}\`.\n` +
                               `**Why it's vulnerable:** Regular members shouldn't have access to delete messages, view logs, or call external application commands.\n` +
                               `**What could happen:** Message censorship by members, audit information leaks, or external bot raids.`
                    });
                }
            }
        }

        if (civilianFlaggedCount === 0) {
            safeSettings.push('🟢 **Civilian roles are properly restricted.**');
        }

        logs[2] = `🟢 Step 3: Civilian permissions & @everyone roles audited (${civilianCount} civilian roles scanned).`;

        // --- STEP 4 ---
        logs.push('📢 Step 4: Scanning Private Channel Overrides...');
        await updateProgress(70, 'Scanning text and voice channel permissions...');
        await wait(800);

        const channels = await guild.channels.fetch();
        let unsafeOverridesCount = 0;

        for (const channel of channels.values()) {
            if (!channel) continue;
            
            // Look for channels intended to be private or moderation channels
            const nameLower = channel.name.toLowerCase();
            const isSensitive = nameLower.includes('mod') || 
                                nameLower.includes('admin') || 
                                nameLower.includes('staff') || 
                                nameLower.includes('logs') || 
                                nameLower.includes('audit') || 
                                nameLower.includes('dev') ||
                                nameLower.includes('secret') ||
                                nameLower.includes('ticket');

            if (isSensitive && (channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildVoice)) {
                // Check if @everyone can view this channel
                const everyoneOverride = channel.permissionOverwrites.cache.get(everyone.id);
                const isViewable = everyoneOverride 
                    ? !everyoneOverride.deny.has(PermissionsBitField.Flags.ViewChannel) 
                    : channel.parent ? channel.parent.permissionOverwrites.cache.get(everyone.id) ? !channel.parent.permissionOverwrites.cache.get(everyone.id).deny.has(PermissionsBitField.Flags.ViewChannel) : true : true;

                if (isViewable) {
                    unsafeOverridesCount++;
                    highFindings.push({
                        name: `🔴 Sensitive Channel is Public: <#${channel.id}>`,
                        value: `**Vulnerability:** Channel \`#${channel.name}\` is readable by regular members.\n` +
                               `**Why it's vulnerable:** Regular users can see staff discussions, log channels, or moderator tools.\n` +
                               `**What could happen:** Leaking private mod decisions, staff arguments, logs containing sensitive credentials or logs.`
                    });
                }
            }
        }

        if (unsafeOverridesCount === 0) {
            safeSettings.push('🟢 **Private moderator channels are securely hidden from @everyone.**');
        }

        logs[3] = '🟢 Step 4: Private channel overrides scanned.';

        // --- STEP 5 ---
        logs.push('🔌 Step 5: Checking Webhooks & Integrations...');
        await updateProgress(85, 'Auditing integrations and webhook configurations...');
        await wait(800);

        const webhooks = await guild.fetchWebhooks().catch(() => null);
        let webhookCount = 0;

        if (webhooks === null) {
            mediumFindings.push({
                name: '🟡 Webhooks Verification Blocked',
                value: `**Vulnerability:** Nishanka has no permission to read guild webhooks.\n` +
                       `**Why it's vulnerable:** The bot cannot audit webhook configurations if it lacks \`Manage Webhooks\` permission.\n` +
                       `**What could happen:** Unchecked webhooks created by malicious users or third-party bots could bypass standard logs.`
            });
        } else {
            webhookCount = webhooks.size;
            if (webhooks.size > 15) {
                mediumFindings.push({
                    name: `🟡 High Count of Webhooks (${webhooks.size})`,
                    value: `**Vulnerability:** High quantity of webhooks created.\n` +
                           `**Why it's vulnerable:** Webhook tokens are static. If a staff account is hacked or third-party app leaks its configuration, these webhooks can be abused to spam.\n` +
                           `**What could happen:** Uncensored spam and webhook phishing campaigns targeting your members.`
                });
            } else {
                safeSettings.push(`🟢 **Webhook count is within safe limits** (${webhooks.size} active webhooks).`);
            }
        }

        logs[4] = '🟢 Step 5: Webhooks and integrations checked.';

        // --- STEP 6 ---
        logs.push('🧠 Step 6: Querying Nish AI for Security Recommendations...');
        await updateProgress(95, 'Synthesizing report recommendations...');

        let aiRecs = '';
        const apiKey = process.env.DEEPSEEK_API_KEY;
        const hasApiKey = apiKey && apiKey !== 'your_deepseek_api_key_here';

        if (hasApiKey) {
            try {
                const systemPrompt = "You are Nish AI, the security intelligence module of Nishanka bot. You are analyzing a Discord server's security configurations and role permissions. Provide exactly 3 to 4 concise, professional, and actionable security recommendations in bullet points. Focus on the findings provided. Do not write any introduction or explanation, just the bullet points themselves. Keep lines short.";
                const userPrompt = `Server: ${guild.name}
Verification Level: ${vText} (Level ${vLevel})
Explicit Content Filter: ${filterText} (Level ${filter})
MFA Level: ${mfaText} (Level ${mfa})
@everyone Has UseApplicationCommands: ${everyoneUseAppCmds ? 'Yes (Vulnerable)' : 'No'}
Civilian Roles Flagged Count: ${civilianFlaggedCount}
Webhook Count: ${webhookCount}
High Risk Findings Count: ${highFindings.length}
Medium Risk Findings Count: ${mediumFindings.length}`;

                const response = await fetch('https://api.deepseek.com/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: 'deepseek-chat',
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: userPrompt }
                        ],
                        temperature: 0.6,
                        max_tokens: 400
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    aiRecs = data.choices[0].message.content.trim();
                } else {
                    console.error(`DeepSeek returned status ${response.status} in security check.`);
                }
            } catch (err) {
                console.error('Failed to contact Nish AI in security check:', err);
            }
        }

        // Fallback recommendations if AI fails or key is missing
        if (!aiRecs) {
            const recs = [];
            if (everyoneUseAppCmds) {
                recs.push('• **Disable Use Application Commands for @everyone:** Protect against unauthorized external bot raids and spam commands.');
            }
            if (vLevel < 3) {
                recs.push('• **Raise Verification Level:** Configure server verification to High or Very High to prevent automated token raids.');
            }
            if (civilianFlaggedCount > 0) {
                recs.push('• **Audit Civilian Roles:** Strip administrative permissions (Administrator, Manage Roles, Ban/Kick) from standard member roles.');
            }
            if (mfa === 0) {
                recs.push('• **Require 2FA for Moderation:** Turn on 2FA requirement to protect the server if staff accounts get hijacked.');
            }
            if (recs.length < 3) {
                recs.push('• **Audit Private Channels:** Keep sensitive logs, staff chats, and audit channels strictly hidden from public roles.');
                recs.push('• **Monitor Webhook List:** Clean up inactive webhooks regularly to minimize static token leak risks.');
            }
            aiRecs = recs.join('\n');
        }

        logs[5] = '🟢 Step 6: Nish AI security report compiled.';
        await updateProgress(100, 'Constructing final report...');
        await wait(500);

        // Health Score Calculation
        let healthScore = 100;
        healthScore -= highFindings.length * 15;
        healthScore -= mediumFindings.length * 5;
        if (healthScore < 10) healthScore = 10;

        let scoreEmoji = '🟢';
        let scoreColor = 0x10b981; // Green
        if (healthScore < 60) {
            scoreEmoji = '🔴';
            scoreColor = 0xef4444; // Red
        } else if (healthScore < 85) {
            scoreEmoji = '🟡';
            scoreColor = 0xf59e0b; // Orange
        }

        // Render Final Report Embed
        const reportEmbed = new EmbedBuilder()
            .setColor(scoreColor)
            .setTitle(`🛡️ Server Security Audit: ${guild.name}`)
            .setDescription(
                `### **Security Health Score:** ${scoreEmoji} \`${healthScore}/100\`\n` +
                `Here is a full security report compiled by **Nish AI**. Please review findings and take actions to secure your server.`
            )
            .setTimestamp()
            .setFooter({ text: `Audit completed • Nishanka Premium: ${isPremium ? 'Active' : 'Inactive'}` });

        // Add High Risk findings (limit text to fit embed)
        if (highFindings.length > 0) {
            const content = highFindings.map(f => `**${f.name}**\n${f.value}`).join('\n\n');
            const truncated = content.length > 1024 ? content.slice(0, 1021) + '...' : content;
            reportEmbed.addFields({ name: '🔴 HIGH RISK VULNERABILITIES', value: truncated });
        } else {
            reportEmbed.addFields({ name: '🔴 HIGH RISK VULNERABILITIES', value: '🟢 No high risk vulnerabilities found. Great job!' });
        }

        // Add Medium Risk findings
        if (mediumFindings.length > 0) {
            const content = mediumFindings.map(f => `**${f.name}**\n${f.value}`).join('\n\n');
            const truncated = content.length > 1024 ? content.slice(0, 1021) + '...' : content;
            reportEmbed.addFields({ name: '🟡 MEDIUM RISK FINDINGS', value: truncated });
        }

        // Add Safe Settings
        if (safeSettings.length > 0) {
            const content = safeSettings.join('\n');
            const truncated = content.length > 1024 ? content.slice(0, 1021) + '...' : content;
            reportEmbed.addFields({ name: '🟢 SECURED CONFIGURATIONS', value: truncated });
        }

        // Add AI recommendations
        reportEmbed.addFields({ name: '🧠 NISH AI SECURITY RECOMMENDATIONS', value: aiRecs });

        await replyMsg.edit({ embeds: [reportEmbed], components: [] }).catch(() => {});
    }
};
