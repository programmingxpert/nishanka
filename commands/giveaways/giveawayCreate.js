/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const ms = require('ms');
const Giveaway = require('../../models/Giveaway'); // Import the Giveaway model

module.exports = {
    category: 'giveaway',
    cooldown: 10,
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Create a giveaway!')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Creates a new giveaway.')
                .addStringOption(option =>
                    option.setName('duration')
                        .setDescription('The duration of the giveaway (e.g., 1h, 30m, 1d).')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('winners')
                        .setDescription('The number of winners for the giveaway.')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('prize')
                        .setDescription('The prize for the giveaway.')
                        .setRequired(true))
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('The channel to start the giveaway in.')
                        .setRequired(true))),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.MANAGE_GUILD)) {
            return interaction.reply({ content: 'You need to have the manage server permissions to use this command!', ephemeral: true });
        }

        if (interaction.options.getSubcommand() === 'create') {
            const giveawayChannel = interaction.options.getChannel('channel');
            const giveawayDuration = interaction.options.getString('duration');
            const giveawayWinnerCount = interaction.options.getInteger('winners');
            const giveawayPrize = interaction.options.getString('prize');

            if (!giveawayChannel.isTextBased()) {
                return interaction.reply({ content: 'Please provide a valid text channel!', ephemeral: true });
            }

            // Convert duration to milliseconds
            const msValue = ms(giveawayDuration);

            if (!msValue) {
                return interaction.reply({ content: 'Please provide a valid duration!', ephemeral: true });
            }

            if (giveawayWinnerCount < 1) {
                return interaction.reply({ content: 'Please provide a valid winner count!', ephemeral: true });
            }

            // Giveaway Embed
            const embed = new EmbedBuilder()
                .setColor(0x2f3136)
                .setTitle('🎉 New Giveaway! 🎉')
                .setDescription(`Prize: **${giveawayPrize}**\nReact with 🎉 to enter!`)
                .addFields(
                    { name: 'Duration:', value: giveawayDuration, inline: true },
                    { name: 'Hosted By:', value: `${interaction.user}`, inline: true },
                    { name: 'Winners:', value: `${giveawayWinnerCount}`, inline: true }
                )
                .setTimestamp(Date.now() + msValue)
                .setFooter({ text: 'Giveaway ends at' });

            try {
                const m = await giveawayChannel.send({ embeds: [embed] });
                await m.react('🎉');

                // Create Giveaway in the database
                const giveaway = new Giveaway({
                    messageId: m.id,
                    channelId: giveawayChannel.id,
                    guildId: interaction.guild.id,
                    prize: giveawayPrize,
                    winnerCount: giveawayWinnerCount,
                    endTime: new Date(Date.now() + msValue),
                    hostId: interaction.user.id
                });

                await giveaway.save(); // Save to the database

                interaction.reply({ content: `Giveaway started in ${giveawayChannel}!`, ephemeral: true });

                // Schedule the giveaway end (moved to its own function)
                scheduleGiveawayEnd(interaction.client, m.id, msValue, giveawayPrize, giveawayWinnerCount, giveawayChannel, interaction.user.id);

            } catch (error) {
                console.error('Error creating giveaway:', error);
                interaction.reply({ content: 'Failed to start the giveaway.  Check the console for details.', ephemeral: true });
            }
        }
    },
    async executePrefix(message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.MANAGE_GUILD)) {
            return message.reply('You need to have the manage server permissions to use this command!');
        }

        if (args[0] !== 'create') {
            return message.reply("Invalid giveaway command. Use `-giveaway create <channel> <duration> <winners> <prize>`.");
        }

        if (args.length < 5) {
            return message.reply("Invalid giveaway create command. Use `-giveaway create <channel> <duration> <winners> <prize>`");
        }

        // Get the giveaway information
        const giveawayChannel = message.mentions.channels.first();
        if (!giveawayChannel) {
            return message.reply('Please provide a valid channel!');
        }

        const giveawayDuration = args[2];
        if (!giveawayDuration) {
            return message.reply('Please provide a valid duration!');
        }

        const giveawayWinnerCount = args[3];
        if (!giveawayWinnerCount) {
            return message.reply('Please provide a valid winner count!');
        }

        const giveawayPrize = args.slice(4).join(' ');
        if (!giveawayPrize) {
            return message.reply('Please provide a valid prize!');
        }

        // Convert duration to milliseconds
        const msValue = ms(giveawayDuration);

        if (!msValue) {
            return message.reply('Please provide a valid duration!');
        }

        if (giveawayWinnerCount < 1) {
            return message.reply('Please provide a valid winner count!');
        }

        // Giveaway Embed
        const embed = new EmbedBuilder()
            .setColor(0x2f3136)
            .setTitle('🎉 New Giveaway! 🎉')
            .setDescription(`Prize: **${giveawayPrize}**\nReact with 🎉 to enter!`)
            .addFields(
                { name: 'Duration:', value: giveawayDuration, inline: true },
                { name: 'Hosted By:', value: `${message.author}`, inline: true },
                { name: 'Winners:', value: `${giveawayWinnerCount}`, inline: true }
            )
            .setTimestamp(Date.now() + msValue)
            .setFooter({ text: 'Giveaway ends at' });

        try {
            const m = await giveawayChannel.send({ embeds: [embed] });
            await m.react('🎉');

            // Create Giveaway in the database
            const giveaway = new Giveaway({
                messageId: m.id,
                channelId: giveawayChannel.id,
                guildId: message.guild.id,
                prize: giveawayPrize,
                winnerCount: giveawayWinnerCount,
                endTime: new Date(Date.now() + msValue),
                hostId: message.author.id
            });

            await giveaway.save(); // Save to the database

            message.reply(`Giveaway started in ${giveawayChannel}!`);

            // Schedule the giveaway end
            scheduleGiveawayEnd(message.client, m.id, msValue, giveawayPrize, giveawayWinnerCount, giveawayChannel, message.author.id);

        } catch (error) {
            console.error('Error creating giveaway:', error);
            message.reply('Failed to start the giveaway. Check the console for details.');
        }
    }
};

async function scheduleGiveawayEnd(client, messageId, msValue, giveawayPrize, giveawayWinnerCount, giveawayChannel, hostId) {
    setTimeout(async () => {
        try {
            const giveaway = await Giveaway.findOne({ messageId: messageId });

            if (!giveaway) {
                console.warn(`Giveaway with message ID ${messageId} not found in the database.`);
                return; // Giveaway was deleted or doesn't exist
            }

            if (giveaway.ended) {
                console.log(`Giveaway with message ID ${messageId} has already been ended.`);
                return; // Giveaway has already been ended
            }

            const winnerMessage = await giveawayChannel.messages.fetch(messageId);

            if (!winnerMessage) {
                console.warn(`Giveaway message not found: ${messageId}`);
                return; //Message doesn't exist, return instead of throwing error
            }
            const reaction = winnerMessage.reactions.cache.get('🎉');
            if (!reaction) {
                console.warn(`Reaction not found on message: ${messageId}`);
                return; //Reaction doesn't exist, return instead of throwing error
            }
            const users = await reaction.users.fetch();
            // Exclude the host from the list of potential winners
            const nonBotUsers = users.filter(user => !user.bot && user.id !== hostId);
            const winnerList = nonBotUsers.map(user => `<@${user.id}>`).join(', ');

            if (nonBotUsers.size < giveawayWinnerCount) {
                giveawayChannel.send(`Not enough participants (excluding the host) to determine the winner(s)!`);
                giveaway.ended = true;
                await giveaway.save();
                return;
            }

            // Pick the winners
            const winners = nonBotUsers.random(giveawayWinnerCount);
            const winnersMentions = winners.map(user => `<@${user.id}>`).join(', ');
            const endEmbed = new EmbedBuilder()
                .setColor(0x2f3136)
                .setTitle('🎉 Giveaway Ended! 🎉')
                .setDescription(`Prize: **${giveawayPrize}**\nWinner(s): ${winnersMentions}`)
                .setTimestamp()
                .setFooter({ text: 'Giveaway ended' });

            giveawayChannel.send({ embeds: [endEmbed] });

            giveaway.ended = true;
            await giveaway.save();

        } catch (error) {
            console.error("An error occurred when ending giveaway", error);
            console.error(error);
        }

    }, msValue);
}