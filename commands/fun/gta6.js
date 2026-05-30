const { EmbedBuilder } = require('discord.js');

module.exports = {
    category: 'fun',
    name: 'gta6',
    data: { name: 'gta6' },
    aliases: ['gtavi', 'gta'],
    description: 'When is GTA 6 coming out?!',

    async execute(interaction) {
        return interaction.reply({ content: 'This command is prefix only! Use `-gta6`', ephemeral: true });
    },

    async executePrefix(message, args) {
        // GTA 6 is planned for Fall 2025 on consoles. PC is typically 1-2 years later.
        const consoleReleaseDate = new Date('2025-11-01T00:00:00Z');
        const pcReleaseDate = new Date('2027-11-01T00:00:00Z'); // Pain.
        const now = new Date();
        
        let countdownStr = '';
        
        const consoleDiff = consoleReleaseDate.getTime() - now.getTime();
        const pcDiff = pcReleaseDate.getTime() - now.getTime();
        
        if (consoleDiff > 0) {
            const consoleTimestamp = Math.floor(consoleReleaseDate.getTime() / 1000);
            const pcTimestamp = Math.floor(pcReleaseDate.getTime() / 1000);
            countdownStr = `🎮 **Console Release (PS5/Xbox Series X):**\n<t:${consoleTimestamp}:R> (<t:${consoleTimestamp}:F>)\n\n` + 
                           `🖥️ **PC Release (Estimate):**\n<t:${pcTimestamp}:R> (<t:${pcTimestamp}:F>)\n*Time to start saving up for the RTX 6090...*`;
        } else if (pcDiff > 0) {
            const pcTimestamp = Math.floor(pcReleaseDate.getTime() / 1000);
            countdownStr = `🎮 **Console Release:** IT'S OUT! GO PLAY IT!\n\n` + 
                           `🖥️ **PC Release:**\n<t:${pcTimestamp}:R> (<t:${pcTimestamp}:F>)\n*PC Master Race is currently crying in the corner...*`;
        } else {
            countdownStr = `🚨 **WAIT! IT'S FULLY OUT?!** GO CHECK OUTSIDE (or inside)!`;
        }

        const funnyQuotes = [
            "We got a GTA 6 Discord command before GTA 6 on PC.",
            "My great-grandchildren will love playing this game.",
            "I'm putting myself in a cryogenic freeze until release.",
            "Rockstar is still milking GTA 5 Online Shark Cards as we speak.",
            "I've literally aged 40 years since the first trailer.",
            "We got AI writing our code before GTA 6.",
            "I'm going to apply for a mortgage and retire by the time this drops.",
            "Console players get to beta test for 2 years before PC gets it.",
            "Time to spend $2000 on a new GPU just to run it at 30fps."
        ];

        const randomQuote = funnyQuotes[Math.floor(Math.random() * funnyQuotes.length)];

        const embed = new EmbedBuilder()
            .setColor(0xff00ff)
            .setTitle('🌴 GTA VI Release Status 🌴')
            .setDescription(`${countdownStr}\n\n**"${randomQuote}"**`)
            .setImage('https://media1.tenor.com/m/3O72u56oYwUAAAAC/gta-6-gta-vi.gif')
            .setFooter({ text: 'Subject to Rockstar delays™', iconURL: message.author.displayAvatarURL() });

        await message.reply({ embeds: [embed] });
    }
};
