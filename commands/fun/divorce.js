/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Family = require('../../models/familySchema');

module.exports = {
    category: 'fun',
    cooldown: 10,
    data: new SlashCommandBuilder()
        .setName('divorce')
        .setDescription('Divorce your current spouse! 💔'),

    async execute(interaction) {
        await interaction.deferReply();
        const user = interaction.user;

        const { embed, error } = await performDivorce(user);

        if (error) {
            return interaction.editReply({ content: `❌ ${error}` });
        }

        await interaction.editReply({ embeds: [embed] });
    },

    async executePrefix(message, args) {
        const user = message.author;
        const msgIndicator = await message.reply('💔 Processing divorce...');
        const { embed, error } = await performDivorce(user);

        if (error) {
            return msgIndicator.edit({ content: `❌ ${error}` }).catch(() => {});
        }

        await msgIndicator.delete().catch(() => {});
        await message.reply({ embeds: [embed] });
    }
};

async function performDivorce(user) {
    const userFamily = await Family.findOne({ userId: user.id });
    if (!userFamily || !userFamily.spouseId) {
        return { error: "You are not married! Who are you trying to divorce, your imaginary spouse?" };
    }

    const exSpouseId = userFamily.spouseId;
    const exFamily = await Family.findOne({ userId: exSpouseId });

    userFamily.spouseId = null;
    userFamily.ringUsed = null;
    if (exFamily) {
        exFamily.spouseId = null;
        exFamily.ringUsed = null;
        await exFamily.save();
    }
    await userFamily.save();

    const embed = new EmbedBuilder()
        .setColor(0xf87171)
        .setTitle('💔 DIVORCE FINALIZED')
        .setDescription(`**${user.username}** and <@${exSpouseId}> are now officially divorced. The papers have been signed. The assets are split. It's over.`)
        .setTimestamp();

    return { embed };
}
