/* eslint-disable */
const { EmbedBuilder } = require('discord.js');
const Reminder = require('../models/Reminder');

module.exports = {
    name: 'clientReady',
    once: true,

    async execute(client) {
        console.log(`✅ Bot is online as ${client.user.tag}`);
        console.log(`📦 Loaded ${client.commands.size} command(s)`);
        console.log(`🌐 Serving ${client.guilds.cache.size} guild(s)`);

        client.user.setActivity('nishanka is going public soon, stay tuned!!');

        // Initialize Lavalink nodes (riffy)
        if (client.riffy) {
            client.riffy.init(client.user.id);
            console.log('🎵 Lavalink (riffy) initialised');
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
    },
};
