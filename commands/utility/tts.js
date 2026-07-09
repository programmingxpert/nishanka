const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const GuildSettings = require('../../models/guildSettingsSchema');

module.exports = {
    category: 'utility',
    data: new SlashCommandBuilder()
        .setName('tts')
        .setDescription('Manage or control the Text-to-Speech (TTS) chat reader in voice channels.')
        .addSubcommand(sub =>
            sub.setName('join')
                .setDescription('Make the bot join your voice channel and start reading text messages.')
        )
        .addSubcommand(sub =>
            sub.setName('leave')
                .setDescription('Disconnect the bot from the voice channel.')
        )
        .addSubcommand(sub =>
            sub.setName('skip')
                .setDescription('Skip the currently playing TTS message.')
        )
        .addSubcommand(sub =>
            sub.setName('settings')
                .setDescription('View the current TTS configuration for this server.')
        )
        .addSubcommand(sub =>
            sub.setName('toggle')
                .setDescription('Toggle voice channel text chat TTS reading on or off.')
        )
        .addSubcommand(sub =>
            sub.setName('voice')
                .setDescription('Set the language/voice for TTS readings.')
                .addStringOption(opt =>
                    opt.setName('lang')
                        .setDescription('Language code (e.g., en, es, ja, fr, de, it, ru, pt, hi)')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('cooldown')
                .setDescription('Set the cooldown (in seconds) between TTS messages per user.')
                .addIntegerOption(opt =>
                    opt.setName('seconds')
                        .setDescription('Seconds of cooldown (1 to 30)')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('max-length')
                .setDescription('Set the maximum characters read per message.')
                .addIntegerOption(opt =>
                    opt.setName('characters')
                        .setDescription('Max character length (10 to 500)')
                        .setRequired(true)
                )
        ),

    async execute(interaction) {
        await interaction.deferReply();
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guildId;
        const member = interaction.member;

        // Perform permission checks for admin subcommands
        const adminSubcommands = ['toggle', 'voice', 'cooldown', 'max-length'];
        if (adminSubcommands.includes(subcommand)) {
            const hasAdminPerms = member.permissions.has(PermissionFlagsBits.Administrator) || member.permissions.has(PermissionFlagsBits.ManageGuild);
            if (!hasAdminPerms) {
                return interaction.editReply({ content: '❌ You need the **Administrator** or **Manage Server** permission to change TTS settings.' });
            }
        }

        // Fetch settings
        let settings = await GuildSettings.findOne({ guildId });
        if (!settings) {
            settings = new GuildSettings({ guildId });
        }

        // Initialize tts if undefined
        if (!settings.tts) {
            settings.tts = {
                enabled: false,
                voice: 'en',
                maxLength: 120,
                cooldown: 4,
                allowedRoles: []
            };
        }

        const result = await handleTtsCommand(interaction.client, interaction.guild, member, subcommand, interaction.options, settings);
        await interaction.editReply(result);
    },

    async executePrefix(message, args) {
        const subcommand = args[0]?.toLowerCase();
        const guild = message.guild;
        const member = message.member;
        const client = message.client;

        if (!subcommand) {
            const helpEmbed = new EmbedBuilder()
                .setColor(0x7C6CF0)
                .setTitle('🎙️ TTS (Text-to-Speech) Help')
                .setDescription('Read out text messages sent in the voice channel.')
                .addFields(
                    { name: '🔊 User Commands', value: '`-tts join` - Bot joins your VC\n`-tts leave` - Bot leaves the VC\n`-tts skip` - Skips current reading\n`-tts settings` - Views settings' },
                    { name: '⚙️ Admin Commands', value: '`-tts toggle` - Enable/Disable TTS\n`-tts voice <lang>` - Change language/voice\n`-tts cooldown <secs>` - Set user cooldown\n`-tts max-length <chars>` - Set message limit' }
                );
            return message.reply({ embeds: [helpEmbed] });
        }

        // Permissions check
        const adminSubcommands = ['toggle', 'voice', 'cooldown', 'max-length'];
        if (adminSubcommands.includes(subcommand)) {
            const hasAdminPerms = member.permissions.has(PermissionFlagsBits.Administrator) || member.permissions.has(PermissionFlagsBits.ManageGuild);
            if (!hasAdminPerms) {
                return message.reply('❌ You need the **Administrator** or **Manage Server** permission to change TTS settings.');
            }
        }

        // Fetch settings
        let settings = await GuildSettings.findOne({ guildId: guild.id });
        if (!settings) {
            settings = new GuildSettings({ guildId: guild.id });
        }

        // Initialize tts if undefined
        if (!settings.tts) {
            settings.tts = {
                enabled: false,
                voice: 'en',
                maxLength: 120,
                cooldown: 4,
                allowedRoles: []
            };
        }

        // Mock options for handler
        const optionsMock = {
            getString: () => args[1],
            getInteger: () => parseInt(args[1], 10)
        };

        const result = await handleTtsCommand(client, guild, member, subcommand, optionsMock, settings);
        await message.reply(result);
    }
};

async function handleTtsCommand(client, guild, member, subcommand, options, settings) {
    const { guildTtsQueues, skipTTS } = require('../../utils/ttsManager');

    if (subcommand === 'toggle') {
        settings.tts.enabled = !settings.tts.enabled;
        await settings.save();
        return { content: `✅ Voice Channel Text Chat Reader is now **${settings.tts.enabled ? 'ENABLED' : 'DISABLED'}**.` };
    }

    if (subcommand === 'voice') {
        const lang = options.getString('lang');
        if (!lang) return { content: '❌ Please specify a language code (e.g. `en`, `es`, `ja`, `fr`).' };
        settings.tts.voice = lang.toLowerCase();
        await settings.save();
        return { content: `✅ TTS voice language set to \`${settings.tts.voice}\`.` };
    }

    if (subcommand === 'cooldown') {
        const secs = options.getInteger('seconds');
        if (isNaN(secs) || secs < 1 || secs > 30) return { content: '❌ Cooldown must be between 1 and 30 seconds.' };
        settings.tts.cooldown = secs;
        await settings.save();
        return { content: `✅ TTS user cooldown set to **${secs}** seconds.` };
    }

    if (subcommand === 'max-length') {
        const chars = options.getInteger('characters');
        if (isNaN(chars) || chars < 10 || chars > 500) return { content: '❌ Max length must be between 10 and 500 characters.' };
        settings.tts.maxLength = chars;
        await settings.save();
        return { content: `✅ TTS max character limit set to **${chars}** characters.` };
    }

    if (subcommand === 'settings') {
        const embed = new EmbedBuilder()
            .setColor(0x7C6CF0)
            .setTitle('⚙️ TTS Server Settings')
            .addFields(
                { name: 'Status', value: settings.tts.enabled ? '🟢 Enabled' : '🔴 Disabled', inline: true },
                { name: 'Voice Language', value: `\`${settings.tts.voice}\``, inline: true },
                { name: 'User Cooldown', value: `${settings.tts.cooldown} seconds`, inline: true },
                { name: 'Max Characters', value: `${settings.tts.maxLength} chars`, inline: true }
            );
        return { embeds: [embed] };
    }

    if (subcommand === 'join') {
        const voiceChannel = member.voice.channel;
        if (!voiceChannel) {
            return { content: '❌ You must be in a voice channel to use this command.' };
        }

        // Enable TTS automatically if currently disabled
        if (!settings.tts.enabled) {
            settings.tts.enabled = true;
            await settings.save();
        }

        // Check if the bot is already in a VC in this server
        let player = client.activePlayers.get(guild.id);
        if (player) {
            // Check if player is already in this user's channel
            if (player.voiceChannel === voiceChannel.id) {
                return { content: `✅ I am already in your voice channel!` };
            }
            // Move player to the voice channel
            try {
                player.setVoiceChannel(voiceChannel.id);
                return { content: `✅ Joined your voice channel: <#${voiceChannel.id}>.` };
            } catch (moveError) {
                console.error("Error moving connection:", moveError);
                return { content: "❌ Failed to move to your voice channel. Check bot permissions." };
            }
        }

        // Create player
        try {
            player = await client.riffy.createConnection({
                guildId: guild.id,
                voiceChannel: voiceChannel.id,
                textChannel: voiceChannel.id, // read text channel of the voice channel itself
                deaf: true
            });
            client.activePlayers.set(guild.id, player);
            return { content: `✅ Connected to <#${voiceChannel.id}>! Send messages in this voice channel's text chat to have them read out loud.` };
        } catch (connectionError) {
            console.error("Error creating connection:", connectionError);
            return { content: "❌ Failed to establish a voice connection. Check bot permissions." };
        }
    }

    if (subcommand === 'leave') {
        const player = client.activePlayers.get(guild.id);
        if (!player) {
            return { content: '❌ I am not connected to a voice channel in this server.' };
        }

        player.destroy();
        client.activePlayers.delete(guild.id);
        
        // Clear TTS queue if any
        guildTtsQueues.delete(guild.id);

        return { content: '✅ Disconnected from the voice channel.' };
    }

    if (subcommand === 'skip') {
        const player = client.activePlayers.get(guild.id);
        if (!player) {
            return { content: '❌ I am not connected to a voice channel.' };
        }

        const ttsQueue = guildTtsQueues.get(guild.id);
        if (!ttsQueue || !ttsQueue.playing) {
            return { content: '❌ There is no TTS message currently reading.' };
        }

        skipTTS(client, guild.id);
        return { content: '⏩ Skipped the current TTS reading.' };
    }

    return { content: '❌ Unknown subcommand.' };
}
