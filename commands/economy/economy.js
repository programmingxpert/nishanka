const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const GlobalEconomy = require('../../models/GlobalEconomy');
const EconomyMetrics = require('../../models/EconomyMetrics');
const { getGlobalMultiplier } = require('../../utils/economyEngine');

module.exports = {
    category: 'economy',
    aliases: ['eco', 'inflation', 'market'],
    data: new SlashCommandBuilder()
        .setName('economy')
        .setDescription('View the live status of the global bot economy and inflation rates.'),

    async execute(interaction) {
        if (interaction.deferReply) await interaction.deferReply();
        
        await this.handleEconomyCommand(interaction.user, interaction);
    },

    async executePrefix(message, args) {
        await this.handleEconomyCommand(message.author, message);
    },

    async handleEconomyCommand(user, respondable) {
        try {
            const globalEco = await GlobalEconomy.findOne();
            if (!globalEco) {
                const msg = '❌ The economy engine has not generated its first snapshot yet. Please check back later.';
                return respondable.editReply ? await respondable.editReply(msg) : await respondable.reply(msg);
            }

            const multiplier = globalEco.currentMultiplier || 1.0;
            const status = globalEco.marketStatus || '⚖️ Stable Market';
            const baublesInCirculation = globalEco.totalBaublesInCirculation || 0;
            const activeUsers = globalEco.activeUsersCount || 0;
            const lastUpdated = globalEco.lastCalculated ? Math.floor(globalEco.lastCalculated.getTime() / 1000) : null;

            // Fetch inflation data by comparing to the previous snapshot
            let inflationRateText = '0.00%';
            let inflationTrend = '➡️ Static';
            
            const snapshots = await EconomyMetrics.find().sort({ timestamp: -1 }).limit(2);
            if (snapshots.length === 2) {
                const currentTotal = snapshots[0].totalBaubles;
                const previousTotal = snapshots[1].totalBaubles;
                const inflationRate = ((currentTotal - previousTotal) / previousTotal) * 100;
                inflationRateText = `${inflationRate > 0 ? '+' : ''}${inflationRate.toFixed(2)}%`;
                
                if (inflationRate > 5) inflationTrend = '📈 Rapidly Inflating';
                else if (inflationRate > 0) inflationTrend = '↗️ Inflating';
                else if (inflationRate < -5) inflationTrend = '📉 Rapidly Deflating';
                else if (inflationRate < 0) inflationTrend = '↘️ Deflating';
            }

            const embed = new EmbedBuilder()
                .setColor(0x00AE86)
                .setTitle('🌐 Global Economy Status')
                .setDescription(
                    `Welcome to the Global Economy Dashboard! The economy is dynamic and reacts to how much money is currently in circulation.\n\n` +
                    `**Current Market Status:** \`${status}\``
                )
                .addFields(
                    { name: '📊 Economy Multiplier', value: `**${multiplier.toFixed(2)}x**\n*(Affects payouts from mini-games like Geoguesser, Wordbomb, etc.)*`, inline: true },
                    { name: '📈 Inflation Rate (24h)', value: `**${inflationRateText}** (${inflationTrend})`, inline: true },
                    { name: '\u200b', value: '\u200b', inline: false },
                    { name: '💰 Total Circulation', value: `${baublesInCirculation.toLocaleString()} Baubles`, inline: true },
                    { name: '👥 Active Accounts', value: `${activeUsers.toLocaleString()} Users`, inline: true },
                    { name: '\u200b', value: '\u200b', inline: false },
                    { 
                        name: '🛍️ How Does the Economy Work?', 
                        value: `The central bank automatically balances the money supply every day.\n` +
                               `• **When Inflation is High:** The global multiplier drops to slow down earnings, and **Shop Prices increase** to drain excess money.\n` +
                               `• **When Deflation happens:** The global multiplier rises to boost earnings, and **Shop Prices decrease** to encourage spending.` 
                    }
                );

            if (lastUpdated) {
                embed.setFooter({ text: 'Last Calculated' }).setTimestamp(globalEco.lastCalculated);
            }

            if (respondable.editReply) {
                await respondable.editReply({ embeds: [embed] });
            } else {
                await respondable.reply({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Error in economy command:', error);
            const msg = '❌ An error occurred while fetching economy data.';
            if (respondable.editReply) await respondable.editReply(msg);
            else await respondable.reply(msg);
        }
    }
};
