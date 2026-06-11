/* eslint-disable */
const { EmbedBuilder, ActivityType } = require('discord.js');
const Reminder = require('../models/Reminder');
const { loadPremiumUsers } = require('../utils/premiumPromo');

module.exports = {
    name: 'clientReady',
    once: true,

    async execute(client) {
        // Load premium users into cache
        await loadPremiumUsers();

        // Dynamically map custom emojis from client cache / application emojis
        const { initDynamicEmojis } = require('../utils/customEmojis');
        await initDynamicEmojis(client);

        console.log(`✅ Bot is online as ${client.user.tag} [v2.triggers+embeds]`);
        console.log(`📦 Loaded ${client.commands.size} command(s)`);
        console.log(`🌐 Serving ${client.guilds.cache.size} guild(s)`);

        const statuses = [
            'dodging the IRS tax collectors... active cooldown 🏃‍♂️💨',
            'losing all my Baubles on Coinflip... again 🪙',
            'calculating casino taxes... please do not rob me 💸',
            'running 193+ commands at 3:00 AM... send coffee ☕',
            'arguing with the bot host about RAM usage 🧠',
            'sweeping mines... oh wait, that was a bomb 💣',
            'trying to buy a 1-of-1 item with a button battery 🔋',
            'asking the developer for a raise... got warning logs 🚫',
            'rigging blackjack for the house edge 🃏',
            'searching for spouses... current streak: single 💔',
            'crying over active cooldowns... please stand by ⏳',
            'trying to pay rent with Glimmering Baubles 🪙',
            'calculating the odds of winning jackpot... 0.0001% 🎰',
            'wondering why people keep trying to rob the developer 👮‍♂️'
        ];

        client.setRotatingPresence = () => {
            if (client.generosityStatusTimeout) return;
            const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
            client.user.setPresence({
                activities: [
                    {
                        name: 'eating cookies 🍪',
                        type: ActivityType.Playing
                    },
                    {
                        name: 'Custom Status',
                        type: ActivityType.Custom,
                        state: randomStatus
                    }
                ],
                status: 'online'
            });
        };

        // Set initial status
        client.setRotatingPresence();

        // Rotate status every 2 minutes (120,000ms) - completely safe from rate limits
        setInterval(() => {
            try {
                client.setRotatingPresence();
            } catch (err) {
                console.error('[Presence] Error setting rotating presence:', err);
            }
        }, 120_000);

        // Initialize Invites Cache
        client.invites = new Map();
        client.guilds.cache.forEach(async (guild) => {
            try {
                const firstInvites = await guild.invites.fetch();
                client.invites.set(guild.id, new Map(firstInvites.map((invite) => [invite.code, invite.uses])));
            } catch (err) {
                console.error(`Failed to fetch invites for guild ${guild.id}:`, err);
            }
        });

        // Initialize Lavalink nodes (riffy)
        if (client.riffy) {
            client.riffy.init(client.user.id);
            console.log('🎵 Lavalink (riffy) initialised');
        }

        // Initialize Disabled Commands cache
        const DisabledCommand = require('../models/disabledCommandSchema');
        client.disabledCommands = new Set();
        try {
            const disabled = await DisabledCommand.find().lean();
            for (const doc of disabled) {
                client.disabledCommands.add(doc.commandName);
            }
            console.log(`🚫 Loaded ${client.disabledCommands.size} disabled command(s)`);
        } catch (err) {
            console.error('Failed to load disabled commands:', err);
        }

        // --- Reminder Checker ---
        setInterval(async () => {
            try {
                const now = new Date();
                const dueReminders = await Reminder.find({ remindAt: { $lte: now } });

                if (dueReminders.length > 0) {
                    for (const reminder of dueReminders) {
                        try {
                            const user = await client.users.fetch(reminder.userId).catch(() => null);
                            if (!user) {
                                await Reminder.findByIdAndDelete(reminder._id);
                                continue;
                            }

                            const embed = new EmbedBuilder()
                                .setColor(0x00AE86)
                                .setTitle('⏰ Reminder!')
                                .setDescription(`You asked me to remind you:\n\n**${reminder.reminderText}**`)
                                .setTimestamp();

                            const channel = await client.channels.fetch(reminder.channelId).catch(() => null);

                            if (channel) {
                                // Try replying to the original message if possible
                                try {
                                    if (reminder.messageId) {
                                        const origMessage = await channel.messages.fetch(reminder.messageId);
                                        await origMessage.reply({ content: `<@${reminder.userId}>`, embeds: [embed] });
                                    } else {
                                        await channel.send({ content: `<@${reminder.userId}>`, embeds: [embed] });
                                    }
                                } catch (e) {
                                    // Fallback to channel without reply
                                    await channel.send({ content: `<@${reminder.userId}>`, embeds: [embed] });
                                }
                            } else {
                                // Fallback to DM
                                await user.send({ embeds: [embed] }).catch(() => null);
                            }

                            // Remove processed reminder
                            await Reminder.findByIdAndDelete(reminder._id);

                        } catch (err) {
                            console.error(`Failed to process reminder ${reminder._id}:`, err);
                        }
                    }
                }
            } catch (error) {
                console.error('Error checking for reminders:', error);
            }
        }, 30 * 1000); // Check every 30 seconds

        // --- Temporary Role Checker ---
        setInterval(async () => {
            try {
                const now = new Date();
                const TempRole = require('../models/tempRoleSchema');
                const expiredRoles = await TempRole.find({ expiresAt: { $lte: now } });

                if (expiredRoles.length > 0) {
                    for (const record of expiredRoles) {
                        try {
                            const guild = client.guilds.cache.get(record.guildId);
                            if (!guild) {
                                await TempRole.findByIdAndDelete(record._id);
                                continue;
                            }

                            const member = await guild.members.fetch(record.userId).catch(() => null);
                            const role = guild.roles.cache.get(record.roleId);

                            if (member && role) {
                                if (member.roles.cache.has(role.id)) {
                                    try {
                                        await member.roles.remove(role, 'Temporary role expired.');
                                    } catch (removeErr) {
                                        console.error(`Failed to remove temporary role ${role.name} from ${member.user.tag}:`, removeErr);
                                    }
                                }
                            }

                            await TempRole.findByIdAndDelete(record._id);
                        } catch (err) {
                            console.error(`Failed to process expired temp role entry ${record._id}:`, err);
                        }
                    }
                }
            } catch (error) {
                console.error('Error checking for expired temp roles:', error);
            }
        }, 30 * 1000); // Check every 30 seconds

        // --- Premium Subscription Expiry Checker ---
        // Runs every 6 hours; evicts expired premium users from cache immediately
        const checkExpiredPremium = async () => {
            try {
                const PremiumUser = require('../models/premiumUserSchema');
                const { dbPremiumUsersCache } = require('../utils/premiumPromo');
                const now = new Date();

                // Find all non-lifetime plans that have expired
                const expired = await PremiumUser.find({
                    expiresAt: { $ne: null, $lte: now }
                }).lean();

                if (expired.length > 0) {
                    for (const u of expired) {
                        // Remove from in-memory cache so bot stops granting perks
                        dbPremiumUsersCache.delete(u.userId);
                        // Remove from database
                        await PremiumUser.deleteOne({ userId: u.userId });
                        console.log(`[Premium] Expired subscription removed for user ${u.userId} (tier: ${u.tier})`);
                    }
                    console.log(`[Premium] Cleaned up ${expired.length} expired subscription(s)`);
                }
            } catch (err) {
                console.error('[Premium] Failed to check expired subscriptions:', err);
            }
        };
        // Run once on startup, then every 6 hours
        checkExpiredPremium();
        setInterval(checkExpiredPremium, 6 * 60 * 60 * 1000);
    },
};
