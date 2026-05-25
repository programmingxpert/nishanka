/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Bauble = require('../../models/baubleSchema');

const WORDS = [
    'javascript', 'moderation', 'giveaway', 'economy', 'discord', 
    'developer', 'community', 'antigravity', 'adventure', 'championship', 
    'programming', 'database', 'keyboard', 'beautiful', 'universe',
    'algorithm', 'technology', 'network', 'cybersecurity', 'blockchain',
    'encryption', 'processor', 'server', 'application', 'hardware',
    'software', 'compiler', 'variable', 'function', 'coefficient',
    'dashboard', 'automation', 'astronomy', 'chocolate',
    'dinosaur', 'matrix', 'sanctuary', 'glimmering', 'baubles'
];

const activeGames = new Set();

function scrambleWord(word) {
    let scrambled = word;
    while (scrambled === word) {
        scrambled = word.split('').sort(() => Math.random() - 0.5).join('');
    }
    return scrambled;
}

module.exports = {
    category: 'fun',
    cooldown: 10,
    data: new SlashCommandBuilder()
        .setName('scramble')
        .setDescription('Unscramble the letters to find the word and win Baubles!'),

    async execute(interaction) {
        const channelId = interaction.channelId;
        if (activeGames.has(channelId)) {
            return interaction.reply({ content: '⚠️ A Scrambled Word Race is already running in this channel!', ephemeral: true });
        }

        activeGames.add(channelId);
        const word = WORDS[Math.floor(Math.random() * WORDS.length)];
        const scrambled = scrambleWord(word);
        const reward = Math.floor(Math.random() * 1001) + 500; // 500-1500 Baubles

        const gameEmbed = new EmbedBuilder()
            .setColor(0x7c6cf0)
            .setTitle('🔤 SCRAMBLED WORD RACE')
            .setDescription(`Unscramble the letters to find the correct word!\n\n# **\`${scrambled.toUpperCase()}\`**\n\n**Length:** ${word.length} letters\n**Reward:** **${reward.toLocaleString()} Baubles**\n\n*Type the unscrambled word in this channel! You have 45 seconds.*`)
            .setFooter({ text: 'First correct guess wins!' })
            .setTimestamp();

        await interaction.reply({ embeds: [gameEmbed] });

        const filter = m => {
            if (m.author.bot) return false;
            return m.content.trim().toLowerCase() === word.toLowerCase();
        };

        const collector = interaction.channel.createMessageCollector({
            filter,
            max: 1,
            time: 45_000
        });

        collector.on('collect', async m => {
            // Reward the winner
            try {
                let baubleData = await Bauble.findOne({ userId: m.author.id });
                if (!baubleData) {
                    baubleData = new Bauble({ userId: m.author.id, baubles: 0 });
                }
                baubleData.baubles += reward;
                await baubleData.save();

                const winEmbed = new EmbedBuilder()
                    .setColor(0x2ecc71)
                    .setTitle('🎉 CORRECT UNSCRAMBLE!')
                    .setDescription(`Congratulations to **${m.author.username}** for unscrambling the word!\n\n• **Scrambled:** \`${scrambled.toUpperCase()}\`\n• **Word:** **${word.toUpperCase()}**\n• **Reward:** **${reward.toLocaleString()} Baubles**`)
                    .setThumbnail(m.author.displayAvatarURL({ dynamic: true }))
                    .setTimestamp();

                await m.reply({ embeds: [winEmbed] });
            } catch (err) {
                console.error(err);
            }
        });

        collector.on('end', async (collected) => {
            activeGames.delete(channelId);
            if (collected.size === 0) {
                const timeoutEmbed = new EmbedBuilder()
                    .setColor(0xe74c3c)
                    .setTitle('⏰ TIME\'S UP!')
                    .setDescription(`Nobody was able to unscramble the word in time!\n\n• **Scrambled:** \`${scrambled.toUpperCase()}\`\n• **Correct Word was:** **${word.toUpperCase()}**`)
                    .setTimestamp();

                await interaction.followUp({ embeds: [timeoutEmbed] });
            }
        });
    },

    async executePrefix(message, args) {
        const channelId = message.channel.id;
        if (activeGames.has(channelId)) {
            return message.reply('⚠️ A Scrambled Word Race is already running in this channel!');
        }

        activeGames.add(channelId);
        const word = WORDS[Math.floor(Math.random() * WORDS.length)];
        const scrambled = scrambleWord(word);
        const reward = Math.floor(Math.random() * 1001) + 500; // 500-1500 Baubles

        const gameEmbed = new EmbedBuilder()
            .setColor(0x7c6cf0)
            .setTitle('🔤 SCRAMBLED WORD RACE')
            .setDescription(`Unscramble the letters to find the correct word!\n\n# **\`${scrambled.toUpperCase()}\`**\n\n**Length:** ${word.length} letters\n**Reward:** **${reward.toLocaleString()} Baubles**\n\n*Type the unscrambled word in this channel! You have 45 seconds.*`)
            .setFooter({ text: 'First correct guess wins!' })
            .setTimestamp();

        await message.reply({ embeds: [gameEmbed] });

        const filter = m => {
            if (m.author.bot) return false;
            return m.content.trim().toLowerCase() === word.toLowerCase();
        };

        const collector = message.channel.createMessageCollector({
            filter,
            max: 1,
            time: 45_000
        });

        collector.on('collect', async m => {
            // Reward the winner
            try {
                let baubleData = await Bauble.findOne({ userId: m.author.id });
                if (!baubleData) {
                    baubleData = new Bauble({ userId: m.author.id, baubles: 0 });
                }
                baubleData.baubles += reward;
                await baubleData.save();

                const winEmbed = new EmbedBuilder()
                    .setColor(0x2ecc71)
                    .setTitle('🎉 CORRECT UNSCRAMBLE!')
                    .setDescription(`Congratulations to **${m.author.username}** for unscrambling the word!\n\n• **Scrambled:** \`${scrambled.toUpperCase()}\`\n• **Word:** **${word.toUpperCase()}**\n• **Reward:** **${reward.toLocaleString()} Baubles**`)
                    .setThumbnail(m.author.displayAvatarURL({ dynamic: true }))
                    .setTimestamp();

                await m.reply({ embeds: [winEmbed] });
            } catch (err) {
                console.error(err);
            }
        });

        collector.on('end', async (collected) => {
            activeGames.delete(channelId);
            if (collected.size === 0) {
                const timeoutEmbed = new EmbedBuilder()
                    .setColor(0xe74c3c)
                    .setTitle('⏰ TIME\'S UP!')
                    .setDescription(`Nobody was able to unscramble the word in time!\n\n• **Scrambled:** \`${scrambled.toUpperCase()}\`\n• **Correct Word was:** **${word.toUpperCase()}**`)
                    .setTimestamp();

                await message.reply({ embeds: [timeoutEmbed] });
            }
        });
    }
};
