const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Bauble = require('../../models/baubleSchema');

const FLAGS = {
    'us': ['united states', 'us', 'usa', 'america', 'united states of america'],
    'gb': ['united kingdom', 'uk', 'britain', 'great britain', 'england'],
    'ca': ['canada'],
    'au': ['australia'],
    'in': ['india'],
    'de': ['germany'],
    'fr': ['france'],
    'jp': ['japan'],
    'it': ['italy'],
    'es': ['spain'],
    'br': ['brazil'],
    'mx': ['mexico'],
    'ru': ['russia'],
    'cn': ['china'],
    'kr': ['south korea', 'korea'],
    'za': ['south africa'],
    'ar': ['argentina'],
    'eg': ['egypt'],
    'ng': ['nigeria'],
    'nz': ['new zealand'],
    'se': ['sweden'],
    'no': ['norway'],
    'dk': ['denmark'],
    'fi': ['finland'],
    'nl': ['netherlands', 'holland'],
    'ch': ['switzerland'],
    'pl': ['poland'],
    'tr': ['turkey', 'turkiye'],
    'gr': ['greece'],
    'th': ['thailand'],
    'vn': ['vietnam'],
    'id': ['indonesia'],
    'my': ['malaysia'],
    'sg': ['singapore'],
    'ph': ['philippines'],
    'pk': ['pakistan'],
    'bd': ['bangladesh'],
    'ir': ['iran'],
    'iq': ['iraq'],
    'sa': ['saudi arabia'],
    'ae': ['uae', 'united arab emirates'],
    'il': ['israel'],
    'cl': ['chile'],
    'co': ['colombia'],
    'pe': ['peru'],
    've': ['venezuela'],
    'cu': ['cuba'],
    'jm': ['jamaica'],
    'ma': ['morocco'],
    'ke': ['kenya']
};

const activeGames = new Set();
const delay = (ms) => new Promise(res => setTimeout(res, ms));

async function runFlagGame(initialMessageOrInteraction, channel) {
    const totalRounds = 5;
    const scores = new Map(); // userId -> { name: string, points: number }
    const flagEntries = Object.entries(FLAGS);
    
    const startEmbed = new EmbedBuilder()
        .setColor(0x7c6cf0)
        .setTitle('🌍 GUESS THE FLAG: STARTED!')
        .setDescription(`Get ready! There will be **${totalRounds}** rounds.\nName the country that belongs to the flag faster than your opponents to earn points!\n\nThe first round starts in 5 seconds...`);
        
    if (initialMessageOrInteraction.reply) {
        await initialMessageOrInteraction.reply({ embeds: [startEmbed] });
    }

    // copy to avoid duplicate flags in same game
    let availableFlags = [...flagEntries];

    for (let round = 1; round <= totalRounds; round++) {
        await delay(5000);
        
        if (availableFlags.length === 0) availableFlags = [...flagEntries];
        
        const randomIndex = Math.floor(Math.random() * availableFlags.length);
        const [countryCode, validAnswers] = availableFlags[randomIndex];
        availableFlags.splice(randomIndex, 1); // remove so it doesn't repeat
        
        const flagUrl = `https://flagcdn.com/w320/${countryCode}.png`;
        
        const roundEmbed = new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle(`🔄 Round ${round}/${totalRounds}`)
            .setDescription(`Which country does this flag belong to?\n\n*First to type the country name correctly wins the round! (30 seconds)*`)
            .setImage(flagUrl);
            
        await channel.send({ embeds: [roundEmbed] });
        
        const filter = m => {
            if (m.author.bot) return false;
            const content = m.content.trim().toLowerCase();
            return validAnswers.includes(content);
        };

        try {
            const collected = await channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });
            const winner = collected.first();
            
            const uId = winner.author.id;
            if (!scores.has(uId)) {
                scores.set(uId, { name: winner.author.username, points: 0 });
            }
            scores.get(uId).points += 1;
            
            // Format the primary country name (capitalize first letter of words)
            const primaryName = validAnswers[0].replace(/\b\w/g, l => l.toUpperCase());
            
            const winEmbed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setDescription(`🎉 **${winner.author.username}** correctly guessed **${primaryName}** first! (+1 point)`)
                .setThumbnail(flagUrl);
            await channel.send({ embeds: [winEmbed] });
            
        } catch (err) {
            const primaryName = validAnswers[0].replace(/\b\w/g, l => l.toUpperCase());
            const timeoutEmbed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setDescription(`⏰ Time's up! The country was **${primaryName}**.`)
                .setThumbnail(flagUrl);
            await channel.send({ embeds: [timeoutEmbed] });
        }
        
        // Between rounds scoreboard
        if (round < totalRounds) {
            if (scores.size > 0) {
                const sortedScores = Array.from(scores.entries()).sort((a, b) => b[1].points - a[1].points);
                let boardText = sortedScores.map((s, idx) => `**${idx + 1}.** ${s[1].name} — ${s[1].points} pts`).join('\n');
                
                const boardEmbed = new EmbedBuilder()
                    .setColor(0xf1c40f)
                    .setTitle('📊 Current Standings')
                    .setDescription(boardText)
                    .setFooter({ text: 'Next round starting soon...' });
                await channel.send({ embeds: [boardEmbed] });
            } else {
                await channel.send({ content: '*Next round starting in 5 seconds...*' });
            }
        }
    }
    
    activeGames.delete(channel.id);
    
    if (scores.size === 0) {
        return channel.send({ content: '🏁 The game has ended! Nobody scored any points.' });
    }
    
    const sortedScores = Array.from(scores.entries()).sort((a, b) => b[1].points - a[1].points);
    let finalText = '';
    
    for (const [idx, [uId, data]] of sortedScores.entries()) {
        const reward = data.points * 25;
        finalText += `**${idx + 1}.** ${data.name} — ${data.points} pts (+**${reward.toLocaleString()}** Baubles)\n`;
        
        try {
            let baubleData = await Bauble.findOne({ userId: uId });
            if (!baubleData) {
                baubleData = new Bauble({ userId: uId, baubles: 0 });
            }
            baubleData.baubles += reward;
            await baubleData.save();
        } catch(e) {
            console.error('Error saving baubles for flag winner:', e);
        }
    }
    
    const finalEmbed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle('🏆 GUESS THE FLAG: FINAL RESULTS')
        .setDescription(finalText);
    await channel.send({ embeds: [finalEmbed] });
}

module.exports = {
    category: 'fun',
    cooldown: 10,
    data: new SlashCommandBuilder()
        .setName('guesstheflag')
        .setDescription('Play a 5-round Guess the Flag race and win Baubles!'),

    async execute(interaction) {
        const channelId = interaction.channelId;
        if (activeGames.has(channelId)) {
            return interaction.reply({ content: '⚠️ A Guess the Flag race is already running in this channel!', ephemeral: true });
        }

        activeGames.add(channelId);
        runFlagGame(interaction, interaction.channel).catch(err => {
            console.error(err);
            activeGames.delete(channelId);
        });
    },

    async executePrefix(message, args) {
        const channelId = message.channel.id;
        if (activeGames.has(channelId)) {
            return message.reply('⚠️ A Guess the Flag race is already running in this channel!');
        }

        activeGames.add(channelId);
        runFlagGame(message, message.channel).catch(err => {
            console.error(err);
            activeGames.delete(channelId);
        });
    }
};
