const { EmbedBuilder, ActivityType } = require('discord.js');

async function triggerGlobalGenerosityAlert(client, senderUser, recipientUser, amountOrItem, type, extraTax = 0) {
    try {
        const senderTag = senderUser.username;
        let recipientTag = recipientUser ? recipientUser.username : '';

        // 1. Update status presence live for 5 minutes
        let activityState = '';
        if (type === 'gift') {
            const display = typeof amountOrItem === 'number' 
                ? `${amountOrItem.toLocaleString()} Baubles` 
                : amountOrItem;
            activityState = `🎁 Gift: ${senderTag} ➔ ${recipientTag} (${display}! Check profile)`;
        } else if (type === 'baublerain') {
            activityState = `🌧️ Rain: ${senderTag} showered ${amountOrItem.toLocaleString()} Baubles!`;
        }

        // Set Custom Status
        if (activityState) {
            client.user.setPresence({
                activities: [
                    {
                        name: 'Custom Status',
                        type: ActivityType.Custom,
                        state: activityState.slice(0, 127) // Discord caps custom state at 128 chars
                    }
                ],
                status: 'online'
            });

            // Reset status after 5 minutes
            if (client.generosityStatusTimeout) {
                clearTimeout(client.generosityStatusTimeout);
            }
            client.generosityStatusTimeout = setTimeout(() => {
                try {
                    client.user.setPresence({
                        activities: [
                            {
                                name: 'eating cookies 🍪',
                                type: ActivityType.Playing
                            },
                            {
                                name: 'Custom Status',
                                type: ActivityType.Custom,
                                state: 'nishanka is going public soon.. stay tuned!!'
                            }
                        ],
                        status: 'online'
                    });
                } catch (err) {
                    console.error('[Generosity Alert] Failed to reset bot presence:', err);
                }
                client.generosityStatusTimeout = null;
            }, 5 * 60 * 1000);
        }

        // 2. Send beautiful embed to channel #1514587205299863563
        const logChannel = await client.channels.fetch('1514587205299863563').catch(() => null);
        if (logChannel) {
            const embed = new EmbedBuilder()
                .setColor(0xF1C40F) // Gold
                .setTimestamp()
                .setFooter({ text: '💎 Nishanka Global Generosity Feed 💎' });

            if (type === 'gift') {
                embed.setTitle('🎁 LEGENDARY GIFT TRANSFERRED 🎁')
                    .setDescription(`**${senderUser.username}** wrapped a massive gift for **${recipientUser.username}**!`)
                    .addFields(
                        { name: '👤 Sender', value: `<@${senderUser.id}> (${senderUser.tag})`, inline: true },
                        { name: '👤 Recipient', value: `<@${recipientUser.id}> (${recipientUser.tag})`, inline: true }
                    );

                if (typeof amountOrItem === 'number') {
                    embed.addFields({ name: '🪙 Gift Amount', value: `**${amountOrItem.toLocaleString()}** Baubles`, inline: false });
                } else {
                    embed.addFields({ name: '📦 Gifted Item', value: amountOrItem, inline: false });
                }

                if (extraTax > 0) {
                    embed.addFields({ name: '💸 Extra Tax Contribution', value: `**${extraTax.toLocaleString()}** Baubles (deposited to federal Tax Fund)`, inline: false });
                }
            } else if (type === 'baublerain') {
                embed.setTitle('🌧️ LEGENDARY BAUBLE RAIN SHOWERED 🌧️')
                    .setDescription(`**${senderUser.username}** has summoned a rain shower of wealth!`)
                    .addFields(
                        { name: '👤 Sponsor', value: `<@${senderUser.id}> (${senderUser.tag})`, inline: true },
                        { name: '🪙 Rain Amount', value: `**${amountOrItem.toLocaleString()}** Baubles`, inline: true }
                    );
            }

            await logChannel.send({ embeds: [embed] }).catch(err => {
                console.error('[Generosity Alert] Failed to send log channel message:', err);
            });
        }
    } catch (e) {
        console.error('[Generosity Alert] Error in triggerGlobalGenerosityAlert:', e);
    }
}

module.exports = { triggerGlobalGenerosityAlert };
