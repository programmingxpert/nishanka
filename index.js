/* eslint-disable */
require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { Riffy } = require('riffy');
const { Bloom, initializeFonts } = require('musicard');

(async () => {
    try {
        await initializeFonts();
    } catch (e) {
        console.error("Failed to initialize musicard fonts", e);
    }
})();
const mongoose   = require('mongoose');
const fs         = require('fs');
const path       = require('path');

// ─── Create Client ────────────────────────────────────────────────────────────
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// ─── Bot collections ─────────────────────────────────────────────────────────
client.commands      = new Collection();
client.cooldowns     = new Collection();
client.activePlayers = new Map();
client.afk           = new Map(); // userId → { reason, time, displayName }
client.spamTracker   = new Collection(); // userId-guildId → timestamps[]
client.spamViolations = new Collection(); // userId-guildId → count

// ─── Load Commands ────────────────────────────────────────────────────────────
const commandsPath = path.join(__dirname, 'commands');
(function loadCommands(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            loadCommands(fullPath);
        } else if (entry.name.endsWith('.js') && !entry.name.endsWith('.example')) {
            try {
                const command = require(fullPath);
                if (command?.data?.name) {
                    client.commands.set(command.data.name, command);
                } else {
                    console.warn(`[Commands] Skipping ${entry.name}: missing data.name`);
                }
            } catch (err) {
                console.error(`[Commands] Failed to load ${entry.name}:`, err.message);
            }
        }
    }
})(commandsPath);

console.log(`📦 Loaded ${client.commands.size} command(s)`);

// ─── Load Events ──────────────────────────────────────────────────────────────
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));
for (const file of eventFiles) {
    const event = require(path.join(eventsPath, file));
    const handler = (...args) => event.execute(...args, client);
    if (event.once) {
        client.once(event.name, handler);
    } else {
        client.on(event.name, handler);
    }
}

// ─── Lavalink / riffy ─────────────────────────────────────────────────────────
const lavalinkNodes = [
    {
        name:     'main',
        host:     process.env.LAVALINK_HOST     ?? 'lava.link',
        port:     Number(process.env.LAVALINK_PORT ?? 80),
        password: process.env.LAVALINK_PASSWORD  ?? 'dismusic',
        secure:   process.env.LAVALINK_SECURE === 'true',
    },
];

client.riffy = new Riffy(client, lavalinkNodes, {
    send: (payload) => {
        const guild = client.guilds.cache.get(payload.d?.guild_id);
        if (guild) guild.shard.send(payload);
    },
    defaultSearchPlatform: 'ytmsearch',
    restVersion: 'v4',
    bypassChecks: {
        nodeFetchInfo: true
    }
});

// Forward raw WS events to Riffy (required for voice state)
client.on('raw', (data) => client.riffy.updateVoiceState(data));

// Riffy events
client.riffy.on('nodeConnect',    (node)          => console.log(`🎵 Lavalink node "${node.name}" connected`));
client.riffy.on('nodeError',      (node, err)     => console.error(`🎵 Lavalink node "${node.name}" error:`, err.message));
client.riffy.on('trackStart', async (player, track) => {
    const channel = client.channels.cache.get(player.textChannel);
    if (!channel) return;
    
    try {
        const musicard = await Bloom({
            trackName: track.info.title,
            artistName: track.info.author || 'Unknown',
            albumArt: track.info.artworkUrl || track.info.thumbnail || 'https://i.imgur.com/Mt8W5pJ.png',
            progressBar: 10,
            volumeBar: 100,
        });

        const attachment = new AttachmentBuilder(musicard, { name: 'musicard.png' });

        const embed = new EmbedBuilder()
            .setColor('#FF7A00')
            .setTitle('🎶 Now Playing')
            .setDescription(`**[${track.info.title}](${track.info.uri})**`)
            .addFields(
                { name: '🧑‍🎤 Author', value: track.info.author || 'Unknown', inline: true },
                { name: '⏱ Duration', value: new Date(track.info.length).toISOString().substring(14, 19), inline: true },
                { name: '🙋‍♂️ Requested by', value: track.info.requester ? `<@${track.info.requester.id || track.info.requester}>` : 'Unknown', inline: true },
                { name: '\u200B', value: '**Now playing with vibes 🔥**', inline: false }
            );

        channel.send({ embeds: [embed], files: [attachment] }).catch(() => {});
    } catch (err) {
        console.error("Musicard generation failed:", err);
        channel.send(`▶️ Now playing: **${track.info.title}** — *${track.info.author}*`).catch(() => {});
    }
});
client.riffy.on('trackEnd',       (player)        => {
    if (!player.queue.size && !player.queue.current) {
        setTimeout(() => {
            if (!player.playing) {
                player.destroy();
                client.activePlayers.delete(player.guildId);
            }
        }, 30_000);
    }
});
client.riffy.on('queueEnd',       (player)        => {
    const channel = client.channels.cache.get(player.textChannel);
    channel?.send('✅ Queue finished. Disconnecting in 30 seconds if no new tracks are added.').catch(() => {});
    setTimeout(() => {
        if (!player.playing) {
            player.destroy();
            client.activePlayers.delete(player.guildId);
        }
    }, 30_000);
});

// ─── MongoDB ──────────────────────────────────────────────────────────────────
mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => {
        console.error('❌ MongoDB connection failed:', err.message);
        process.exit(1);
    });

// ─── Web Server ─────────────────────────────────────────────────────────────────
const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("Bot is running");
});

app.listen(3000, () => {
  console.log("🌐 Web server running on port 3000");
});

// ─── Login ────────────────────────────────────────────────────────────────────
client.login(process.env.TOKEN).catch(err => {
    console.error('❌ Discord login failed:', err.message);
    process.exit(1);
});
