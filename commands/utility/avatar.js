/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    category: 'utility',
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Displays the avatar of a user.')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user to display the avatar of.')
                .setRequired(false)
        ),

    async execute(interaction) {
        const user = interaction.options.getUser('target') || interaction.user;
        const member = interaction.guild ? interaction.guild.members.cache.get(user.id) : null;

        const globalAvatarURL = user.displayAvatarURL({ dynamic: true, size: 4096 });
        const serverAvatarURL = member ? member.displayAvatarURL({ dynamic: true, size: 4096 }) : globalAvatarURL;

        const embeds = [];

        if (serverAvatarURL !== globalAvatarURL) {
            const serverEmbed = new EmbedBuilder()
                .setColor(0x3498db)
                .setTitle(`${user.username}'s Server Avatar`)
                .setImage(serverAvatarURL)
                .setDescription(`[Server Avatar URL](${serverAvatarURL})`)
                .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.member?.displayAvatarURL({ dynamic: true }) || interaction.user.displayAvatarURL({ dynamic: true }) })
                .setTimestamp();
            embeds.push(serverEmbed);

            const globalEmbed = new EmbedBuilder()
                .setColor(0x3498db)
                .setTitle(`${user.username}'s Global Avatar`)
                .setImage(globalAvatarURL)
                .setDescription(`[Global Avatar URL](${globalAvatarURL})`)
                .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.member?.displayAvatarURL({ dynamic: true }) || interaction.user.displayAvatarURL({ dynamic: true }) })
                .setTimestamp();
            embeds.push(globalEmbed);
        } else {
            const embed = new EmbedBuilder()
                .setColor(0x3498db)
                .setTitle(`${user.username}'s Avatar`)
                .setImage(globalAvatarURL)
                .setDescription(`[Avatar URL](${globalAvatarURL})`)
                .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.member?.displayAvatarURL({ dynamic: true }) || interaction.user.displayAvatarURL({ dynamic: true }) })
                .setTimestamp();
            embeds.push(embed);
        }

        await interaction.reply({ embeds: embeds });
    },

    async executePrefix(message, args) {
        let user;

        if (args.length > 0) {
            const userId = args[0].replace(/[<@!>]/g, ''); // Extract user ID from mention
            user = message.client.users.cache.get(userId) || message.mentions.users.first();

            if (!user) {
                return message.reply('❌ User not found.');
            }
        } else {
            user = message.author;
        }

        const member = message.guild ? message.guild.members.cache.get(user.id) : null;
        const globalAvatarURL = user.displayAvatarURL({ dynamic: true, size: 4096 });
        const serverAvatarURL = member ? member.displayAvatarURL({ dynamic: true, size: 4096 }) : globalAvatarURL;

        const embeds = [];

        if (serverAvatarURL !== globalAvatarURL) {
            const serverEmbed = new EmbedBuilder()
                .setColor(0x3498db)
                .setTitle(`${user.username}'s Server Avatar`)
                .setImage(serverAvatarURL)
                .setDescription(`[Server Avatar URL](${serverAvatarURL})`)
                .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.member?.displayAvatarURL({ dynamic: true }) || message.author.displayAvatarURL({ dynamic: true }) })
                .setTimestamp();
            embeds.push(serverEmbed);

            const globalEmbed = new EmbedBuilder()
                .setColor(0x3498db)
                .setTitle(`${user.username}'s Global Avatar`)
                .setImage(globalAvatarURL)
                .setDescription(`[Global Avatar URL](${globalAvatarURL})`)
                .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.member?.displayAvatarURL({ dynamic: true }) || message.author.displayAvatarURL({ dynamic: true }) })
                .setTimestamp();
            embeds.push(globalEmbed);
        } else {
            const embed = new EmbedBuilder()
                .setColor(0x3498db)
                .setTitle(`${user.username}'s Avatar`)
                .setImage(globalAvatarURL)
                .setDescription(`[Avatar URL](${globalAvatarURL})`)
                .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.member?.displayAvatarURL({ dynamic: true }) || message.author.displayAvatarURL({ dynamic: true }) })
                .setTimestamp();
            embeds.push(embed);
        }

        await message.channel.send({ embeds: embeds });
    }
};