/* eslint-disable */
const {
    SlashCommandBuilder,
    EmbedBuilder
} = require('discord.js');

module.exports = {
    category: 'music',
    // Slash command data for registration
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Plays music from YouTube or other supported sources.')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Song name or URL')
                .setRequired(true)
        ),

    // Function that executes when a slash command is issued
    async execute(interaction) {
        try {
            const query = interaction.options.getString('query');
            const member = interaction.member;
            if (!member?.voice?.channel) {
                return interaction.reply({ content: '❌ Join a voice channel first!', ephemeral: true });
            }

            await interaction.deferReply();

            const voiceChannelId = member.voice.channel.id; // get voice channel id
            const guildId = interaction.guild.id;
            const textChannelId = interaction.channel.id;

            // Reuse or create a new player
            let player = interaction.client.activePlayers.get(guildId);
            if (!player) {
                try {
                    player = await interaction.client.riffy.createConnection({
                        guildId: guildId,
                        voiceChannel: voiceChannelId,
                        textChannel: textChannelId,
                        deaf: true
                    });
                    console.log(`Creating new player for guild ${guildId}`);
                    interaction.client.activePlayers.set(guildId, player); // Store player
                } catch (connectionError) {
                    console.error("Error creating connection:", connectionError);
                    return interaction.editReply("❌ Failed to establish a voice connection. Check bot permissions.");
                }

            } else {
                // Ensure the player's voice channel matches the user's current channel
                if (player.voiceChannel !== voiceChannelId) {
                   // **REPLACE THIS SECTION**
                    try {
                        console.log(`Player in wrong channel, Recreating connection to ${voiceChannelId}`);
                        player.destroy(); // Destroy the old connection
                        interaction.client.activePlayers.delete(guildId); // Remove the old player

                        player = await interaction.client.riffy.createConnection({ // Recreate the connection
                            guildId: guildId,
                            voiceChannel: voiceChannelId,
                            textChannel: textChannelId,
                            deaf: true
                        });

                        interaction.client.activePlayers.set(guildId, player);
                    } catch (joinError) {
                        console.error("Error re-creating voice connection:", joinError);
                        return interaction.editReply("❌ Failed to join your voice channel. Check bot permissions.");
                    }

                }
                console.log(`Reusing existing player for guild ${guildId}`);
            }

            // Resolve the query using riffy
            const res = await interaction.client.riffy.resolve({ query, requester: interaction.user });
            const { loadType, tracks, playlistInfo } = res;
            if (!tracks.length) {
                return interaction.editReply('❌ No results found.');
            }

            // If a playlist is found, add all tracks
            if (loadType === 'playlist') {
                for (const t of tracks) {
                    t.info.requester = interaction.user;
                    player.queue.add(t);
                }
                const embed = new EmbedBuilder()
                    .setColor('#FF7A00')
                    .setTitle('🎶 Playlist Added')
                    .setDescription(`Added \`${tracks.length}\` tracks from **${playlistInfo.name}**.`);
                await interaction.editReply({ embeds: [embed] });
                if (!player.playing && !player.paused && !player.queue.current) {
                    try {
                        player.play();
                    } catch (err) {
                        console.error("player play error", err);
                    }
                }
                return;
            }

            // Otherwise, handle a single track
            const track = tracks[0];
            track.info.requester = interaction.user;
            player.queue.add(track);
            if (!player.playing && !player.paused && !player.queue.current) {
                try {
                    await player.play();
                    return interaction.editReply("Starting your track...");
                } catch (err) {
                    console.error("error playing song", err);
                    return interaction.editReply("Error playing song");
                }
            }

            const embed = new EmbedBuilder()
                .setColor('#FF7A00')
                .setThumbnail(track.info.artworkUrl || track.info.thumbnail || 'https://i.imgur.com/Mt8W5pJ.png')
                .setTitle('🎵 Added to Queue')
                .setDescription(`**[${track.info.title}](${track.info.uri})**`)
                .addFields(
                    { name: '🧑‍🎤 Author', value: track.info.author || 'Unknown', inline: true },
                    { name: '⏱ Duration', value: new Date(track.info.length).toISOString().substring(14, 19), inline: true },
                    { name: '🙋‍♂️ Requested by', value: `<@${interaction.user.id}>`, inline: true }
                );
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error("Error in /play command:", error);
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply("❌ An error occurred while processing your request.");
            } else {
                await interaction.reply({ content: "❌ An error occurred while processing your request.", ephemeral: true });
            }
        }
    },

    // Prefix-based command support
    async executePrefix(message, args) {
        try {
            const query = args.join(' ');
            if (!query) return message.reply("Please specify a song name or URL.");
            const member = message.member;
            if (!member?.voice?.channel) {
                return message.reply("❌ Please join a voice channel first!");
            }
            const processingMsg = await message.channel.send("Processing your request...");

            const voiceChannelId = member.voice.channel.id; // get voice channel id
            const guildId = message.guild.id;
            const textChannelId = message.channel.id;

            // Reuse or create a new player
            let player = message.client.activePlayers.get(guildId);
            if (!player) {
                try {
                    player = await message.client.riffy.createConnection({
                        guildId: guildId,
                        voiceChannel: voiceChannelId,
                        textChannel: textChannelId,
                        deaf: true
                    });
                    console.log(`Creating new player for guild ${guildId}`);
                    message.client.activePlayers.set(guildId, player); // Store player
                } catch (connectionError) {
                    console.error("Error creating connection:", connectionError);
                    return processingMsg.edit("❌ Failed to establish a voice connection. Check bot permissions.");
                }

            } else {
                // Ensure the player's voice channel matches the user's current channel
                if (player.voiceChannel !== voiceChannelId) {
                    // **REPLACE THIS SECTION**
                     try {
                        console.log(`Player in wrong channel, Recreating connection to ${voiceChannelId}`);
                        player.destroy(); // Destroy the old connection
                        message.client.activePlayers.delete(guildId); // Remove the old player

                        player = await message.client.riffy.createConnection({ // Recreate the connection
                            guildId: guildId,
                            voiceChannel: voiceChannelId,
                            textChannel: textChannelId,
                            deaf: true
                        });

                        message.client.activePlayers.set(guildId, player);
                    } catch (joinError) {
                        console.error("Error re-creating voice connection:", joinError);
                        return processingMsg.edit("❌ Failed to join your voice channel. Check bot permissions.");
                    }
                }
                console.log(`Reusing existing player for guild ${guildId}`);
            }

            // Resolve the query using riffy
            const res = await message.client.riffy.resolve({ query, requester: message.author });
            const { loadType, tracks, playlistInfo } = res;
            if (!tracks.length) {
                return processingMsg.edit("❌ No results found.");
            }
            if (loadType === 'playlist') {
                for (const t of tracks) {
                    t.info.requester = message.author;
                    player.queue.add(t);
                }
                const embed = new EmbedBuilder()
                    .setColor('#FF7A00')
                    .setTitle('🎶 Playlist Added')
                    .setDescription(`Added \`${tracks.length}\` tracks from **${playlistInfo.name}**.`);
                await processingMsg.edit({ embeds: [embed] });
                if (!player.playing && !player.paused && !player.queue.current) {
                    try {
                        player.play();
                    } catch (err) {
                        console.error("player play error", err);
                    }
                }
                return;
            }
            const track = tracks[0];
            track.info.requester = message.author;
            player.queue.add(track);
            if (!player.playing && !player.paused && !player.queue.current) {
                try {
                    await player.play();
                    return processingMsg.edit("Starting your track...");
                } catch (err) {
                    console.error("error playing song", err);
                    return processingMsg.edit("Error playing song");
                }
            }
            const embed = new EmbedBuilder()
                .setColor('#FF7A00')
                .setThumbnail(track.info.artworkUrl || track.info.thumbnail || 'https://i.imgur.com/Mt8W5pJ.png')
                .setTitle('🎵 Added to Queue')
                .setDescription(`**[${track.info.title}](${track.info.uri})**`)
                .addFields(
                    { name: '🧑‍🎤 Author', value: track.info.author || 'Unknown', inline: true },
                    { name: '⏱ Duration', value: new Date(track.info.length).toISOString().substring(14, 19), inline: true },
                    { name: '🙋‍♂️ Requested by', value: `<@${message.author.id}>`, inline: true }
                );
            await processingMsg.edit({ embeds: [embed] });
        } catch (error) {
            console.error(`Error in prefix play command: ${error}`);
            message.reply("❌ An error occurred while processing your request.");
        }
    }
};