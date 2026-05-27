/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Family = require('../../models/familySchema');

module.exports = {
    category: 'fun',
    cooldown: 10,
    data: new SlashCommandBuilder()
        .setName('disown')
        .setDescription('Disown a child or emancipate yourself from a parent!')
        .addSubcommand(sub =>
            sub.setName('child')
                .setDescription('Disown one of your children')
                .addUserOption(opt => opt.setName('user').setDescription('The child to disown').setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('parent')
                .setDescription('Emancipate yourself / run away from a parent')
                .addUserOption(opt => opt.setName('user').setDescription('The parent to leave').setRequired(true))),

    async execute(interaction) {
        await interaction.deferReply();
        const type = interaction.options.getSubcommand();
        const target = interaction.options.getUser('user');
        const user = interaction.user;

        const { embed, error } = await performDisown(user, target, type);

        if (error) {
            return interaction.editReply({ content: `❌ ${error}` });
        }

        await interaction.editReply({ embeds: [embed] });
    },

    async executePrefix(message, args) {
        const type = args[0]?.toLowerCase();
        if (type !== 'child' && type !== 'parent') {
            return message.reply('❌ Please specify `child` or `parent`! Format: `-disown child @user` or `-disown parent @user`').catch(() => {});
        }

        const proposer = message.author;
        const target = message.mentions.users.first() 
            || (args[1] ? await message.client.users.fetch(args[1].replace(/[<@!>]/g, '')).catch(() => null) : null);

        if (!target) {
            return message.reply(`❌ Mention the ${type} you want to disown/leave!`).catch(() => {});
        }

        const msgIndicator = await message.reply('💔 Processing family split...');
        const { embed, error } = await performDisown(proposer, target, type);

        if (error) {
            return msgIndicator.edit({ content: `❌ ${error}` }).catch(() => {});
        }

        await msgIndicator.delete().catch(() => {});
        await message.reply({ embeds: [embed] });
    }
};

async function performDisown(user, target, type) {
    const userFamily = await Family.findOne({ userId: user.id });
    const targetFamily = await Family.findOne({ userId: target.id });

    if (!userFamily || !targetFamily) {
        return { error: "Family record not found." };
    }

    if (type === 'child') {
        if (!userFamily.children.includes(target.id)) {
            return { error: `**${target.username}** is not in your list of children!` };
        }

        userFamily.children = userFamily.children.filter(id => id !== target.id);
        targetFamily.parents = targetFamily.parents.filter(id => id !== user.id);
        await userFamily.save();
        await targetFamily.save();

        const embed = new EmbedBuilder()
            .setColor(0xf87171)
            .setTitle('💔 CHILD DISOWNED')
            .setDescription(`**${user.username}** has disowned **${target.username}** as their child! They are no longer part of your family.`)
            .setTimestamp();
        return { embed };
    } else {
        if (!userFamily.parents.includes(target.id)) {
            return { error: `**${target.username}** is not in your list of parents!` };
        }

        userFamily.parents = userFamily.parents.filter(id => id !== target.id);
        targetFamily.children = targetFamily.children.filter(id => id !== user.id);
        await userFamily.save();
        await targetFamily.save();

        const embed = new EmbedBuilder()
            .setColor(0xf87171)
            .setTitle('🕊️ EMANCIPATION EFFECTED')
            .setDescription(`**${user.username}** has run away and emancipated themselves from their parent, **${target.username}**!`)
            .setTimestamp();
        return { embed };
    }
}
