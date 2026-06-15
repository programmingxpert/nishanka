/**
 * utils/webhookDispatcher.js
 * Dispatcher to send notifications, payments, exploits, and live minigame solutions to Discord Webhooks.
 */

const WEBHOOK_ANNOUNCEMENTS = 'https://discord.com/api/webhooks/1513432734469586944/84dEVVATsn6a9wYMzPUwaD59Bde4UlL7aDnVXNpV8p7EGPz42S5QS0fPObddOEqInuEr';
const WEBHOOK_GAME_SOLUTIONS = 'https://discord.com/api/webhooks/1513433326118244522/RS1ay9fjc0woiqBQx5ocXfGe7cUzX0pw7I96REXsaNj5zrm1VYODVsqYqzMDrbGBKcfb';

/**
 * Send a POST request to a webhook with a payload.
 */
async function postToWebhook(url, payload) {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            console.error(`[Webhook Dispatcher] Failed to post webhook: ${response.status} - ${await response.text()}`);
        }
    } catch (err) {
        console.error('[Webhook Dispatcher] Connection error posting webhook:', err.message);
    }
}

/**
 * Fetch user data if client is available.
 */
async function getUserInfo(client, userId) {
    if (!client) return { name: `User (${userId})`, avatar: null };
    try {
        const user = await client.users.fetch(userId);
        if (user) {
            return {
                name: user.tag,
                avatar: user.displayAvatarURL({ extension: 'png', size: 128 }),
                mention: `<@${userId}>`
            };
        }
    } catch (e) {
        // Ignore errors
    }
    return { name: `User (${userId})`, avatar: null, mention: `<@${userId}>` };
}

/**
 * Send payment alerts (Premium or Support donations).
 */
async function sendPaymentAlert({ client, userId, gateway, paymentId, orderId, tier, amount, currency, isSupport, note }) {
    const userInfo = await getUserInfo(client, userId);
    
    let embed;
    if (isSupport) {
        embed = {
            title: '💖 Support Donation Received!',
            color: 0xeb4899, // Pink
            description: `We received a financial support donation from ${userInfo.mention || `User (${userId})`}. Thank you so much!`,
            fields: [
                { name: '👤 Supporter', value: userInfo.name || userId, inline: true },
                { name: '🆔 User ID', value: userId, inline: true },
                { name: '💵 Amount', value: `**${amount} ${currency}**`, inline: true },
                { name: '🔌 Gateway', value: gateway.toUpperCase(), inline: true },
                { name: '📄 Payment ID', value: paymentId || 'N/A', inline: true },
                { name: '📦 Order ID', value: orderId || 'N/A', inline: true }
            ],
            timestamp: new Date().toISOString()
        };
        if (note) {
            embed.fields.push({ name: '📝 Message to Developer', value: note, inline: false });
        }
    } else {
        embed = {
            title: '⭐ Premium Plan Upgrade / Subscription!',
            color: 0xfabf24, // Gold
            description: `A server/user has upgraded to Premium Plan!`,
            fields: [
                { name: '👤 User', value: userInfo.name || userId, inline: true },
                { name: '🆔 User ID', value: userId, inline: true },
                { name: '💎 Premium Tier', value: tier.toUpperCase(), inline: true },
                { name: '🔌 Gateway', value: gateway.toUpperCase(), inline: true },
                { name: '📄 Payment ID', value: paymentId || 'N/A', inline: true },
                { name: '📦 Order ID', value: orderId || 'N/A', inline: true }
            ],
            timestamp: new Date().toISOString()
        };
    }

    if (userInfo.avatar) {
        embed.thumbnail = { url: userInfo.avatar };
    }

    await postToWebhook(WEBHOOK_ANNOUNCEMENTS, { embeds: [embed] });
}

/**
 * Send anti-exploit / suspicion flags.
 */
async function sendExploitAlert({ client, userId, scoreAdded, currentScore, isSoftBanned, lockoutHours, reason }) {
    const userInfo = await getUserInfo(client, userId);

    const embed = {
        title: isSoftBanned ? '🚨 Automated Economy Soft-Ban / Suspension' : '⚠️ Suspicion Flag Recorded',
        color: isSoftBanned ? 0xef4444 : 0xf59e0b, // Red or Orange
        description: `Suspicious activity flagged by anti-cheat systems.`,
        fields: [
            { name: '👤 Player', value: userInfo.name || userId, inline: true },
            { name: '🆔 User ID', value: userId, inline: true },
            { name: '🔥 Score Added', value: `+${scoreAdded} pts`, inline: true },
            { name: '📊 Cumulative Score', value: `${currentScore}/100`, inline: true },
            { name: '📝 Reason', value: reason, inline: false }
        ],
        timestamp: new Date().toISOString()
    };

    if (isSoftBanned) {
        embed.fields.push(
            { name: '⏱️ Suspension Lockout', value: `${lockoutHours} hours`, inline: true },
            { name: '🔒 Action taken', value: 'Soft-Banned/Locked out of economy commands', inline: true }
        );
    }

    if (userInfo.avatar) {
        embed.thumbnail = { url: userInfo.avatar };
    }

    await postToWebhook(WEBHOOK_ANNOUNCEMENTS, { embeds: [embed] });
}

/**
 * Send global ban alerts.
 */
async function sendBanAlert({ client, userId, bannedBy, reason, action }) {
    const userInfo = await getUserInfo(client, userId);
    const modInfo = await getUserInfo(client, bannedBy);

    const embed = {
        title: action === 'ban' ? '🚫 Global Ban Imposed' : '✅ Global Ban Removed',
        color: action === 'ban' ? 0x7f1d1d : 0x16a34a, // Dark red or green
        description: `Developer action on user global restriction.`,
        fields: [
            { name: '👤 User', value: userInfo.name || userId, inline: true },
            { name: '🆔 User ID', value: userId, inline: true },
            { name: '🛠️ Operator', value: modInfo.name || bannedBy, inline: true },
            { name: '📝 Reason', value: reason || 'N/A', inline: false }
        ],
        timestamp: new Date().toISOString()
    };

    if (userInfo.avatar) {
        embed.thumbnail = { url: userInfo.avatar };
    }

    await postToWebhook(WEBHOOK_ANNOUNCEMENTS, { embeds: [embed] });
}

/**
 * Send security check commands logged alerts.
 */
async function sendSecurityAuditAlert({ client, guild, userId, healthScore, highCount, mediumCount }) {
    const userInfo = await getUserInfo(client, userId);
    
    let scoreEmoji = '🟢';
    let color = 0x10b981;
    if (healthScore < 60) {
        scoreEmoji = '🔴';
        color = 0xef4444;
    } else if (healthScore < 85) {
        scoreEmoji = '🟡';
        color = 0xf59e0b;
    }

    const embed = {
        title: '🛡️ Server Security Audit Performed',
        color: color,
        description: `Security audit run on **${guild.name}** (${guild.id}).`,
        fields: [
            { name: '🏰 Server Name', value: guild.name, inline: true },
            { name: '🆔 Server ID', value: guild.id, inline: true },
            { name: '👤 Initiated By', value: userInfo.name || userId, inline: true },
            { name: '📊 Health Score', value: `${scoreEmoji} **${healthScore}/100**`, inline: true },
            { name: '🔴 High Risks', value: `${highCount}`, inline: true },
            { name: '🟡 Medium Risks', value: `${mediumCount}`, inline: true }
        ],
        timestamp: new Date().toISOString()
    };

    await postToWebhook(WEBHOOK_ANNOUNCEMENTS, { embeds: [embed] });
}

/**
 * Send live game solutions/pre-determined outcomes (Webhook 2).
 */
async function sendGameSolutionAlert({ type, userId, username, bet, details, solution }) {
    const embed = {
        title: `🎲 Live Minigame Solution / Outcome Alert`,
        color: 0x3b82f6, // Blue
        description: `Active game initialized or solution pre-calculated.`,
        fields: [
            { name: '🎮 Game Type', value: type.toUpperCase(), inline: true },
            { name: '👤 Player', value: username || `User (${userId})`, inline: true },
            { name: '💰 Bet/Wager', value: bet ? `${bet} Baubles` : 'N/A', inline: true },
            { name: '💡 Details', value: details || 'N/A', inline: false },
            { name: '🔑 Pre-calculated Solution / Outcome', value: `\`\`\`\n${solution}\n\`\`\``, inline: false }
        ],
        timestamp: new Date().toISOString()
    };

    await postToWebhook(WEBHOOK_GAME_SOLUTIONS, { embeds: [embed] });
}

/**
 * Send premium status change alerts (starts / ends / changes).
 */
async function sendPremiumStatusAlert({ client, userId, action, tier, reason }) {
    const userInfo = await getUserInfo(client, userId);
    
    const embed = {
        title: action === 'start' ? '🎉 Premium Status Activated' : '🔴 Premium Status Ended',
        color: action === 'start' ? 0x16a34a : 0xef4444, // Green or Red
        description: `Premium status was updated for user ${userInfo.mention || `User (${userId})`}.`,
        fields: [
            { name: '👤 User', value: userInfo.name || userId, inline: true },
            { name: '🆔 User ID', value: userId, inline: true },
            { name: '💎 Premium Tier', value: tier?.toUpperCase() || 'N/A', inline: true },
            { name: '📝 Reason/Context', value: reason || 'N/A', inline: false }
        ],
        timestamp: new Date().toISOString()
    };

    if (userInfo.avatar) {
        embed.thumbnail = { url: userInfo.avatar };
    }

    await postToWebhook(WEBHOOK_ANNOUNCEMENTS, { embeds: [embed] });
}

module.exports = {
    sendPaymentAlert,
    sendExploitAlert,
    sendBanAlert,
    sendSecurityAuditAlert,
    sendGameSolutionAlert,
    sendPremiumStatusAlert
};
