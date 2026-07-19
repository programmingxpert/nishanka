const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Vote   = require('../../models/voteSchema');
const Bauble = require('../../models/baubleSchema');
const { getVoteXpStatus } = require('../../utils/voteManager');

const BOT_ID   = '1357752347643609198';
const VOTE_URL = `https://top.gg/bot/${BOT_ID}/vote`;
const REVIEW_URL = `https://top.gg/bot/${BOT_ID}#reviews`;
const TOPGG_URL  = `https://top.gg/bot/${BOT_ID}`;

// ── Reward table (per vote number mod milestones) ────────────────────────────
function computeRewards(voteData) {
    const streak  = (voteData?.voteStreak || 0) + 1; // will be this after increment
    const total   = (voteData?.totalVotes || 0) + 1;

    let baubles = 400; // base
    let bonusItems = [];
    let title = null;

    // Streak multiplier (caps at 5×)
    const streakMult = Math.min(1 + (streak - 1) * 0.25, 5);
    baubles = Math.round(baubles * streakMult);

    // Milestone item drops (very rare — only on specific milestones)
    if (streak === 7)   { bonusItems.push({ itemId: 'luck_potion',   quantity: 1 }); }
    if (streak === 30)  { bonusItems.push({ itemId: 'mystery_box',   quantity: 2 }); title = '🗳️ Loyal Voter'; }
    if (streak === 100) { bonusItems.push({ itemId: 'paintbrush',    quantity: 1 }); title = '🏅 Top Supporter'; }
    if (total === 1)    { bonusItems.push({ itemId: 'mystery_box',   quantity: 1 }); } // first ever vote gift
    if (total % 50 === 0 && total > 0) { bonusItems.push({ itemId: 'mystery_box', quantity: 1 }); baubles += 500; }

    return { baubles, bonusItems, title, streakMult, streak };
}

module.exports = {
    category: 'utility',
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('vote')
        .setDescription('Vote for Nishanka on Top.gg to claim Baubles and 3x/2x Leveling XP Perks!'),

    async execute(interaction) {
        await showVoteCard(interaction, interaction.user, false);
    },

    async executePrefix(message) {
        await showVoteCard(message, message.author, true);
    }
};

async function showVoteCard(context, user, isPrefix = false) {
    const userId = user.id;

    const [voteData, baubleData] = await Promise.all([
        Vote.findOne({ userId }),
        Bauble.findOne({ userId }),
    ]);

    const now       = Date.now();
    const canVote   = !voteData?.nextVoteAt || now >= new Date(voteData.nextVoteAt).getTime();
    const nextVote  = voteData?.nextVoteAt  ? Math.floor(new Date(voteData.nextVoteAt).getTime() / 1000) : null;
    const streak    = voteData?.voteStreak  ?? 0;
    const total     = voteData?.totalVotes  ?? 0;
    const balance   = baubleData?.baubles   ?? 0;
    const reviewed  = voteData?.reviewConfirmed ?? false;

    // ── Vote XP Status ────────────────────────────────────────────────────────
    const voteStatus = await getVoteXpStatus(userId);
    let xpStatusLine = `⚡ **Leveling Perks:** **3× Chat XP** (first 20 mins) & **2× Chat XP** (next 3h 40m)`;
    if (voteStatus.active) {
        const emoji = voteStatus.phase === '3x' ? '🔥' : '⚡';
        xpStatusLine += `\n${emoji} **Active Boost:** **${voteStatus.phase} XP** (Ends <t:${voteStatus.phaseExpiryEpoch}:R>)`;
    }

    // Compute what next vote would give (preview)
    const preview   = computeRewards(voteData ?? { voteStreak: 0, totalVotes: 0 });

    // ── Status embed ─────────────────────────────────────────────────────
    const color = canVote ? 0x43B581 : 0xF59E0B;
    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(canVote ? '🗳️ Ready to Vote!' : '⏳ Already Voted!')
        .setThumbnail(`https://cdn.discordapp.com/avatars/${context.client.user.id}/${context.client.user.avatar}.png`)
        .addFields(
            {
                name: '📊 Your Vote Stats',
                value: [
                    `🔥 **Current Streak:** ${streak} vote${streak !== 1 ? 's' : ''}`,
                    `🏆 **Total Votes:**    ${total}`,
                    `💰 **Your Balance:**   ${balance.toLocaleString()} Baubles`,
                ].join('\n'),
                inline: false,
            },
            {
                name: canVote ? '🎁 Your Next Vote Rewards & Perks' : '🎁 Next Vote Rewards & Perks (Preview)',
                value: [
                    `💸 **+${preview.baubles.toLocaleString()} Baubles** _(${preview.streakMult.toFixed(2)}× streak bonus)_`,
                    xpStatusLine,
                    preview.bonusItems.length
                        ? `📦 **Bonus:** ${preview.bonusItems.map(i => `${i.quantity}× ${i.itemId.replace(/_/g, ' ')}`).join(', ')}`
                        : `📦 **Bonus items:** unlock at streak milestones (7, 30, 100)`,
                    canVote ? '' : `\n⏰ **Vote resets:** <t:${nextVote}:R>`,
                ].filter(Boolean).join('\n'),
                inline: false,
            }
        )
        .setFooter({ text: 'Voting takes 5 seconds and gives 3x/2x leveling XP perks ✨' });

    if (!canVote && nextVote) {
        embed.setDescription(`You've already voted! Come back <t:${nextVote}:R> to keep your streak and XP boosts alive.`);
    } else {
        embed.setDescription(`Voting is **free**, takes **5 seconds**, and unlocks **3× & 2× Leveling XP Perks**!\nEvery vote means a lot — genuinely. 💙`);
    }

    // ── Buttons ──────────────────────────────────────────────────────────
    const voteBtn = new ButtonBuilder()
        .setLabel(canVote ? '🗳️ Vote Now on Top.gg' : '🗳️ Vote Again Soon')
        .setURL(VOTE_URL)
        .setStyle(ButtonStyle.Link)
        .setDisabled(!canVote);

    const reviewBtn = new ButtonBuilder()
        .setLabel(reviewed ? '✅ Review Left — Thank you!' : '⭐ Leave a Review')
        .setURL(REVIEW_URL)
        .setStyle(ButtonStyle.Link);

    const topggBtn = new ButtonBuilder()
        .setLabel('🔗 Bot Page')
        .setURL(TOPGG_URL)
        .setStyle(ButtonStyle.Link);

    const confirmReviewBtn = new ButtonBuilder()
        .setCustomId('confirm_review')
        .setLabel('✅ I just left a review!')
        .setStyle(ButtonStyle.Success)
        .setDisabled(reviewed);

    const row1 = new ActionRowBuilder().addComponents(voteBtn, reviewBtn, topggBtn);
    const row2 = new ActionRowBuilder().addComponents(confirmReviewBtn);

    let reply;
    if (isPrefix) {
        reply = await context.reply({ embeds: [embed], components: [row1, row2] });
    } else {
        reply = await context.reply({ embeds: [embed], components: [row1, row2], ephemeral: true });
    }

    // ── Collect review confirmation button ────────────────────────────────
    try {
        const btnInteraction = await reply.awaitMessageComponent({
            filter: i => i.customId === 'confirm_review' && i.user.id === userId,
            time: 120_000,
        });

        if (!reviewed) {
            await Vote.findOneAndUpdate(
                { userId },
                { $set: { reviewConfirmed: true, reviewPrompted: true } },
                { upsert: true }
            );

            // Small thank-you reward for leaving a review
            await Bauble.findOneAndUpdate(
                { userId },
                { $inc: { baubles: 250 } },
                { upsert: true }
            );

            await btnInteraction.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x43B581)
                        .setTitle('⭐ Thank you for the review!')
                        .setDescription('You\'ve been rewarded **+250 Baubles** as a tiny thank-you from us.\n\nReviews help real people discover whether Nishanka is worth inviting — and yours just helped someone make that call. We appreciate it more than you know 💙')
                        .setFooter({ text: 'Nishanka • indie-made, community-driven' }),
                ],
                components: [],
            });
        } else {
            await btnInteraction.update({ content: 'You\'ve already been credited for your review! 💙', components: [] });
        }
    } catch (_) {
        // Timed out waiting for button — that's fine
    }
}
