const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'gta6',
    category: 'fun',
    aliases: ['gtavi', 'gta'],
    
    async executePrefix(message, args) {
        // Fall 2027 estimated for PC release
        const releaseTimestamp = Math.floor(new Date('2027-10-01T00:00:00Z').getTime() / 1000);

        const jokes = [
            "We got the Nishanka Discord Bot before GTA 6 on PC.",
            "My great-grandchildren are going to love this game.",
            "Time left until Rockstar remembers PC players exist:",
            "I've been staring at this countdown since 2013.",
            "Warning: Copium levels exceeding maximum capacity.",
            "Maybe we'll get Half-Life 3 first?"
        ];

        const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];

        const embed = new EmbedBuilder()
            .setColor(0xff00ff) // Synthwave Vice City pink/purple
            .setTitle('🌴 Grand Theft Auto VI Release Status')
            .setDescription(`**${randomJoke}**\n\n⏳ **Estimated PC Release:**\n# <t:${releaseTimestamp}:R>\n\n📅 **Date:** <t:${releaseTimestamp}:F>\n\n*Note: This is based on the historical gap between Rockstar console and PC releases. Pray it doesn't get delayed again.*`)
            .setImage('https://media1.tenor.com/m/X6o2D49hE1AAAAAC/waiting-skeleton.gif')
            .setFooter({ text: 'Still waiting...', iconURL: 'https://i.imgur.com/2U5q6Zk.png' });

        await message.reply({ embeds: [embed] });
    }
};
