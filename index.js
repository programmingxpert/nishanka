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
client.antispamSettings = new Collection(); // guildId → settings
client.repetitionTracker = new Collection(); // userId-guildId → { content, count, lastTimestamp }
client.censorCache = new Collection(); // guildId → settings

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
        name:     'node-1',
        host:     process.env.LAVALINK_HOST     ?? 'lavalink.jirayu.net',
        port:     Number(process.env.LAVALINK_PORT ?? 443),
        password: process.env.LAVALINK_PASSWORD  ?? 'youshallnotpass',
        secure:   process.env.LAVALINK_SECURE === 'true',
    },
    {
        name:     'node-2',
        host:     process.env.LAVALINK_HOST_2   ?? 'lava-v4.millohost.my.id',
        port:     Number(process.env.LAVALINK_PORT_2 ?? 443),
        password: process.env.LAVALINK_PASSWORD_2 ?? 'https://discord.gg/mjS5J2K3ep',
        secure:   process.env.LAVALINK_SECURE_2 === 'true',
    },
    {
        name:     'node-3',
        host:     process.env.LAVALINK_HOST_3   ?? 'lavalink-v4.triniumhost.com',
        port:     Number(process.env.LAVALINK_PORT_3 ?? 443),
        password: process.env.LAVALINK_PASSWORD_3 ?? 'free',
        secure:   process.env.LAVALINK_SECURE_3 === 'true',
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
client.riffy.on('trackEnd',       async (player)        => {
    if (!player.queue.size && !player.queue.current) {
        setTimeout(async () => {
            if (!player.playing) {
                const settings = await require('./models/guildSettingsSchema').findOne({ guildId: player.guildId }).lean();
                if (settings?.music?.twentyFourSeven) return; // Prevent bot from leaving

                player.destroy();
                client.activePlayers.delete(player.guildId);
            }
        }, 30_000);
    }
});
client.riffy.on('queueEnd',       async (player)        => {
    const channel = client.channels.cache.get(player.textChannel);
    const settings = await require('./models/guildSettingsSchema').findOne({ guildId: player.guildId }).lean();
    const is24hr = settings?.music?.twentyFourSeven;

    if (!is24hr) {
        channel?.send('✅ Queue finished. Disconnecting in 30 seconds if no new tracks are added.').catch(() => {});
        setTimeout(() => {
            if (!player.playing) {
                player.destroy();
                client.activePlayers.delete(player.guildId);
            }
        }, 30_000);
    } else {
        channel?.send('✅ Queue finished. 24/7 Mode is active, staying in the voice channel.').catch(() => {});
    }
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
const express    = require("express");
const session    = require('express-session');
const https      = require('https');
const app        = express();
const AntiSpam      = require('./models/antiSpamSchema');
const Censor        = require('./models/censorSchema');
const GuildSettings = require('./models/guildSettingsSchema');

// ─── CORS for Vite Dashboard (Vercel & Local) ────────────────────────────────
app.use((req, res, next) => {
  const origin = req.headers.origin;
  // In production, you would add your actual Vercel URL here
  const allowed = [
    'http://localhost:5173', 
    'http://localhost:3000',
    process.env.FRONTEND_URL
  ].filter(Boolean);
  
  if (allowed.includes(origin) || !origin) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const MongoStore = require('connect-mongo');

// ─── Session Middleware ───────────────────────────────────────────────────────
const isProd = process.env.NODE_ENV === 'production';
app.use(session({
  secret: process.env.BOT_API_TOKEN || 'nishanka_session_secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: 'sessions'
  }),
  cookie: { 
    secure: isProd, // Must be true if SameSite is none (requires HTTPS)
    httpOnly: true, 
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: isProd ? 'none' : 'lax'
  }
}));


app.get("/", (req, res) => {
  res.send("Nishanka Bot API is running");
});

app.get("/api/health", (req, res) => {
  const uptimeSeconds = Math.floor(process.uptime());
  const hours = Math.floor(uptimeSeconds / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  
  res.json({
    status: 'online',
    discord_ready: client.isReady(),
    uptime: `${hours}h ${minutes}m`,
    guilds: client.guilds.cache.size,
    commands: client.commands.size
  });
});

// Internal API to refresh bot caches when dashboard updates settings
app.post("/api/internal/refresh-cache", express.json(), async (req, res) => {
  const token = req.headers['authorization'];
  if (token !== `Bearer ${process.env.BOT_API_TOKEN}`) {
    return res.status(401).send("Unauthorized");
  }

  const { guildId, module } = req.body;
  if (!guildId) return res.status(400).send("Missing guildId");

  try {
    if (module === 'antispam') {
      const settings = await AntiSpam.findOne({ guildId });
      if (settings) {
        client.antispamSettings.set(guildId, settings.toObject());
        console.log(`[Cache] Refreshed AntiSpam settings for ${guildId}`);
      }
    }
    // Add other modules here as needed
    
    res.send({ success: true });
  } catch (err) {
    console.error(`[Cache] Refresh failed for ${guildId}:`, err);
    res.status(500).send({ error: err.message });
  }
});

// Internal API to get list of guilds the bot is in
app.get("/api/internal/guilds", (req, res) => {
  const token = req.headers['authorization'];
  if (token !== `Bearer ${process.env.BOT_API_TOKEN}`) {
    return res.status(401).send("Unauthorized");
  }
  const guildIds = client.guilds.cache.map(g => g.id);
  res.send(guildIds);
});

// ─── Discord OAuth2 Auth Routes ───────────────────────────────────────────────
// ─── Discord OAuth2 Auth Routes ───────────────────────────────────────────────
const DISCORD_CLIENT_ID     = process.env.DISCORD_CLIENT_ID || process.env.CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI          = process.env.DISCORD_REDIRECT_URI || 'http://localhost:4000/auth/callback';
const FRONTEND_URL          = process.env.FRONTEND_URL || 'http://localhost:5173';

// Step 1: Redirect user to Discord OAuth
app.get('/auth/discord', (req, res) => {
  const params = new URLSearchParams({
    client_id:     DISCORD_CLIENT_ID,
    redirect_uri:  REDIRECT_URI,
    response_type: 'code',
    scope:         'identify guilds',
  });
  res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
});

// Step 2: Exchange code for token, store in session
app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.redirect(`${FRONTEND_URL}/error?error=no_code`);

  try {
    // Exchange code for access token
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type:    'authorization_code',
        code,
        redirect_uri:  REDIRECT_URI,
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      console.error('[Auth] Discord Error Response:', tokenData);
      throw new Error('No access token received');
    }

    // Fetch Discord user info
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const user = await userRes.json();

    // Store in session
    req.session.user        = { id: user.id, username: user.username, global_name: user.global_name, avatar: user.avatar };
    req.session.accessToken = tokenData.access_token;

    res.redirect(`${FRONTEND_URL}/dashboard`);
  } catch (err) {
    console.error('[Auth] OAuth callback error:', err.message);
    res.redirect(`${FRONTEND_URL}/error?error=auth_failed`);
  }
});

// Get current session user
app.get('/api/me', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Not authenticated' });
  const u = req.session.user;
  res.json({
    id:     u.id,
    name:   u.global_name || u.username,
    avatar: u.avatar ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png` : null,
  });
});

// Logout
app.post('/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ ok: true });
});

// Get admin guilds for the logged-in user
app.get('/api/guilds', async (req, res) => {
  if (!req.session.accessToken) return res.status(401).json({ error: 'Not authenticated' });

  try {
    let allGuilds = req.session.guilds;
    if (!allGuilds) {
      const discordRes = await fetch('https://discord.com/api/users/@me/guilds', {
        headers: { Authorization: `Bearer ${req.session.accessToken}` },
      });
      if (!discordRes.ok) throw new Error('Discord API error');
      allGuilds = await discordRes.json();
      req.session.guilds = allGuilds;
      req.session.save();
    }

    const adminGuilds = allGuilds.filter(g => (BigInt(g.permissions) & 0x20n) === 0x20n);
    const botGuildIds = client.guilds.cache.map(g => g.id);

    const enriched = adminGuilds.map(g => ({
      id:     g.id,
      name:   g.name,
      icon:   g.icon,
      hasBot: botGuildIds.includes(g.id),
    }));

    res.json(enriched);
  } catch (err) {
    console.error('[Auth] Guild fetch error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Guild Settings API ─────────────────────────────────────────────────────────

// Authenticate helper for guild endpoints
const checkGuildAccess = async (req, guildId) => {
  if (!req.session.accessToken) return false;

  try {
    let allGuilds = req.session.guilds;
    
    // If we don't have the guilds cached in the session, fetch them
    if (!allGuilds) {
      const discordRes = await fetch('https://discord.com/api/users/@me/guilds', {
        headers: { Authorization: `Bearer ${req.session.accessToken}` },
      });
      if (!discordRes.ok) return false;
      allGuilds = await discordRes.json();
      req.session.guilds = allGuilds; // Cache for the session duration
      req.session.save(); // Ensure it saves immediately
    }

    const target = allGuilds.find(g => g.id === guildId);
    if (!target) return false;
    return (BigInt(target.permissions) & 0x20n) === 0x20n; // Check administrator logic or manage server
  } catch (err) {
    return false;
  }
};

app.get('/api/guilds/:guildId/discord-data', async (req, res) => {
  const { guildId } = req.params;
  const hasAccess = await checkGuildAccess(req, guildId);
  if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

  const guild = client.guilds.cache.get(guildId);
  if (!guild) return res.status(404).json({ error: 'Bot is not in this guild' });

  try {
    const channels = guild.channels.cache.map(c => ({ id: c.id, name: c.name, type: c.type }));
    const roles = guild.roles.cache.map(r => ({ id: r.id, name: r.name, color: r.hexColor }));
    res.json({ channels, roles });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/guilds/:guildId', async (req, res) => {
  const { guildId } = req.params;
  const hasAccess = await checkGuildAccess(req, guildId);
  if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

  try {
    const [antiSpam, censor, guildConfig] = await Promise.all([
      AntiSpam.findOne({ guildId }).lean(),
      Censor.findOne({ guildId }).lean(),
      GuildSettings.findOne({ guildId }).lean()
    ]);

    res.json({
      antiSpam: antiSpam || {},
      censor: censor || {},
      economy: guildConfig?.economy || {},
      music: guildConfig?.music || {},
      bot: guildConfig?.bot || {}
    });
  } catch (err) {
    console.error('Fetch settings error:', err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

app.post('/api/guilds/:guildId', express.json(), async (req, res) => {
  const { guildId } = req.params;
  const hasAccess = await checkGuildAccess(req, guildId);
  if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

  const { antiSpam, censor, economy, music, bot } = req.body;

  try {
    // Check nickname update
    if (bot && bot.nickname !== undefined) {
      const guild = client.guilds.cache.get(guildId);
      if (guild) {
        try {
          const currentNickname = guild.members.me.nickname || '';
          if (bot.nickname !== currentNickname) {
            await guild.members.me.setNickname(bot.nickname);
          }
        } catch (e) {
          console.error(`Failed to update nickname in guild ${guildId}:`, e);
        }
      }
    }

    await Promise.all([
      AntiSpam.findOneAndUpdate({ guildId }, { ...antiSpam }, { upsert: true, new: true }),
      Censor.findOneAndUpdate({ guildId }, { ...censor }, { upsert: true, new: true }),
      GuildSettings.findOneAndUpdate({ guildId }, { economy: economy || {}, music: music || {}, bot: bot || {} }, { upsert: true, new: true })
    ]);

    // Force bot to reload these from DB next time they're needed
    if (client.censorCache) client.censorCache.delete(guildId);
    if (client.antispamSettings) client.antispamSettings.delete(guildId);

    res.json({ ok: true });
  } catch (err) {
    console.error('Save settings error:', err);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

const PORT = process.env.BOT_PORT || 4000;

app.listen(PORT, () => {
  console.log(`🌐 Bot Internal API running on port ${PORT}`);
});

// ─── Login ────────────────────────────────────────────────────────────────────
client.login(process.env.TOKEN).catch(err => {
    console.error('❌ Discord login failed:', err.message);
    process.exit(1);
});
