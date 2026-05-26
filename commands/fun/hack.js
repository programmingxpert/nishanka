/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const secretFiles = [
    "1.2TB of raw anime feet pics",
    "Tax_Evasion_Draft_2026.pdf (actually just a drawing of a cat)",
    "Apology letter draft to 5th grade teacher for eating glue",
    "Roblox girlfriend chat logs (turns out she is a 45-year-old trucker named Frank)",
    "Folder: 'homework' (contains actual homework, how boring)",
    "2,400 bookmarked high-definition images of Shrek",
    "Search history: 'why does my discord bot ignore me', 'is water wet'",
    "Detailed fan fiction about the server admin",
    "Audio recording of target singing opera in the shower",
    "Active subscription receipt for 'OnlyClowns Gold Edition'"
];

const passwords = [
    "gachalife4ever",
    "ilovegacha123",
    "hunter2",
    "admin12345",
    "password_is_password",
    "skibidi_sigma_1",
    "minecraft_steve_gf",
    "dwaynetherockjohnson"
];

const profits = [
    "-$14.50 (We accidentally paid their overdue gas bill)",
    "$0.02 (Memes are cheap)",
    "3.5 Dogecoins",
    "A single sticky lint roller",
    "$4.20 (Sold their smart toothbrush data)",
    "A half-eaten subway coupon",
    "1x Shiny nugget (worthless)",
    "$0.00 (They are completely broke)"
];

const securityRatings = [
    "🥔 Potato level",
    "🍼 Crying baby defense",
    "📝 Sticky note on monitor",
    "🔒 NASA level (but they fell for free Nitro)",
    "🧄 Smelly socks firewall",
    "🤡 Certified clown security"
];

const vectors = {
    phish: {
        name: "Nitro Phishing",
        steps: [
            { pct: 0, text: "Initializing..." },
            { pct: 20, text: "Sending fake Discord Nitro 1 Year link..." },
            { pct: 40, text: "Target clicked the link! (Instant bait)" },
            { pct: 60, text: "Bypassing 2FA and hijacking Discord token..." },
            { pct: 80, text: "Accessing personal directories..." },
            { pct: 100, text: "Encryption complete. Generating report..." }
        ]
    },
    brute: {
        name: "Brute Force",
        steps: [
            { pct: 0, text: "Loading wordlists..." },
            { pct: 20, text: "Brute-forcing passwords: admin123, hunter2, animefeet..." },
            { pct: 40, text: "Dictionary match found for key: \"gachalife4ever\"" },
            { pct: 60, text: "Logging into email, cloud storage, and social accounts..." },
            { pct: 80, text: "Dumping chat logs and search history..." },
            { pct: 100, text: "Extraction complete. Generating report..." }
        ]
    },
    iot: {
        name: "IoT Exploit",
        steps: [
            { pct: 0, text: "Scanning local network..." },
            { pct: 20, text: "Found vulnerable smart toothbrush and smart toaster..." },
            { pct: 40, text: "Injecting malware into target's smart toothbrush..." },
            { pct: 60, text: "Overclocking smart toaster to maximum brownness..." },
            { pct: 80, text: "Playing 'Never Gonna Give You Up' on smart fridge..." },
            { pct: 100, text: "Network compromised. Generating report..." }
        ]
    },
    ddos: {
        name: "Cat DDoS",
        steps: [
            { pct: 0, text: "Bootstrapping botnet..." },
            { pct: 20, text: "Commandeering 10,000 smart fridges and toasters..." },
            { pct: 40, text: "Flooding home router with 150GB/s of spinning cat GIFs..." },
            { pct: 60, text: "Target's ping reached 9,500ms..." },
            { pct: 80, text: "Home router is literally emitting smoke..." },
            { pct: 100, text: "Connection severed. Generating report..." }
        ]
    }
};

function renderTerminal(targetName, vectorName, pct, text, status = "ACTIVE") {
    const totalBars = 10;
    const filledBars = Math.round((pct / 100) * totalBars);
    const emptyBars = totalBars - filledBars;
    const barStr = "█".repeat(filledBars) + "░".repeat(emptyBars);

    return "```ini\n" +
           `[ SYSTEM STATS ]\n` +
           `Target : [ ${targetName} ]\n` +
           `Status : [ ${status} ]\n` +
           `Vector : [ ${vectorName} ]\n` +
           `----------------------------------\n` +
           `[${barStr}] ${pct}% | ${text}\n` +
           "```";
}

async function runHackAnimation(editTarget, targetUser, vectorId, isSlash = true) {
    const vector = vectors[vectorId];
    
    // Remove components and draw initial frame
    if (isSlash) {
        await editTarget.editReply({
            content: renderTerminal(targetUser.username, vector.name, 0, vector.steps[0].text),
            components: []
        });
    } else {
        await editTarget.edit({
            content: renderTerminal(targetUser.username, vector.name, 0, vector.steps[0].text),
            components: []
        });
    }

    for (let i = 1; i < vector.steps.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        const step = vector.steps[i];
        const status = step.pct === 100 ? "SUCCESS" : "ACTIVE";
        const terminalText = renderTerminal(targetUser.username, vector.name, step.pct, step.text, status);
        
        if (isSlash) {
            await editTarget.editReply({ content: terminalText });
        } else {
            await editTarget.edit({ content: terminalText });
        }
    }

    // Generate random hacker report
    const randomFile = secretFiles[Math.floor(Math.random() * secretFiles.length)];
    const randomPwd = passwords[Math.floor(Math.random() * passwords.length)].replace("[crush]", targetUser.username);
    const randomProfit = profits[Math.floor(Math.random() * profits.length)];
    const randomRating = securityRatings[Math.floor(Math.random() * securityRatings.length)];

    const embed = new EmbedBuilder()
        .setTitle('🟢 HACK SYSTEM OVERVIEW: COMPROMISED')
        .setColor(0x00FF00)
        .setThumbnail(targetUser.displayAvatarURL({ size: 128 }))
        .setDescription(`**${targetUser.username}** has been successfully compromised via **${vector.name}**!`)
        .addFields(
            { name: '📁 Compromised Files', value: `\`${randomFile}\`` },
            { name: '🔑 Leaked Password', value: `\`${randomPwd}\``, inline: true },
            { name: '💰 Profit / Loss', value: `\`${randomProfit}\``, inline: true },
            { name: '🛡️ Security Rating', value: `\`${randomRating}\``, inline: true }
        )
        .setFooter({ text: 'Nishanka Cybersec ©️' })
        .setTimestamp();

    if (isSlash) {
        await editTarget.followUp({ embeds: [embed] });
    } else {
        await editTarget.channel.send({ embeds: [embed] });
    }
}

module.exports = {
    category: 'fun',
    cooldown: 10,
    data: new SlashCommandBuilder()
        .setName('hack')
        .setDescription('Simulate an advanced interactive "hack" on a user!')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to hack (optional)')
                .setRequired(false)),

    async execute(interaction) {
        let targetUser = interaction.options.getUser('user') || interaction.user;

        if (targetUser.bot) {
            return interaction.reply({ content: '❌ You can’t hack a bot! They’re already in the system.', ephemeral: true });
        }

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('phish').setLabel('Nitro Phish').setStyle(ButtonStyle.Primary).setEmoji('💬'),
            new ButtonBuilder().setCustomId('brute').setLabel('Brute Force').setStyle(ButtonStyle.Secondary).setEmoji('🔨'),
            new ButtonBuilder().setCustomId('iot').setLabel('IoT Exploit').setStyle(ButtonStyle.Success).setEmoji('🔌'),
            new ButtonBuilder().setCustomId('ddos').setLabel('Cat DDoS').setStyle(ButtonStyle.Danger).setEmoji('🌊')
        );

        const response = await interaction.reply({
            content: `🖥️ **HACK TERMINAL v2.0**\nSelect a vector to initiate the hack on **${targetUser.username}**:`,
            components: [buttons],
            fetchReply: true
        });

        const filter = i => i.user.id === interaction.user.id;
        try {
            const confirmation = await response.awaitMessageComponent({ filter, time: 15000 });
            const vectorId = confirmation.customId;
            await confirmation.deferUpdate();
            await runHackAnimation(interaction, targetUser, vectorId, true);
        } catch (e) {
            // Timeout: choose a random vector
            const keys = Object.keys(vectors);
            const randomVector = keys[Math.floor(Math.random() * keys.length)];
            await runHackAnimation(interaction, targetUser, randomVector, true);
        }
    },

    async executePrefix(message, args) {
        let targetUser = message.mentions.users.first() || (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null) || message.author;

        if (targetUser.bot) {
            return message.reply('❌ You can’t hack a bot! They’re already in the system.');
        }

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('phish').setLabel('Nitro Phish').setStyle(ButtonStyle.Primary).setEmoji('💬'),
            new ButtonBuilder().setCustomId('brute').setLabel('Brute Force').setStyle(ButtonStyle.Secondary).setEmoji('🔨'),
            new ButtonBuilder().setCustomId('iot').setLabel('IoT Exploit').setStyle(ButtonStyle.Success).setEmoji('🔌'),
            new ButtonBuilder().setCustomId('ddos').setLabel('Cat DDoS').setStyle(ButtonStyle.Danger).setEmoji('🌊')
        );

        const response = await message.reply({
            content: `🖥️ **HACK TERMINAL v2.0**\nSelect a vector to initiate the hack on **${targetUser.username}**:`,
            components: [buttons]
        });

        const filter = i => i.user.id === message.author.id;
        try {
            const confirmation = await response.awaitMessageComponent({ filter, time: 15000 });
            const vectorId = confirmation.customId;
            await confirmation.deferUpdate();
            await runHackAnimation(response, targetUser, vectorId, false);
        } catch (e) {
            const keys = Object.keys(vectors);
            const randomVector = keys[Math.floor(Math.random() * keys.length)];
            await runHackAnimation(response, targetUser, randomVector, false);
        }
    }
};
