const { EmbedBuilder } = require('discord.js');
const GlobalEconomy = require('../../models/GlobalEconomy');
const Bauble = require('../../models/baubleSchema');
const { parseAmount } = require('../../utils/economyEngine');

module.exports = {
    name: 'taxfund',
    category: 'economy',
    description: 'Manage the accumulated tax fund. Owner only.',
    // Missing data.name so it will be skipped from slash commands? 
    // Wait, let's add a dummy data so index.js loads it, but we won't implement the slash execute.
    data: { name: 'taxfund' },
    
    async executePrefix(message, args) {
        if (!message.client.application) await message.client.application.fetch();
        const owner = message.client.application.owner;
        // Check if user is the bot owner (either directly or as part of a team)
        const isOwner = (owner && owner.id === message.author.id) || 
                       (owner && owner.members && owner.members.has(message.author.id)) ||
                       message.author.id === '805007574193405952'; // Direct owner ID check
        
        if (!isOwner) {
            return message.reply(`❌ Only the bot owner can access the Tax Fund! (Your ID: ${message.author.id})`);
        }

        let globalEco = await GlobalEconomy.findOne();
        if (!globalEco) {
            return message.reply("Global economy data not found.");
        }

        const fundAmount = globalEco.taxFund || 0;

        // Command sub-actions
        const action = args[0]?.toLowerCase();

        if (action === 'withdraw') {
            const amountStr = args[1];
            if (!amountStr) return message.reply("Specify an amount to withdraw (or 'all').");

            let amountToWithdraw = parseAmount(amountStr);
            if (amountStr === 'all') amountToWithdraw = fundAmount;

            if (isNaN(amountToWithdraw) || amountToWithdraw <= 0) {
                return message.reply("Invalid amount.");
            }

            if (amountToWithdraw > fundAmount) {
                return message.reply(`Not enough in the fund. Current fund: **${fundAmount.toLocaleString()}** Baubles.`);
            }

            // Deduct from fund
            globalEco.taxFund -= amountToWithdraw;
            await globalEco.save();

            // Give to owner
            let ownerBauble = await Bauble.findOne({ userId: message.author.id });
            if (!ownerBauble) {
                ownerBauble = new Bauble({ userId: message.author.id, baubles: 0 });
            }
            ownerBauble.baubles += amountToWithdraw;
            await ownerBauble.save();

            const embed = new EmbedBuilder()
                .setColor(0x4ade80)
                .setTitle('🏦 Tax Fund Withdrawal')
                .setDescription(`Successfully withdrew **${amountToWithdraw.toLocaleString()}** Baubles from the Tax Fund!`)
                .addFields(
                    { name: 'Remaining Fund', value: `${globalEco.taxFund.toLocaleString()} Baubles`, inline: true },
                    { name: 'Your New Balance', value: `${ownerBauble.baubles.toLocaleString()} Baubles`, inline: true }
                )
                .setTimestamp();
            
            return message.reply({ embeds: [embed] });
        }

        if (action === 'burn') {
            const amountStr = args[1];
            if (!amountStr) return message.reply("Specify an amount to permanently burn (or 'all').");

            let amountToBurn = parseAmount(amountStr);
            if (amountStr === 'all') amountToBurn = fundAmount;

            if (isNaN(amountToBurn) || amountToBurn <= 0) {
                return message.reply("Invalid amount.");
            }

            if (amountToBurn > fundAmount) {
                return message.reply(`Not enough in the fund. Current fund: **${fundAmount.toLocaleString()}** Baubles.`);
            }

            // Deduct from fund permanently
            globalEco.taxFund -= amountToBurn;
            await globalEco.save();

            const embed = new EmbedBuilder()
                .setColor(0xf87171)
                .setTitle('🔥 Tax Fund Burn')
                .setDescription(`Successfully burned **${amountToBurn.toLocaleString()}** Baubles from the Tax Fund! This money is gone forever.`)
                .addFields(
                    { name: 'Remaining Fund', value: `${globalEco.taxFund.toLocaleString()} Baubles`, inline: true }
                )
                .setTimestamp();
            
            return message.reply({ embeds: [embed] });
        }

        // Default view
        const embed = new EmbedBuilder()
            .setColor(0xf59e0b)
            .setTitle('🏦 Federal Tax Fund')
            .setDescription(`All collected wealth taxes are stored here.`)
            .addFields(
                { name: 'Current Balance', value: `**${fundAmount.toLocaleString()}** Baubles`, inline: false }
            )
            .setFooter({ text: "Use '-taxfund withdraw <amount>' or '-taxfund burn <amount>'" })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }
};
