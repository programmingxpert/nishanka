/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Family = require('../../models/familySchema');
const { syncFamily } = require('../../utils/familySync');

module.exports = {
    category: 'fun',
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('family')
        .setDescription('View your family tree or someone else\'s family tree!')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user whose family tree you want to view (optional)')
                .setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply();
        const user = interaction.options.getUser('user') || interaction.user;

        const { embed, error } = await getFamilyEmbed(user);

        if (error) {
            return interaction.editReply({ content: `❌ ${error}` });
        }

        await interaction.editReply({ embeds: [embed] });
    },

    async executePrefix(message, args) {
        const user = message.mentions.users.first() 
            || (args[0] ? await message.client.users.fetch(args[0].replace(/[<@!>]/g, '')).catch(() => null) : null) 
            || message.author;

        const msgIndicator = await message.reply('👪 Fetching family data...');
        const { embed, error } = await getFamilyEmbed(user);

        if (error) {
            return msgIndicator.edit({ content: `❌ ${error}` }).catch(() => {});
        }

        await msgIndicator.delete().catch(() => {});
        await message.reply({ embeds: [embed] });
    }
};

async function getFamilyEmbed(user) {
    // Sync family data retroactively before building the embed
    await syncFamily(user.id);
    let familyData = await Family.findOne({ userId: user.id });

    // Find siblings
    let siblingIds = [];
    if (familyData.parents && familyData.parents.length > 0) {
        const siblingDocs = await Family.find({
            userId: { $ne: user.id },
            parents: { $in: familyData.parents }
        }).lean();
        siblingIds = siblingDocs.map(d => d.userId);
    }

    const embed = new EmbedBuilder()
        .setColor(0x7c6cf0)
        .setTitle(`👪 Family Tree of ${user.username}`)
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .setTimestamp()
        .setFooter({ text: 'Global Family Tree System | Nishanka' });

    // Spouse
    const spouseStr = familyData.spouseId ? `💍 <@${familyData.spouseId}>` : 'Single';
    embed.addFields({ name: 'Spouse', value: spouseStr, inline: false });

    // Parents
    const parentsStr = familyData.parents && familyData.parents.length > 0 
        ? familyData.parents.map(id => `🧓 <@${id}>`).join('\n') 
        : 'None';
    embed.addFields({ name: 'Parents', value: parentsStr, inline: true });

    // Siblings
    const siblingsStr = siblingIds.length > 0 
        ? siblingIds.map(id => `👤 <@${id}>`).join('\n') 
        : 'None';
    embed.addFields({ name: 'Siblings', value: siblingsStr, inline: true });

    // Children
    const childrenStr = familyData.children && familyData.children.length > 0 
        ? familyData.children.map(id => `👶 <@${id}>`).join('\n') 
        : 'None';
    embed.addFields({ name: 'Children', value: childrenStr, inline: false });

    return { embed };
}
