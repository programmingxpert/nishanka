/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    category: 'fun',
    cooldown: 10,
    data: new SlashCommandBuilder()
        .setName('hack')
        .setDescription('Simulate a "hack" on a user!')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to hack (optional)')
                .setRequired(false)),

    async execute(interaction) {
        let targetUser = interaction.options.getUser('user') || interaction.user;

        if (targetUser.bot) {
            return interaction.reply({ content: '❌ You can’t hack a bot! They’re already in the system.', ephemeral: true });
        }

        await interaction.deferReply();

        const steps = [
            `💻 Initiating hack on **${targetUser.username}**...`,
            `🔍 Finding IP address...`,
            `📡 IP found: \`192.168.1.1\` (*Wait, that's my router?*)`,
            `🔓 Bypassing 2FA...`,
            `📁 Accessing personal files...`,
            `😱 **1TB of "Secret Memes" found! DAMNNN**`,
            `💳 Selling credit card data to the dark web...`,
            `📩 Reporting the hack to Discord TOS...`,
            `✅ **Hack complete for ${targetUser.username}.**`
        ];

        let currentMessage = steps[0];
        await interaction.editReply(currentMessage);

        for (let i = 1; i < steps.length; i++) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            currentMessage = steps[i];
            await interaction.editReply(currentMessage);
        }

        const embed = new EmbedBuilder()
            .setTitle('🎯 Target Hacked')
            .setColor(0x00FF00)
            .setDescription(`**${targetUser.username}**'s data has been successfully compromised.`)
            .addFields(
                { name: '💰 Profit', value: '`$0.01` (Memes are cheap)', inline: true },
                { name: '🕵️ Status', value: '`Untraceable`', inline: true }
            )
            .setFooter({ text: 'Nishanka ©️' })
            .setTimestamp();

        await interaction.channel.send({ embeds: [embed] });
    },

    async executePrefix(message, args) {
        let targetUser = message.mentions.users.first() || (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null) || message.author;

        if (targetUser.bot) {
            return message.reply('❌ You can’t hack a bot! They’re already in the system.');
        }

        const initialMsg = await message.reply(`💻 Initiating hack on **${targetUser.username}**...`);

        const steps = [
            `🔍 Finding IP address...`,
            `📡 IP found: \`192.168.1.1\` (*Wait, that's my router?*)`,
            `🔓 Bypassing 2FA...`,
            `📁 Accessing personal files...`,
            `😱 **1TB of "Secret Memes" found!**`,
            `💳 Selling credit card data to the dark web...`,
            `📩 Reporting the hack to Discord TOS...`,
            `✅ **Hack complete for ${targetUser.username}.**`
        ];

        for (let i = 0; i < steps.length; i++) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            await initialMsg.edit(steps[i]);
        }

        const embed = new EmbedBuilder()
            .setTitle('🎯 Target Hacked')
            .setColor(0x00FF00)
            .setDescription(`**${targetUser.username}**'s data has been successfully compromised.`)
            .addFields(
                { name: '💰 Profit', value: '`$0.01` (Memes are cheap)', inline: true },
                { name: '🕵️ Status', value: '`Untraceable`', inline: true }
            )
            .setFooter({ text: 'Nishanka ©️' })
            .setTimestamp();

        await message.channel.send({ embeds: [embed] });
    }
};
