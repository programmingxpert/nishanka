/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Bauble = require('../../models/baubleSchema');

module.exports = {
    category: 'economy',
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('Flip a coin to gamble your baubles (heads, tails, or draw).')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('The amount of Baubles to gamble.')
                .setRequired(true)
                .setMinValue(1)
        )
        .addStringOption(option =>
            option.setName('side')
                .setDescription('Choose heads, tails, or a sideways draw.')
                .setRequired(true)
                .addChoices(
                    { name: 'Heads (49.95% win, 2x)', value: 'heads' },
                    { name: 'Tails (49.95% win, 2x)', value: 'tails' },
                    { name: 'Draw / Sideways (0.1% win, 2x)', value: 'draw' }
                )
        ),

    async execute(interaction) {
        const userId = interaction.user.id;
        const amount = interaction.options.getInteger('amount');
        const side = interaction.options.getString('side').toLowerCase();

        await runCoinflip({
            userId,
            amount,
            side,
            interaction,
            isSlash: true
        });
    },

    async executePrefix(message, args) {
        const userId = message.author.id;
        
        let sideArg = (args[0] || '').toLowerCase();
        let amountArg = args[1];

        // Handle both orders: prefix <amount> <side> or prefix <side> <amount>
        if (isNaN(parseInt(sideArg)) && !isNaN(parseInt(amountArg))) {
            // sideArg is first, amountArg is second
        } else if (!isNaN(parseInt(sideArg)) && isNaN(parseInt(amountArg))) {
            // amountArg is first, sideArg is second
            amountArg = args[0];
            sideArg = args[1] || '';
        } else {
            // Fallback: amountArg is first, sideArg is second
            amountArg = args[0];
            sideArg = args[1] || '';
        }

        const amount = parseInt(amountArg);
        if (isNaN(amount) || amount <= 0) {
            return message.reply('❌ Please provide a valid amount of Baubles to gamble.');
        }

        let side = sideArg.toLowerCase();
        if (side === 'h' || side === 'head') side = 'heads';
        else if (side === 't' || side === 'tail') side = 'tails';
        else if (side === 'd' || side === 'draw' || side === 'side' || side === 'sideways' || side === 'upright') side = 'draw';
        
        if (side !== 'heads' && side !== 'tails' && side !== 'draw') {
            return message.reply('❌ Please choose a valid side: `heads`, `tails`, or `draw`.');
        }

        await runCoinflip({
            userId,
            amount,
            side,
            message,
            isSlash: false
        });
    }
};

async function runCoinflip({ userId, amount, side, interaction, message, isSlash }) {
    let replyMsg;
    try {
        // Find or create user bauble data
        let baubleData = await Bauble.findOne({ userId });
        if (!baubleData) {
            baubleData = new Bauble({ userId, baubles: 0 });
            await baubleData.save();
        }

        if (baubleData.baubles < amount) {
            const errorMsg = `❌ You only have **${baubleData.baubles}** Baubles, you cannot gamble **${amount}**.`;
            if (isSlash) {
                return interaction.reply({ content: errorMsg, ephemeral: true });
            } else {
                return message.reply(errorMsg);
            }
        }

        // Deduct bet amount immediately
        baubleData.baubles -= amount;
        await baubleData.save();

        // 1. Send the spinning/flipping embed
        const initialEmbed = new EmbedBuilder()
            .setColor(0x7c6cf0) // Primary color
            .setTitle('🪙 Coinflip')
            .setDescription('Flipping the coin... 🔄')
            .addFields(
                { name: 'Bet Amount', value: `${amount} Baubles`, inline: true },
                { name: 'Your Guess', value: side.toUpperCase(), inline: true }
            )
            .setFooter({ text: 'The coin is spinning in the air...' });

        if (isSlash) {
            await interaction.reply({ embeds: [initialEmbed] });
        } else {
            replyMsg = await message.reply({ embeds: [initialEmbed] });
        }

        // Wait 1.5 seconds for dramatic effect
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Determine outcome:
        // Draw (sideways) has 0.1% chance (0.001)
        // Heads has 49.95% chance (0.4995)
        // Tails has 49.95% chance (0.4995)
        const rand = Math.random();
        let outcome;
        if (rand < 0.001) {
            outcome = 'draw';
        } else if (rand < 0.5005) { // 0.001 + 0.4995 = 0.5005
            outcome = 'heads';
        } else {
            outcome = 'tails';
        }

        // Calculate win/loss
        const didWin = (side === outcome);
        let winnings = 0;
        if (didWin) {
            winnings = amount * 2;
        }

        // Refetch/reload baubleData to prevent race conditions during the setTimeout
        baubleData = await Bauble.findOne({ userId });
        if (didWin) {
            baubleData.baubles += winnings;
        }
        await baubleData.save();

        // Create the final embed
        const finalEmbed = new EmbedBuilder()
            .setTimestamp();

        if (didWin) {
            finalEmbed.setColor(0x4ade80); // Success/Green
            if (outcome === 'draw') {
                finalEmbed.setTitle('🏆 UNBELIEVABLE DRAW!')
                    .setDescription(`🪙 The coin landed perfectly **sideways/upright**!\nYou guessed the **0.1% chance** draw correctly! Absolutely insane luck!`);
            } else {
                finalEmbed.setTitle('🎉 YOU WON!')
                    .setDescription(`🪙 The coin landed on **${outcome.toUpperCase()}**!\nYou guessed correctly!`);
            }
            finalEmbed.addFields(
                { name: '💰 Bet', value: `${amount} Baubles`, inline: true },
                { name: '📈 Winnings', value: `+${winnings} Baubles`, inline: true },
                { name: '🪙 New Balance', value: `${baubleData.baubles} Baubles`, inline: true }
            );
            finalEmbed.setFooter({ text: 'Luck is on your side today! ✨' });
        } else {
            finalEmbed.setColor(0xf87171); // Red/Failure
            if (outcome === 'draw') {
                finalEmbed.setTitle('💔 Coin Stood Upright!')
                    .setDescription(`🪙 The coin landed perfectly **sideways/upright** (0.1% chance)!\nYou guessed **${side.toUpperCase()}** and got nothing.`);
            } else {
                finalEmbed.setTitle('💔 You Lost...')
                    .setDescription(`🪙 The coin landed on **${outcome.toUpperCase()}**!\nYou guessed **${side.toUpperCase()}** and got nothing.`);
            }
            finalEmbed.addFields(
                { name: '💰 Bet', value: `${amount} Baubles`, inline: true },
                { name: '📉 Loss', value: `-${amount} Baubles`, inline: true },
                { name: '🪙 New Balance', value: `${baubleData.baubles} Baubles`, inline: true }
            );
            finalEmbed.setFooter({ text: 'Better luck next time... 🍀' });
        }

        if (isSlash) {
            await interaction.editReply({ embeds: [finalEmbed] });
        } else {
            await replyMsg.edit({ embeds: [finalEmbed] });
        }

    } catch (error) {
        console.error('Error running coinflip command:', error);
        const errorMsg = '❌ Something went wrong while flipping the coin. Please try again later.';
        if (isSlash) {
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({ content: errorMsg, embeds: [] }).catch(() => {});
            } else {
                await interaction.reply({ content: errorMsg, ephemeral: true }).catch(() => {});
            }
        } else {
            if (replyMsg) {
                await replyMsg.edit({ content: errorMsg, embeds: [] }).catch(() => {});
            } else {
                await message.reply(errorMsg).catch(() => {});
            }
        }
    }
}
