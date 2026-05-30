/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Bauble = require('../../models/baubleSchema');
const { checkCollections } = require('../../utils/items');

module.exports = {
    category: 'profile',
    aliases: ['titles'],
    data: new SlashCommandBuilder()
        .setName('title')
        .setDescription('Manage, equip, or clear your earned status titles.')
        .addStringOption(option =>
            option.setName('action')
                .setDescription('The action you want to perform')
                .setRequired(true)
                .addChoices(
                    { name: 'List unlocked titles', value: 'list' },
                    { name: 'Equip a title', value: 'equip' },
                    { name: 'Unequip active title', value: 'unequip' }
                ))
        .addStringOption(option =>
            option.setName('name')
                .setDescription('The title name to equip (only for equip action)')
                .setRequired(false)),

    async execute(interaction) {
        try {
            const userId = interaction.user.id;
            const action = interaction.options.getString('action');
            const titleName = interaction.options.getString('name');

            let baubleData = await Bauble.findOne({ userId });
            if (!baubleData) {
                baubleData = new Bauble({ userId });
                await baubleData.save();
            }

            // Sync/unlock any completed collections
            await checkCollections(baubleData);

            if (action === 'list') {
                const embed = buildListEmbed(baubleData, interaction.user);
                return interaction.reply({ embeds: [embed] });
            }

            if (action === 'unequip') {
                baubleData.activeTitle = null;
                await baubleData.save();
                return interaction.reply({ content: '🏷️ You have cleared your equipped title.' });
            }

            if (action === 'equip') {
                if (!titleName) {
                    return interaction.reply({ content: '❌ Please specify the name of the title to equip.', ephemeral: true });
                }
                const result = await equipTitle(baubleData, titleName);
                return interaction.reply({ content: result.msg, ephemeral: !result.success });
            }

        } catch (error) {
            console.error('Error in title execute:', error);
            await interaction.reply({ content: '❌ An error occurred while managing titles.', ephemeral: true });
        }
    },

    async executePrefix(message, args) {
        try {
            const userId = message.author.id;
            const action = args[0]?.toLowerCase() || 'list';

            let baubleData = await Bauble.findOne({ userId });
            if (!baubleData) {
                baubleData = new Bauble({ userId });
                await baubleData.save();
            }

            // Sync/unlock any completed collections
            await checkCollections(baubleData);

            if (action === 'list') {
                const embed = buildListEmbed(baubleData, message.author);
                return message.reply({ embeds: [embed] });
            }

            if (action === 'unequip' || action === 'clear') {
                baubleData.activeTitle = null;
                await baubleData.save();
                return message.reply('🏷️ You have cleared your equipped title.');
            }

            if (action === 'equip') {
                const titleName = args.slice(1).join(' ');
                if (!titleName) {
                    return message.reply('❌ Please specify the name of the title to equip. Example: `-title equip Duck Master`');
                }
                const result = await equipTitle(baubleData, titleName);
                return message.reply(result.msg);
            }

            // Fallback: assume they wanted to equip directly if typing something else
            const potentialTitle = args.join(' ');
            const result = await equipTitle(baubleData, potentialTitle);
            return message.reply(result.msg);

        } catch (error) {
            console.error('Error in title prefix:', error);
            await message.reply('❌ An error occurred while managing titles.');
        }
    }
};

function buildListEmbed(baubleData, user) {
    const unlocked = baubleData.titles || [];
    const active = baubleData.activeTitle;

    const listLines = unlocked.length > 0
        ? unlocked.map(title => title === active ? `✨ **${title}** *(Equipped)*` : `- ${title}`)
        : ['_You have not unlocked any titles yet._\n_Complete collections to unlock titles!_'];

    return new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle('🏷️ Unlocked Titles')
        .setDescription(`Active Title: ${active ? `\`[${active}]\`` : '*None*'}\n\n**Your Unlocked Titles:**\n` + listLines.join('\n'))
        .setFooter({ text: 'Use `/title action:equip name:<title>` or `-title equip <title>`' })
        .setTimestamp();
}

async function equipTitle(baubleData, titleName) {
    const unlocked = baubleData.titles || [];
    
    // Perform case-insensitive search
    const matchingTitle = unlocked.find(t => t.toLowerCase() === titleName.toLowerCase().trim());

    if (!matchingTitle) {
        return {
            success: false,
            msg: `❌ You do not own the title **"${titleName}"**. Check your unlocked titles with \`-title list\`.`
        };
    }

    baubleData.activeTitle = matchingTitle;
    await baubleData.save();

    return {
        success: true,
        msg: `🎉 Title equipped! You are now known as **${matchingTitle}** on your profile.`
    };
}
