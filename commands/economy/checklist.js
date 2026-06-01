/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const Bauble = require('../../models/baubleSchema');

function isToday(date) {
    if (!date) return false;
    const now = new Date();
    return date.getFullYear() === now.getFullYear() &&
           date.getMonth() === now.getMonth() &&
           date.getDate() === now.getDate();
}

function checkTasks(baubleData) {
    const daily = isToday(baubleData.dailyLastClaimed);
    const work = isToday(baubleData.dailyWorkLastCompleted);
    const game = isToday(baubleData.dailyGameLastCompleted);
    const gamble = isToday(baubleData.dailyGambleLastCompleted);
    const claimed = isToday(baubleData.dailyTasksClaimedAt);
    
    let completedCount = 0;
    if (daily) completedCount++;
    if (work) completedCount++;
    if (game) completedCount++;
    if (gamble) completedCount++;
    
    return {
        daily,
        work,
        game,
        gamble,
        claimed,
        completedCount,
        allCompleted: completedCount === 4
    };
}

function getProgressBar(completedCount, total = 4) {
    const filledChar = '🟩';
    const emptyChar = '⬜';
    const percentage = Math.round((completedCount / total) * 100);
    
    let bar = '';
    for (let i = 0; i < total; i++) {
        if (i < completedCount) {
            bar += filledChar;
        } else {
            bar += emptyChar;
        }
    }
    return `${bar} **${percentage}%**`;
}

function buildChecklistEmbed(status, baubleData) {
    const embed = new EmbedBuilder()
        .setTitle('📋  DAILY TASKS CHECKLIST')
        .setDescription(`Complete the following tasks every day to earn a bonus reward!\n\n**Reward:** 💰 **2,000 Baubles** & 📦 **1x Mystery Box**`)
        .addFields(
            { name: `🪙  Daily Claim (/daily)`, value: status.daily ? '✅ **Completed**' : '⬜ *Not Completed*', inline: true },
            { name: `💼  Work a Shift (/work)`, value: status.work ? '✅ **Completed**' : '⬜ *Not Completed*', inline: true },
            { name: `\u200b`, value: `\u200b`, inline: true }, // Alignment spacer
            { name: `🧩  Trivia Game`, value: status.game ? '✅ **Completed**' : '⬜ *Not Completed*\n*(Play `/scramble`, `/emojidecode`, or `/wordbomb`)*', inline: true },
            { name: `🎰  Gambling Game`, value: status.gamble ? '✅ **Completed**' : '⬜ *Not Completed*\n*(Play `/slots`, `/gamble`, `/coinflip`, or `/mines`)*', inline: true },
            { name: `\u200b`, value: `\u200b`, inline: true }, // Alignment spacer
            { name: '📊  Progress', value: getProgressBar(status.completedCount), inline: false }
        )
        .setTimestamp();

    if (status.claimed) {
        embed.setColor(0x2ecc71) // Green
             .addFields({ name: '🎁  Checklist Status', value: '🎉 **All claimed!** You have already claimed today\'s checklist reward. Come back tomorrow!' });
    } else if (status.allCompleted) {
        embed.setColor(0xfbbf24) // Gold
             .addFields({ name: '🎁  Checklist Status', value: '✨ **Ready to claim!** Click the button below to claim your reward!' });
    } else {
        embed.setColor(0x7c6cf0) // Purple
             .addFields({ name: '🎁  Checklist Status', value: `⏳ **In progress.** Complete all tasks to unlock the reward. (${status.completedCount}/4 completed)` });
    }

    return embed;
}

function buildChecklistComponents(status) {
    const claimBtn = new ButtonBuilder()
        .setCustomId('claim_checklist')
        .setEmoji('🎁');

    if (status.claimed) {
        claimBtn.setLabel('Claimed Today')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true);
    } else if (!status.allCompleted) {
        claimBtn.setLabel('Tasks Incomplete')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true);
    } else {
        claimBtn.setLabel('Claim Checklist Reward')
            .setStyle(ButtonStyle.Success)
            .setDisabled(false);
    }

    const row = new ActionRowBuilder().addComponents(claimBtn);
    return [row];
}

async function claimReward(baubleData) {
    baubleData.baubles = (baubleData.baubles || 0) + 2000;
    if (!baubleData.inventory) baubleData.inventory = [];
    const mysteryBox = baubleData.inventory.find(item => item.itemId === 'mystery_box');
    if (mysteryBox) {
        mysteryBox.quantity += 1;
    } else {
        baubleData.inventory.push({ itemId: 'mystery_box', quantity: 1 });
    }
    baubleData.dailyTasksClaimedAt = new Date();
    await baubleData.save();
}

module.exports = {
    category: 'economy',
    data: new SlashCommandBuilder()
        .setName('checklist')
        .setDescription('Daily tasks')
        .addStringOption(option =>
            option.setName('action')
                .setDescription('Action to perform')
                .setRequired(false)
                .addChoices(
                    { name: 'View status', value: 'view' },
                    { name: 'Claim reward', value: 'claim' }
                )
        ),

    async execute(interaction) {
        try {
            const userId = interaction.user.id;
            const action = interaction.options.getString('action') || 'view';

            let baubleData = await Bauble.findOne({ userId });
            if (!baubleData) {
                baubleData = new Bauble({ userId, baubles: 0 });
                await baubleData.save();
            }

            let status = checkTasks(baubleData);

            if (action === 'claim') {
                if (status.claimed) {
                    return interaction.reply({ content: '❌ You have already claimed today\'s checklist reward!', ephemeral: true });
                }
                if (!status.allCompleted) {
                    return interaction.reply({ content: '❌ You have not completed all daily tasks yet! Play some games and complete your daily check-in.', ephemeral: true });
                }

                await claimReward(baubleData);
                
                const successEmbed = new EmbedBuilder()
                    .setColor(0x2ecc71)
                    .setTitle('🎉  CHECKLIST REWARD CLAIMED!')
                    .setDescription(`Congratulations, <@${userId}>! You completed all daily tasks!\n\n**Rewards added to your account:**\n💰 **+2,000 Baubles**\n📦 **+1 Mystery Box**`)
                    .addFields(
                        { name: '🪙 New Balance', value: `\`${baubleData.baubles.toLocaleString()} Baubles\``, inline: true },
                        { name: '💼 Inventory', value: `Use \`/inventory\` or \`/use mystery_box\` to open it!`, inline: true }
                    )
                    .setTimestamp();

                return interaction.reply({ embeds: [successEmbed] });
            }

            // Normal view flow
            const embed = buildChecklistEmbed(status, baubleData);
            const components = buildChecklistComponents(status);

            const initialMsg = await interaction.reply({ embeds: [embed], components, withResponse: true });

            if (status.allCompleted && !status.claimed) {
                const filter = i => {
                    if (i.user.id !== userId) {
                        i.reply({ content: '❌ This checklist session is not yours!', ephemeral: true });
                        return false;
                    }
                    return true;
                };

                const collector = initialMsg.createMessageComponentCollector({
                    filter,
                    componentType: ComponentType.Button,
                    time: 60000
                });

                collector.on('collect', async (i) => {
                    await i.deferUpdate();
                    collector.stop('claimed');

                    // Refetch
                    baubleData = await Bauble.findOne({ userId });
                    status = checkTasks(baubleData);

                    if (status.claimed) {
                        return i.followUp({ content: '❌ You have already claimed today\'s checklist reward!', ephemeral: true });
                    }
                    if (!status.allCompleted) {
                        return i.followUp({ content: '❌ Tasks are not complete!', ephemeral: true });
                    }

                    await claimReward(baubleData);
                    status = checkTasks(baubleData);

                    const successEmbed = new EmbedBuilder()
                        .setColor(0x2ecc71)
                        .setTitle('🎉  CHECKLIST REWARD CLAIMED!')
                        .setDescription(`Congratulations! You completed all daily tasks!\n\n**Rewards added to your account:**\n💰 **+2,000 Baubles**\n📦 **+1 Mystery Box**`)
                        .addFields(
                            { name: '🪙 New Balance', value: `\`${baubleData.baubles.toLocaleString()} Baubles\``, inline: true },
                            { name: '💼 Inventory', value: `Use \`/inventory\` or \`/use mystery_box\` to open it!`, inline: true }
                        )
                        .setTimestamp();

                    const updatedEmbed = buildChecklistEmbed(status, baubleData);
                    const disabledComponents = buildChecklistComponents(status);

                    await initialMsg.edit({ embeds: [updatedEmbed], components: disabledComponents });
                    await i.followUp({ embeds: [successEmbed] });
                });

                collector.on('end', async (collected, reason) => {
                    if (reason === 'time') {
                        // Disable buttons on timeout
                        const disabledComponents = buildChecklistComponents(status);
                        await initialMsg.edit({ components: disabledComponents }).catch(() => {});
                    }
                });
            }

        } catch (error) {
            console.error('Error in checklist slash command:', error);
            await interaction.reply({ content: '❌ Something went wrong while checking/claiming checklist.', ephemeral: true });
        }
    },

    async executePrefix(message, args) {
        try {
            const userId = message.author.id;
            const isClaimAction = args[0] && args[0].toLowerCase() === 'claim';

            let baubleData = await Bauble.findOne({ userId });
            if (!baubleData) {
                baubleData = new Bauble({ userId, baubles: 0 });
                await baubleData.save();
            }

            let status = checkTasks(baubleData);

            if (isClaimAction) {
                if (status.claimed) {
                    return message.reply('❌ You have already claimed today\'s checklist reward!');
                }
                if (!status.allCompleted) {
                    return message.reply('❌ You have not completed all daily tasks yet! Play some games and complete your daily check-in.');
                }

                await claimReward(baubleData);

                const successEmbed = new EmbedBuilder()
                    .setColor(0x2ecc71)
                    .setTitle('🎉  CHECKLIST REWARD CLAIMED!')
                    .setDescription(`Congratulations, <@${userId}>! You completed all daily tasks!\n\n**Rewards added to your account:**\n💰 **+2,000 Baubles**\n📦 **+1 Mystery Box**`)
                    .addFields(
                        { name: '🪙 New Balance', value: `\`${baubleData.baubles.toLocaleString()} Baubles\``, inline: true },
                        { name: '💼 Inventory', value: `Use \`-inventory\` or \`-use mystery_box\` to open it!`, inline: true }
                    )
                    .setTimestamp();

                return message.channel.send({ embeds: [successEmbed] });
            }

            // Normal view flow
            const embed = buildChecklistEmbed(status, baubleData);
            const components = buildChecklistComponents(status);

            const initialMsg = await message.channel.send({ embeds: [embed], components });

            if (status.allCompleted && !status.claimed) {
                const filter = i => {
                    if (i.user.id !== userId) {
                        i.reply({ content: '❌ This checklist session is not yours!', ephemeral: true });
                        return false;
                    }
                    return true;
                };

                const collector = initialMsg.createMessageComponentCollector({
                    filter,
                    componentType: ComponentType.Button,
                    time: 60000
                });

                collector.on('collect', async (i) => {
                    await i.deferUpdate();
                    collector.stop('claimed');

                    // Refetch
                    baubleData = await Bauble.findOne({ userId });
                    status = checkTasks(baubleData);

                    if (status.claimed) {
                        return i.followUp({ content: '❌ You have already claimed today\'s checklist reward!', ephemeral: true });
                    }
                    if (!status.allCompleted) {
                        return i.followUp({ content: '❌ Tasks are not complete!', ephemeral: true });
                    }

                    await claimReward(baubleData);
                    status = checkTasks(baubleData);

                    const successEmbed = new EmbedBuilder()
                        .setColor(0x2ecc71)
                        .setTitle('🎉  CHECKLIST REWARD CLAIMED!')
                        .setDescription(`Congratulations! You completed all daily tasks!\n\n**Rewards added to your account:**\n💰 **+2,000 Baubles**\n📦 **+1 Mystery Box**`)
                        .addFields(
                            { name: '🪙 New Balance', value: `\`${baubleData.baubles.toLocaleString()} Baubles\``, inline: true },
                            { name: '💼 Inventory', value: `Use \`-inventory\` or \`-use mystery_box\` to open it!`, inline: true }
                        )
                        .setTimestamp();

                    const updatedEmbed = buildChecklistEmbed(status, baubleData);
                    const disabledComponents = buildChecklistComponents(status);

                    await initialMsg.edit({ embeds: [updatedEmbed], components: disabledComponents });
                    await i.followUp({ embeds: [successEmbed] });
                });

                collector.on('end', async (collected, reason) => {
                    if (reason === 'time') {
                        const disabledComponents = buildChecklistComponents(status);
                        await initialMsg.edit({ components: disabledComponents }).catch(() => {});
                    }
                });
            }

        } catch (error) {
            console.error('Error in checklist prefix command:', error);
            await message.reply('❌ Something went wrong while checking/claiming checklist.');
        }
    }
};
