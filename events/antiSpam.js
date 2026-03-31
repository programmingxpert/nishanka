/* eslint-disable */
const { Collection, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'messageCreate',

    async execute(message, client) {
        // Ignore bots and DMs
        if (message.author.bot || !message.guild) return;

        // Exempt administrators and users with Manage Messages permission
        if (message.member.permissions.has(PermissionFlagsBits.Administrator) ||
            message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return;
        }

        const userId = message.author.id;
        const guildId = message.guild.id;
        const trackerKey = `${userId}-${guildId}`;

        // Initialize spam tracker for the user
        if (!client.spamTracker.has(trackerKey)) {
            client.spamTracker.set(trackerKey, []);
        }

        const now = Date.now();
        const timestamps = client.spamTracker.get(trackerKey);
        
        // Add current timestamp
        timestamps.push(now);

        // Keep only the last 5 timestamps
        if (timestamps.length > 5) {
            timestamps.shift();
        }

        // Check if 5 messages were sent within 3 seconds
        if (timestamps.length === 5 && (now - timestamps[0]) < 3000) {
            try {
                // Delete the spammy message if the bot has permission
                if (message.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) {
                    await message.delete().catch(() => {});
                }

                // Increment violations
                const violations = (client.spamViolations.get(trackerKey) || 0) + 1;
                client.spamViolations.set(trackerKey, violations);

                // Define punishment based on violation count
                let action = '';
                if (violations === 1) {
                    action = 'Warning sent.';
                    const warnEmbed = new EmbedBuilder()
                        .setColor(0xFFFF00)
                        .setTitle('⚠️ Fast Spam Detected')
                        .setDescription(`<@${userId}>, please slow down! You are sending messages too quickly.`)
                        .setFooter({ text: 'Spamming is not allowed in this server.' });
                    
                    const warnMsg = await message.channel.send({ embeds: [warnEmbed] });
                    // Auto-delete warning after 5 seconds
                    setTimeout(() => warnMsg.delete().catch(() => {}), 5000);

                } else {
                    // Timeout user
                    const timeoutMinutes = violations === 2 ? 1 : 5;
                    const timeoutMs = timeoutMinutes * 60 * 1000;
                    
                    if (message.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                        if (message.member.manageable) {
                            await message.member.timeout(timeoutMs, 'Fast Spamming').catch(console.error);
                            
                            const timeoutEmbed = new EmbedBuilder()
                                .setColor(0xFF0000)
                                .setTitle('🔇 User Timed Out')
                                .setDescription(`<@${userId}> has been timed out for **${timeoutMinutes} minute(s)** for persistent fast spamming.`)
                                .setFooter({ text: 'Auto-Moderation' });
                            
                            const timeoutMsg = await message.channel.send({ embeds: [timeoutEmbed] });
                            setTimeout(() => timeoutMsg.delete().catch(() => {}), 10000);
                            action = `Timed out for ${timeoutMinutes}m.`;
                        } else {
                            action = 'Failed to timeout (User is higher rank).';
                        }
                    } else {
                        action = 'Failed to timeout (Missing permission).';
                    }
                }

                console.log(`[AntiSpam] ${message.author.tag} in ${message.guild.name}: ${action}`);

                // Reset violation count after some time of good behavior
                setTimeout(() => {
                    const currentViolations = client.spamViolations.get(trackerKey);
                    if (currentViolations > 0) {
                        client.spamViolations.set(trackerKey, currentViolations - 1);
                    }
                }, 60000); // 1 minute window for violation cooldown

            } catch (error) {
                console.error('[AntiSpam] Error handling spam:', error);
            }
        }
    },
};
