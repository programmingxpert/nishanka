/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    category: 'fun',
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('deathbattle')
        .setDescription('Simulate a dramatic battle between two users!')
        .addUserOption(option =>
            option.setName('user1')
                .setDescription('The first combatant (default: you)')
                .setRequired(false))
        .addUserOption(option =>
            option.setName('user2')
                .setDescription('The second combatant')
                .setRequired(false)),

    async execute(interaction) {
        let user1 = interaction.options.getUser('user1') || interaction.user;
        let user2 = interaction.options.getUser('user2');

        if (!user2) {
            // Find a random user if user2 is not provided
            const members = await interaction.guild.members.fetch();
            const pool = members.filter(m => !m.user.bot && m.id !== user1.id);
            if (pool.size > 0) {
                user2 = pool.random().user;
            } else {
                return interaction.reply({ content: 'Could not find a second user to battle!', ephemeral: true });
            }
        }

        if (user1.id === user2.id) {
            return interaction.reply({ content: 'You can’t battle yourself! 😹', ephemeral: true });
        }

        const { embed } = this.generateBattle(user1, user2);
        await interaction.reply({ embeds: [embed] });
    },

    async executePrefix(message, args) {
        let user1 = message.mentions.users.at(0) || message.author;
        let user2 = message.mentions.users.at(1);

        if (!user2 && args.length > 0) {
            const u2ID = args[args.length - 1].replace(/[<@!>]/g, '');
            try {
                user2 = await message.client.users.fetch(u2ID);
            } catch (e) {}
        }

        if (!user2) {
             const members = await message.guild.members.fetch();
             const pool = members.filter(m => !m.user.bot && m.id !== user1.id);
             if (pool.size > 0) {
                 user2 = pool.random().user;
             } else {
                 return message.reply('Could not find a second user to battle!');
             }
        }

        if (user1.id === user2.id) return message.reply('You can’t battle yourself! 😹');

        const { embed } = this.generateBattle(user1, user2);
        await message.reply({ embeds: [embed] });
    },

    generateBattle(user1, user2) {
        const finishers = [
            "used a giant rubber duck!",
            "cast a spell of infinite boredom.",
            "tripped over an invisible banana peel.",
            "accidentally deleted the target's System32.",
            "summoned a legion of angry toddlers.",
            "hit them with a 10-hour loop of Baby Shark.",
            "threw a Nokia 3310 at their head.",
            "unleashed the power of anime and friendship!",
            "bored them to death with a 500-slide PowerPoint.",
            "sent a flurry of wet towels at their face.",
            "locked them out of their own account.",
            "told a joke so bad it actually caused physical damage."
        ];

        const winner = Math.random() > 0.5 ? user1 : user2;
        const loser = winner.id === user1.id ? user2 : user1;
        const finisher = finishers[Math.floor(Math.random() * finishers.length)];

        const embed = new EmbedBuilder()
            .setTitle('⚔️ DEATH BATTLE')
            .setColor(0xff1a1a)
            .setThumbnail(winner.displayAvatarURL({ dynamic: true }))
            .setDescription(`**${user1.username}** vs **${user2.username}**\n\n` +
                `The battle was fierce, sparks were flying, and the tension was high... until **${winner.username}** ${finisher}\n\n` +
                `🏆 **Winner:** ${winner.username}\n` +
                `💀 **Loser:** ~~${loser.username}~~`)
            .setFooter({ text: 'Nishanka ©️' })
            .setTimestamp();

        return { embed };
    }
};
