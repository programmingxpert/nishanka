/* eslint-disable */
require('dotenv').config();

// Global process error handlers to prevent unhandled rejection/exception crashes
process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
    console.error('💥 Uncaught Exception thrown:', err);
});

const { Client, GatewayIntentBits, Partials, Collection, AttachmentBuilder, EmbedBuilder } = require('discord.js');

// Minimal & aesthetic bot branding and custom emojis across all embeds
const originalToJSON = EmbedBuilder.prototype.toJSON;
const { emoji: getCustomEmoji } = require('./utils/customEmojis');

const emojiMapping = {
    '🪙': 'currency.bauble',
    '❌': 'ui.error',
    '✅': 'ui.success',
    '⚠️': 'ui.warning',
    '☕': 'item.coffee',
    '💎': 'currency.premium_gem',
    '💣': 'game.mines_bomb',
    '🦆': 'item.rubber_duck'
};

EmbedBuilder.prototype.toJSON = function() {
    const json = originalToJSON.call(this);
    if (!json.color) {
        json.color = 0x7c6cf0; // brand purple
    }
    const avatarURL = global.client?.user?.displayAvatarURL({ extension: 'png', size: 128 }) || null;
    if (json.footer) {
        if (json.footer.text && !json.footer.text.includes('Nishanka')) {
            json.footer.text = `Nishanka • ${json.footer.text}`;
        }
        if (!json.footer.icon_url && avatarURL) {
            json.footer.icon_url = avatarURL;
        }
    } else {
        json.footer = {
            text: 'Nishanka • by Zeyuki'
        };
        if (avatarURL) {
            json.footer.icon_url = avatarURL;
        }
    }

    // Globally replace standard emojis with custom configured emojis in embeds
    let str = JSON.stringify(json);
    for (const [standardEmoji, key] of Object.entries(emojiMapping)) {
        const customEmoji = getCustomEmoji(key);
        if (customEmoji && customEmoji !== standardEmoji) {
            const regex = new RegExp(standardEmoji, 'g');
            str = str.replace(regex, customEmoji);
        }
    }
    return JSON.parse(str);
};
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

global.client = client;

// Globally patch REST requests to replace standard emojis in outgoing message payloads
const originalRequest = client.rest.request.bind(client.rest);
client.rest.request = function(options) {
    if (options && options.body) {
        try {
            let str = JSON.stringify(options.body);
            for (const [standardEmoji, key] of Object.entries(emojiMapping)) {
                const customEmoji = getCustomEmoji(key);
                if (customEmoji && customEmoji !== standardEmoji) {
                    const regex = new RegExp(standardEmoji, 'g');
                    str = str.replace(regex, customEmoji);
                }
            }
            options.body = JSON.parse(str);
        } catch (e) {
            // Ignore parse errors or binary payloads
        }
    }
    return originalRequest(options);
};

// ─── Bot collections ─────────────────────────────────────────────────────────
client.commands      = new Collection();
client.cooldowns     = new Collection();
client.activePlayers = new Map();
client.afk           = new Map(); // userId → { reason, time, displayName }
client.spamTracker   = new Collection(); // userId-guildId → timestamps[]
client.spamViolations = new Collection(); // userId-guildId → count
client.autoModSettings = new Collection(); // guildId → settings
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
                    const defaultAliasesMap = {
                        bauble: ['bal', 'balance', 'money', 'cash', 'coins'],
                        inventory: ['inv', 'bag', 'items'],
                        leaderboard: ['lb', 'top'],
                        globalleaderboard: ['glb', 'gtop'],
                        daily: ['d'],
                        weekly: ['week'],
                        coinflip: ['cf', 'flip'],
                        slots: ['slot'],
                        gamble: ['g', 'bet'],
                        mines: ['mine', 'm'],
                        buckshot: ['bs', 'shotgun'],
                        scavenge: ['scav', 'sc'],
                        work: ['job'],
                        rob: ['steal', 'mug'],
                        use: ['consume'],
                        profile: ['p', 'prof'],
                        'profile-edit': ['pedit', 'pe'],
                        'profile-reset': ['preset'],
                        family: ['fam'],
                        familytree: ['tree', 'ft'],
                        marry: ['proposal', 'propose'],
                        divorce: ['breakup'],
                        help: ['h', 'cmds', 'commands'],
                        ping: ['latency'],
                        setquoteschannel: ['sqc', 'quoteschannel'],
                        wordbomb: ['wb'],
                        scramble: ['scram'],
                        emojidecode: ['ed', 'emoji'],
                        guesstheflag: ['gtf', 'flag'],
                        deathbattle: ['db'],
                        meme: ['memes'],
                        rep: ['reputation', 'reps'],
                        rank: ['level', 'lvl'],
                        excuse: ['excuses'],
                        ban: ['b'],
                        unban: ['ub'],
                        timeout: ['mute', 'to'],
                        removetimeout: ['unmute', 'unto'],
                        purge: ['clear', 'clean'],
                        defaultpurge: ['setpurge', 'purgeconfig'],
                        warn: ['wn'],
                        warnings: ['warns'],
                        clearwarnings: ['clearwarns', 'cw'],
                        temprole: ['tr'],
                        play: ['pl'],
                        stop: ['leave', 'dc'],
                        pause: ['pausemusic'],
                        resume: ['resumemusic'],
                        queue: ['q'],
                        skip: ['next'],
                        remove: ['rm'],
                        clearmusic: ['clearq', 'cq']
                    };
                    const name = command.data.name;
                    if (defaultAliasesMap[name]) {
                        const existing = command.aliases || [];
                        command.aliases = [...new Set([...existing, ...defaultAliasesMap[name]])];
                    }
                    client.commands.set(name, command);
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
        secure:   process.env.LAVALINK_SECURE !== 'false',
    },
    {
        name:     'node-2',
        host:     process.env.LAVALINK_HOST_2   ?? 'lavalink.jirayu.net',
        port:     Number(process.env.LAVALINK_PORT_2 ?? 443),
        password: process.env.LAVALINK_PASSWORD_2 ?? 'youshallnotpass',
        secure:   process.env.LAVALINK_SECURE_2 !== 'false',
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
    .then(() => {
        console.log('✅ Connected to MongoDB');
        const cron = require('node-cron');
        const { calculateEconomy, checkCatchUpEconomy } = require('./utils/economyEngine');
        
        // 1. Initial run: Check if we missed a day while the bot was offline
        setTimeout(() => checkCatchUpEconomy(client), 10000);
        
        // 2. Schedule the economy recalculation every day at exactly midnight (server time)
        cron.schedule('0 0 * * *', () => {
            console.log('[Cron] Running scheduled daily economy calculation...');
            calculateEconomy(client);
        });
    })
    .catch(err => {
        console.error('❌ MongoDB connection failed:', err.message);
        process.exit(1);
    });

// ─── Web Server ─────────────────────────────────────────────────────────────────
const express    = require("express");
const session    = require('express-session');
const https      = require('https');
const app        = express();
const AutoMod       = require('./models/autoModSchema');
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
  
  const isAllowed = !origin || 
                    allowed.includes(origin) || 
                    origin.endsWith('.zeyuki.app') || 
                    origin === 'https://zeyuki.app';

  if (isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ─── Session Middleware ───────────────────────────────────────────────────────
const isProd = process.env.NODE_ENV === 'production';
app.use(session({
  secret: process.env.BOT_API_TOKEN || 'nishanka_session_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: isProd,
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
  
  const musicServers = client.riffy ? Array.from(client.riffy.nodeMap.values()).map((n, idx) => ({
    name: n.name || `Music Server ${idx + 1}`,
    connected: !!n.connected
  })) : [];

  res.json({
    status: 'online',
    discord_ready: client.isReady(),
    uptime: `${hours}h ${minutes}m`,
    guilds: client.guilds.cache.size,
    commands: client.commands.size,
    musicServers
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
    if (module === 'automod') {
      const settings = await AutoMod.findOne({ guildId });
      if (settings) {
        client.autoModSettings.set(guildId, settings.toObject());
        console.log(`[Cache] Refreshed AutoMod settings for ${guildId}`);
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
    id:       u.id,
    username: u.username,
    name:     u.global_name || u.username,
    avatar:   u.avatar ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png` : null,
  });
});

// Item Leaderboard (Public)
app.get('/api/public/items/:itemId/leaderboard', async (req, res) => {
  try {
    const { itemId } = req.params;
    const Bauble = require('./models/baubleSchema');
    
    // Find all users who have this item in their inventory, sorted by quantity
    const owners = await Bauble.aggregate([
      { $unwind: "$inventory" },
      { $match: { "inventory.itemId": itemId, "inventory.quantity": { $gt: 0 } } },
      { $sort: { "inventory.quantity": -1 } },
      { $limit: 10 },
      { $project: { _id: 0, userId: 1, quantity: "$inventory.quantity" } }
    ]);
    
    const enriched = await Promise.all(owners.map(async (entry, index) => {
      let username = 'Unknown User';
      let displayName = entry.userId;
      let avatarUrl = '';
      try {
        const user = await client.users.fetch(entry.userId);
        username = user.username;
        displayName = user.displayName || user.globalName || user.username;
        avatarUrl = user.displayAvatarURL({ dynamic: true, size: 128 });
      } catch (e) {
        // ignore
      }
      return {
        rank: index + 1,
        userId: entry.userId,
        username,
        displayName,
        avatarUrl,
        quantity: entry.quantity
      };
    }));

    res.json(enriched);
  } catch (err) {
    console.error('[API] Error fetching item leaderboard:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Achievements List with global counts (Public)
app.get('/api/public/achievements', async (req, res) => {
  try {
    const { ACHIEVEMENTS } = require('./utils/achievements');
    const Achievement = require('./models/achievementSchema');
    
    // Group achievements to count global unlocks
    const counts = await Achievement.aggregate([
      { $group: { _id: "$achievementId", count: { $sum: 1 } } }
    ]);
    
    const countMap = {};
    counts.forEach(c => {
      countMap[c._id] = c.count;
    });

    const enriched = ACHIEVEMENTS.map(ach => ({
      ...ach,
      collectedCount: countMap[ach.id] || 0
    }));

    res.json(enriched);
  } catch (err) {
    console.error('[API] Error fetching achievements list:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Achievement Leaderboard (Public)
app.get('/api/public/achievements/:achievementId/leaderboard', async (req, res) => {
  try {
    const { achievementId } = req.params;
    const Achievement = require('./models/achievementSchema');
    
    // Find unlocks for this achievement, sort by unlockedAt ascending (earliest first)
    const unlocks = await Achievement.find({ achievementId })
      .sort({ unlockedAt: 1 })
      .limit(10)
      .exec();
      
    const enriched = await Promise.all(unlocks.map(async (entry, index) => {
      let username = 'Unknown User';
      let displayName = entry.userId;
      let avatarUrl = '';
      try {
        const user = await client.users.fetch(entry.userId);
        username = user.username;
        displayName = user.displayName || user.globalName || user.username;
        avatarUrl = user.displayAvatarURL({ dynamic: true, size: 128 });
      } catch (e) {
        // ignore
      }
      return {
        rank: index + 1,
        userId: entry.userId,
        username,
        displayName,
        avatarUrl,
        unlockedAt: entry.unlockedAt
      };
    }));
    
    res.json(enriched);
  } catch (err) {
    console.error('[API] Error fetching achievement leaderboard:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Items stats (Public)
app.get('/api/public/items/stats', async (req, res) => {
  try {
    const Bauble = require('./models/baubleSchema');
    const stats = await Bauble.aggregate([
      { $unwind: "$inventory" },
      { $group: {
          _id: "$inventory.itemId",
          totalCollected: { $sum: "$inventory.quantity" },
          uniqueOwners: { $sum: 1 }
        }
      }
    ]);
    res.json(stats);
  } catch (err) {
    console.error('[API] Error fetching items stats:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Premium Status API
app.get('/api/premium/status', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const { isUserPremium, getUserPremiumTier } = require('./utils/premiumPromo');
    const userIsPremium = isUserPremium(req.session.user.id);

    if (userIsPremium) {
      try {
        const { checkAndAwardAchievement } = require('./utils/achievements');
        const newlyUnlocked = await checkAndAwardAchievement(client, req.session.user.id, 'premium_supporter');
        if (newlyUnlocked) {
          const Bauble = require('./models/baubleSchema');
          const baubleData = await Bauble.findOneAndUpdate(
            { userId: req.session.user.id },
            { $inc: { baubles: 5000 } },
            { upsert: true, new: true }
          );
          const { addItemToInventory } = require('./utils/items');
          addItemToInventory(baubleData, 'mystery_box', 3);
          addItemToInventory(baubleData, 'clover', 2);
          addItemToInventory(baubleData, 'rubber_duck', 1);
          await baubleData.save();
        }
      } catch (achErr) {
        console.error('Failed to award premium supporter achievement:', achErr);
      }
    }
    
    let userGuilds = req.session.guilds;
    if (!userGuilds) {
      const discordRes = await fetch('https://discord.com/api/users/@me/guilds', {
        headers: { Authorization: `Bearer ${req.session.accessToken}` },
      });
      if (discordRes.ok) {
        userGuilds = await discordRes.json();
        req.session.guilds = userGuilds;
        req.session.save();
      } else {
        userGuilds = [];
      }
    }
    
    const premiumGuildsList = (process.env.PREMIUM_GUILDS || "").split(",").map(id => id.trim());
    
    const enrichedGuilds = await Promise.all(userGuilds.map(async (g) => {
      const isOwner = g.owner === true;
      const hasAdmin = (BigInt(g.permissions) & 0x20n) === 0x20n;
      
      // A guild is premium if it's in the whitelisted guilds list OR if the owner is premium
      let isPrem = premiumGuildsList.includes(g.id);
      if (!isPrem && isOwner && userIsPremium) isPrem = true;
      
      // Fallback: check database flag
      if (!isPrem) {
        const GuildSettings = require('./models/guildSettingsSchema');
        const guildConfig = await GuildSettings.findOne({ guildId: g.id }).lean();
        if (guildConfig && guildConfig.isPremium) isPrem = true;
      }

      return {
        id: g.id,
        name: g.name,
        icon: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=128` : null,
        isPremium: isPrem,
        hasAdmin
      };
    }));

    const { getUserAPU, TIER_APU_LIMITS } = require('./utils/aiManager');
    const apuBalance = await getUserAPU(req.session.user.id);
    const tier = getUserPremiumTier(req.session.user.id);
    const maxApu = TIER_APU_LIMITS[tier] || TIER_APU_LIMITS.free;

    // Fetch plan dates from DB for "Your Plan" card
    const DAILY_BAUBLES_BY_TIER = { lite: 1000, pro: 2500, network: 5000, lifetime: 10000, free: 0 };
    let planActivatedAt = null;
    let planExpiresAt = null;
    if (userIsPremium && tier !== 'free') {
      try {
        const PremiumUser = require('./models/premiumUserSchema');
        const premUser = await PremiumUser.findOne({ userId: req.session.user.id }).lean();
        if (premUser) {
          planActivatedAt = premUser.activatedAt || null;
          planExpiresAt = premUser.expiresAt || null;
        }
      } catch (e) {}
    }

    res.json({
      userIsPremium,
      apuBalance,
      apuMax: maxApu,
      apuTier: tier,
      planActivatedAt,
      planExpiresAt,
      planDailyBaubles: DAILY_BAUBLES_BY_TIER[tier] || 0,
      guilds: enrichedGuilds
    });
  } catch (err) {
    console.error('Failed to fetch premium status:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Razorpay Order Creation API
app.post('/api/premium/create-order', express.json(), async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Not authenticated' });
  
  const { tier, currency } = req.body;
  if (!tier || !currency) {
    return res.status(400).json({ error: 'Tier and currency are required' });
  }

  // Tier pricing rules matching dashboard-v2 UI
  const PRICES = {
    USD: { lite: 1.99, pro: 3.99, network: 8.99, lifetime: 99.99 },
    INR: { lite: 99, pro: 199, network: 499, lifetime: 4999 },
    EUR: { lite: 1.89, pro: 3.69, network: 8.49, lifetime: 89.99 }
  };

  const selectedCurrency = PRICES[currency] ? currency : 'USD';
  const tierPrice = PRICES[selectedCurrency][tier.toLowerCase()];
  if (!tierPrice) {
    return res.status(400).json({ error: 'Invalid tier specified' });
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const isSecretConfigured = keySecret && keySecret !== 'your_razorpay_key_secret_here';

  if (!keyId) {
    return res.status(500).json({ error: 'Razorpay billing credentials (RAZORPAY_KEY_ID) not configured on server.' });
  }

  const amountInPaise = Math.round(tierPrice * 100);

  // If secret key is not configured, fall back to direct checkout parameters
  if (!isSecretConfigured) {
    console.log(`[Razorpay] Key Secret is not configured. Returning direct checkout parameters.`);
    return res.json({
      orderId: null,
      amount: amountInPaise,
      currency: selectedCurrency,
      keyId: keyId
    });
  }

  try {
    const orderResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64')
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: selectedCurrency,
        receipt: `receipt_${req.session.user.id}_${Date.now()}`
      })
    });

    if (!orderResponse.ok) {
      const errText = await orderResponse.text();
      console.error('[Razorpay Order Error] Raw response:', errText);
      return res.status(500).json({ error: 'Failed to create order with Razorpay.' });
    }

    const orderData = await orderResponse.json();
    res.json({
      orderId: orderData.id,
      amount: orderData.amount,
      currency: orderData.currency,
      keyId: keyId
    });
  } catch (err) {
    console.error('Failed to create Razorpay order:', err);
    res.status(500).json({ error: 'Internal server error during order creation.' });
  }
});

// Razorpay Payment Verification API
app.post('/api/premium/verify-payment', express.json(), async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Not authenticated' });

  const { razorpay_payment_id, razorpay_order_id, razorpay_signature, tier } = req.body;
  if (!razorpay_payment_id || !tier) {
    return res.status(400).json({ error: 'Missing payment details for verification' });
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const isSecretConfigured = keySecret && keySecret !== 'your_razorpay_key_secret_here';

  try {
    if (isSecretConfigured && razorpay_order_id && razorpay_signature) {
      const crypto = require('crypto');
      const generated_signature = crypto
        .createHmac('sha256', keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (generated_signature !== razorpay_signature) {
        return res.status(400).json({ error: 'Invalid payment signature. Verification failed.' });
      }
    } else {
      console.warn(`[Razorpay] Bypassing payment signature verification (Secret key missing or direct checkout used).`);
    }

    // Purchase is verified! Save to MongoDB
    const PremiumUser = require('./models/premiumUserSchema');
    const expiresAt = tier.toLowerCase() === 'lifetime'
      ? null
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 Days expiry

    await PremiumUser.findOneAndUpdate(
      { userId: req.session.user.id },
      {
        tier: tier.toLowerCase(),
        expiresAt: expiresAt,
        activatedAt: new Date(),
        orderId: razorpay_order_id || '',
        paymentId: razorpay_payment_id
      },
      { upsert: true, new: true }
    );

    // Update in-memory cache immediately
    const { dbPremiumUsersCache } = require('./utils/premiumPromo');
    dbPremiumUsersCache.set(req.session.user.id, { tier: tier.toLowerCase(), expiresAt });

    // Grant premium achievements and starter rewards if first time
    try {
      const { checkAndAwardAchievement } = require('./utils/achievements');
      const newlyUnlocked = await checkAndAwardAchievement(client, req.session.user.id, 'premium_supporter');
      if (newlyUnlocked) {
        const Bauble = require('./models/baubleSchema');
        const baubleData = await Bauble.findOneAndUpdate(
          { userId: req.session.user.id },
          { $inc: { baubles: 5000 } },
          { upsert: true, new: true }
        );
        const { addItemToInventory } = require('./utils/items');
        addItemToInventory(baubleData, 'mystery_box', 3);
        addItemToInventory(baubleData, 'clover', 2);
        addItemToInventory(baubleData, 'rubber_duck', 1);
        await baubleData.save();
      }
    } catch (achErr) {
      console.error('Failed to process post-payment rewards:', achErr);
    }

    res.json({ success: true, tier: tier.toLowerCase() });
  } catch (err) {
    console.error('Failed to verify Razorpay payment:', err);
    res.status(500).json({ error: 'Internal server error during verification.' });
  }
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

const isPremium = async (guildId) => {
  // 1. Check if guild ID is directly whitelisted in env
  const premiumGuilds = (process.env.PREMIUM_GUILDS || "").split(",").map(id => id.trim());
  if (premiumGuilds.includes(guildId)) return true;

  // 2. Check if guild owner is whitelisted in env
  const premiumUsers = (process.env.PREMIUM_USERS || "").split(",").map(id => id.trim());
  try {
    const guild = client.guilds.cache.get(guildId) || await client.guilds.fetch(guildId).catch(() => null);
    if (guild && premiumUsers.includes(guild.ownerId)) return true;
  } catch (e) {}

  // 3. Or check database premium status
  const GuildSettings = require('./models/guildSettingsSchema');
  const guildConfig = await GuildSettings.findOne({ guildId }).lean();
  if (guildConfig && guildConfig.isPremium) return true;

  return false;
};

const checkPermission = async (req, guildId, tab) => {
  if (!req.session.user) return false;
  
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return false;

  const isOwner = guild.ownerId === req.session.user.id;
  if (isOwner) return true;

  let isAdmin = false;
  let userRoles = [];
  try {
    const member = await guild.members.fetch(req.session.user.id);
    isAdmin = member.permissions.has('Administrator');
    userRoles = member.roles.cache.map(r => r.id);
  } catch (err) {
    console.error(`[Dashboard] Failed to fetch member permissions for ${req.session.user.id} in ${guildId}:`, err.message);
    return false;
  }

  if (isAdmin) return true;

  const config = await GuildSettings.findOne({ guildId }).lean();
  const dbPerms = config?.dashboardPermissions || {};
  const allowedRoles = dbPerms[tab] || [];
  if (allowedRoles.length === 0) return true; // Default fallback
  return allowedRoles.some(r => userRoles.includes(r));
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
    
    const bot = {
      username: client.user.username,
      nickname: guild.members.me.nickname || client.user.username,
      avatarURL: client.user.displayAvatarURL({ extension: 'png', size: 128 })
    };

    res.json({ channels, roles, bot });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/guilds/:guildId', async (req, res) => {
  const { guildId } = req.params;
  const hasAccess = await checkGuildAccess(req, guildId);
  if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

  try {
    const [autoMod, censor, guildConfig] = await Promise.all([
      AutoMod.findOne({ guildId }).lean(),
      Censor.findOne({ guildId }).lean(),
      GuildSettings.findOne({ guildId }).lean()
    ]);

    const guild = client.guilds.cache.get(guildId);
    let isOwner = false;
    let isAdmin = false;
    let userRoles = [];
    let guildName = 'Unknown Server';
    let guildIcon = null;

    if (guild) {
      isOwner = guild.ownerId === req.session.user.id;
      guildName = guild.name;
      guildIcon = guild.iconURL({ extension: 'png', size: 128 });
      try {
        const member = await guild.members.fetch(req.session.user.id);
        isAdmin = member.permissions.has('Administrator') || isOwner;
        userRoles = member.roles.cache.map(r => r.id);
      } catch (err) {
        console.error(`[Dashboard] Failed to fetch member info for ${req.session.user.id}:`, err.message);
      }
    }

    if (req.session.guilds) {
      const sessionGuild = req.session.guilds.find(g => g.id === guildId);
      if (sessionGuild) {
        if (!guild) {
          isOwner = sessionGuild.owner === true;
          isAdmin = (BigInt(sessionGuild.permissions) & 8n) === 8n || isOwner;
        }
        if (guildName === 'Unknown Server') {
          guildName = sessionGuild.name;
          if (sessionGuild.icon) {
            guildIcon = `https://cdn.discordapp.com/icons/${guildId}/${sessionGuild.icon}.png?size=128`;
          }
        }
      }
    }

    const dbPerms = guildConfig?.dashboardPermissions || {};
    const canEdit = (tab) => {
      if (isOwner || isAdmin) return true;
      const allowedRoles = dbPerms[tab] || [];
      if (allowedRoles.length === 0) return true; // Default fallback
      return allowedRoles.some(r => userRoles.includes(r));
    };

    const userPermissions = {
      isOwner,
      isAdmin,
      roles: userRoles,
      canEdit: {
        bot: canEdit('bot'),
        giveaways: canEdit('giveaways'),
        embed: canEdit('embed'),
        triggers: canEdit('triggers'),
        mediaonly: canEdit('mediaonly'),
        automod: canEdit('automod'),
        censor: canEdit('censor'),
        music: canEdit('music'),
        permissions: isOwner || isAdmin
      },
      dashboardPermissions: {
        bot: dbPerms.bot || [],
        giveaways: dbPerms.giveaways || [],
        embed: dbPerms.embed || [],
        triggers: dbPerms.triggers || [],
        mediaonly: dbPerms.mediaonly || [],
        automod: dbPerms.automod || [],
        censor: dbPerms.censor || [],
        music: dbPerms.music || []
      }
    };

    res.json({
      autoMod: autoMod || {},
      censor: censor || {},
      economy: guildConfig?.economy || {},
      music: guildConfig?.music || {},
      bot: guildConfig?.bot || {},
      leveling: guildConfig?.leveling || {
        enabled: true,
        levelUpChannelId: null,
        announceLevelUps: true,
        roleRewards: [],
        baublesMultiplier: 100
      },
      welcome: guildConfig?.welcome || {
        enabled: false,
        channelId: null,
        joinMessage: 'Welcome {user.mention} to {server.name}! You are our {server.memberCount}th member! 🎉',
        leaveMessage: '{user.name} has left the server. 😢'
      },
      autoRole: guildConfig?.autoRole || {
        enabled: false,
        roleId: null
      },
      logging: guildConfig?.logging || {
        enabled: false,
        channelId: null,
        messageDelete: true,
        messageUpdate: true,
        memberJoin: true,
        memberLeave: true
      },
      dashboardPermissions: dbPerms,
      userPermissions,
      guildName,
      guildIcon,
      isPremium: await isPremium(guildId),
      premiumTier: await (async () => {
        const { getGuildPremiumTier } = require('./utils/premiumPromo');
        return await getGuildPremiumTier(guildId);
      })()
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

  const { autoMod, censor, economy, music, bot, leveling, welcome, autoRole, logging, dashboardPermissions } = req.body;

  try {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ error: 'Bot is not in this guild' });

    const isOwner = guild.ownerId === req.session.user.id;
    let isAdmin = false;
    let userRoles = [];
    try {
      const member = await guild.members.fetch(req.session.user.id);
      isAdmin = member.permissions.has('Administrator') || isOwner;
      userRoles = member.roles.cache.map(r => r.id);
    } catch (err) {}

    const currentConfig = await GuildSettings.findOne({ guildId }).lean();
    const dbPerms = currentConfig?.dashboardPermissions || {};

    const canEdit = (tab) => {
      if (isOwner || isAdmin) return true;
      const allowedRoles = dbPerms[tab] || [];
      if (allowedRoles.length === 0) return true; // Default fallback
      return allowedRoles.some(r => userRoles.includes(r));
    };

    const settingsUpdates = {};

    if (bot) {
      if (!canEdit('bot')) {
        return res.status(403).json({ error: 'You do not have permission to modify Bot Identity settings.' });
      }
      settingsUpdates.bot = bot;

      // Check nickname update
      if (bot.nickname !== undefined) {
        try {
          const currentNickname = guild.members.me.nickname || '';
          if (bot.nickname !== currentNickname) {
            await guild.members.me.setNickname(bot.nickname || null);
          }
        } catch (e) {
          console.error(`Failed to update nickname in guild ${guildId}:`, e);
        }
      }
    }

    if (leveling) {
      if (!canEdit('bot')) {
        return res.status(403).json({ error: 'You do not have permission to modify Leveling settings.' });
      }
      const isPrem = await isPremium(guildId);
      const rewards = Array.isArray(leveling.roleRewards)
        ? leveling.roleRewards.map(r => ({ level: Number(r.level), roleId: String(r.roleId) }))
        : [];
      if (!isPrem && rewards.length > 10) {
        return res.status(403).json({ error: 'Free servers are limited to 10 leveling role rewards. Get Premium starting as low as $1.99/mo (VERY CHEAP!) to unlock unlimited!' });
      }
      settingsUpdates.leveling = {
        enabled: leveling.enabled !== false,
        announceLevelUps: leveling.announceLevelUps !== false,
        levelUpChannelId: leveling.levelUpChannelId || null,
        baublesMultiplier: typeof leveling.baublesMultiplier === 'number' ? leveling.baublesMultiplier : 100,
        roleRewards: rewards
      };
    }

    if (welcome) {
      if (!canEdit('bot')) {
        return res.status(403).json({ error: 'You do not have permission to modify Welcome settings.' });
      }
      settingsUpdates.welcome = welcome;
    }

    if (autoRole) {
      if (!canEdit('bot')) {
        return res.status(403).json({ error: 'You do not have permission to modify Auto-Role settings.' });
      }
      settingsUpdates.autoRole = autoRole;
    }

    if (logging) {
      if (!canEdit('bot')) {
        return res.status(403).json({ error: 'You do not have permission to modify Logging settings.' });
      }
      settingsUpdates.logging = logging;
    }

    if (music) {
      if (!canEdit('music')) {
        return res.status(403).json({ error: 'You do not have permission to modify Music settings.' });
      }
      const isPrem = await isPremium(guildId);
      if (music.twentyFourSeven === true && !isPrem) {
        return res.status(403).json({ error: '24/7 Playback requires Nishanka Premium.' });
      }
      settingsUpdates.music = music;
    }

    if (economy) {
      settingsUpdates.economy = economy;
    }

    if (dashboardPermissions) {
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ error: 'Only server Owners or Administrators can modify Dashboard Permissions.' });
      }
      settingsUpdates.dashboardPermissions = dashboardPermissions;
    }

    // Save GuildSettings
    if (Object.keys(settingsUpdates).length > 0) {
      await GuildSettings.findOneAndUpdate({ guildId }, { $set: settingsUpdates }, { upsert: true, new: true });
    }

    // Save AutoMod
    if (autoMod) {
      if (!canEdit('automod')) {
        return res.status(403).json({ error: 'You do not have permission to modify AutoMod settings.' });
      }
      await AutoMod.findOneAndUpdate({ guildId }, { ...autoMod }, { upsert: true, new: true });
      if (client.autoModSettings) client.autoModSettings.delete(guildId);
    }

    // Save Censor
    if (censor) {
      if (!canEdit('censor')) {
        return res.status(403).json({ error: 'You do not have permission to modify Censor settings.' });
      }
      const { getGuildPremiumTier } = require('./utils/premiumPromo');
      const guildTier = await getGuildPremiumTier(guildId);
      const totalWords = (censor.hardcoreWords || []).length + (censor.restrictedWords || []).length;
      
      let censorLimit = 30;
      if (guildTier === 'lite') censorLimit = 100;
      else if (guildTier === 'pro') censorLimit = 300;
      else if (guildTier === 'network' || guildTier === 'lifetime') censorLimit = Infinity;

      if (totalWords > censorLimit) {
        return res.status(403).json({ error: `Your server's tier (${guildTier.toUpperCase()}) is limited to ${censorLimit} censored words. Get Premium starting as low as $1.99/mo (VERY CHEAP!) to unlock higher limits!` });
      }
      await Censor.findOneAndUpdate({ guildId }, { ...censor }, { upsert: true, new: true });
      if (client.censorCache) client.censorCache.delete(guildId);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Save settings error:', err);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// --- Giveaways API Helper ---
async function endAndAnnounceGiveaway(giveaway, earlyEndedBy = null) {
  if (giveaway.ended) return;
  giveaway.ended = true;
  await giveaway.save();

  const guild = client.guilds.cache.get(giveaway.guildId);
  if (!guild) return;

  const channel = guild.channels.cache.get(giveaway.channelId);
  if (!channel) return;

  const winnerMessage = await channel.messages.fetch(giveaway.messageId).catch(() => null);
  if (!winnerMessage) return;

  const reaction = winnerMessage.reactions.cache.get('🎉');
  if (!reaction) {
    const noWinnerEmbed = new EmbedBuilder()
      .setColor(0x2f3136)
      .setTitle('🎉 Giveaway Ended! 🎉')
      .setDescription(`Prize: **${giveaway.prize}**\nNo winner(s) - Not enough participants.`)
      .setTimestamp()
      .setFooter({ text: 'Giveaway ended' });
    await winnerMessage.edit({ embeds: [noWinnerEmbed] }).catch(() => {});
    channel.send(`Giveaway for **${giveaway.prize}** ended${earlyEndedBy ? ' early via dashboard' : ''}, but no participants reacted.`).catch(() => {});
    return;
  }

  const users = await reaction.users.fetch();
  const nonBotUsers = users.filter(user => !user.bot && user.id !== giveaway.hostId);

  const MemberStats = require('./models/MemberStats');
  
  // Filter nonBotUsers by requirements
  let validUsers = new Map();
  for (const [id, user] of nonBotUsers) {
    let member;
    try {
      member = await guild.members.fetch(id);
    } catch (err) {
      continue; // Member left the server
    }

    if (giveaway.requirements?.reqRoleId && !member.roles.cache.has(giveaway.requirements.reqRoleId)) {
      continue;
    }

    let meetsMsgReq = true;
    let meetsInvReq = true;

    if (giveaway.requirements?.minMessages > 0 || giveaway.requirements?.minInvites > 0) {
      const stats = await MemberStats.findOne({ guildId: guild.id, userId: id });
      if (giveaway.requirements.minMessages > 0 && (!stats || stats.messagesCount < giveaway.requirements.minMessages)) {
        meetsMsgReq = false;
      }
      if (giveaway.requirements.minInvites > 0 && (!stats || stats.invitesCount < giveaway.requirements.minInvites)) {
        meetsInvReq = false;
      }
    }

    if (meetsMsgReq && meetsInvReq) {
      validUsers.set(id, user);
    }
  }

  if (validUsers.size === 0) {
    const noWinnerEmbed = new EmbedBuilder()
      .setColor(0x2f3136)
      .setTitle('🎉 Giveaway Ended! 🎉')
      .setDescription(`Prize: **${giveaway.prize}**\nNo winner(s) - Not enough participants.`)
      .setTimestamp()
      .setFooter({ text: 'Giveaway ended' });
    await winnerMessage.edit({ embeds: [noWinnerEmbed] }).catch(() => {});
    channel.send(`Giveaway for **${giveaway.prize}** ended${earlyEndedBy ? ' early via dashboard' : ''}, but no valid participants met the requirements.`).catch(() => {});
    return;
  }

  const validUsersArray = Array.from(validUsers.values());
  const winners = [];
  const countToPick = Math.min(giveaway.winnerCount, validUsersArray.length);
  for (let i = 0; i < countToPick; i++) {
    const randIndex = Math.floor(Math.random() * validUsersArray.length);
    winners.push(validUsersArray[randIndex]);
    validUsersArray.splice(randIndex, 1);
  }

  const winnersMentions = winners.map(user => `<@${user.id}>`).join(', ');
  const endEmbed = new EmbedBuilder()
    .setColor(0x2f3136)
    .setTitle('🎉 Giveaway Ended! 🎉')
    .setDescription(`Prize: **${giveaway.prize}**\nWinner(s): ${winnersMentions}`)
    .setTimestamp()
    .setFooter({ text: 'Giveaway ended' });

  await winnerMessage.edit({ embeds: [endEmbed] }).catch(() => {});
  channel.send(`🎉 Congratulations ${winnersMentions}! You won **${giveaway.prize}**!${earlyEndedBy ? ' (Ended early via dashboard)' : ''}`).catch(() => {});
}

// --- Giveaways API ---
app.get('/api/guilds/:guildId/giveaways', async (req, res) => {
  const { guildId } = req.params;
  const hasAccess = await checkGuildAccess(req, guildId);
  if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

  try {
    const Giveaway = require('./models/Giveaway');
    const giveaways = await Giveaway.find({ guildId }).lean();
    res.json(giveaways);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch giveaways' });
  }
});

app.post('/api/guilds/:guildId/giveaways', express.json(), async (req, res) => {
  const { guildId } = req.params;
  const hasAccess = await checkGuildAccess(req, guildId);
  if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

  const canEdit = await checkPermission(req, guildId, 'giveaways');
  if (!canEdit) return res.status(403).json({ error: 'You do not have permission to modify Giveaways.' });

  const { channelId, prize, duration, winners, reqMessages, reqInvites, reqRole } = req.body;
  const ms = require('ms');
  const msValue = ms(duration);
  if (!msValue) return res.status(400).json({ error: 'Invalid duration' });

  try {
    const { getGuildPremiumTier } = require('./utils/premiumPromo');
    const guildTier = await getGuildPremiumTier(guildId);
    const Giveaway = require('./models/Giveaway');
    const activeCount = await Giveaway.countDocuments({ guildId, ended: false });
    
    let giveawayLimit = 1;
    if (guildTier === 'lite') giveawayLimit = 5;
    else if (guildTier === 'pro') giveawayLimit = 15;
    else if (guildTier === 'network' || guildTier === 'lifetime') giveawayLimit = Infinity;

    if (activeCount >= giveawayLimit) {
      return res.status(403).json({ error: `Your server's tier (${guildTier.toUpperCase()}) is limited to ${giveawayLimit} active giveaways. Get Premium starting as low as $1.99/mo (VERY CHEAP!) to unlock higher limits!` });
    }

    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(400).json({ error: 'Guild not found' });
    const channel = guild.channels.cache.get(channelId);
    if (!channel || !channel.isTextBased()) return res.status(400).json({ error: 'Invalid channel' });

    let reqText = '';
    if (reqMessages > 0) reqText += `\n💬 Messages: **${reqMessages}**`;
    if (reqInvites > 0) reqText += `\n✉️ Invites: **${reqInvites}**`;
    if (reqRole) reqText += `\n🛡️ Role: <@&${reqRole}>`;

    const hostDisplay = req.session.user ? `<@${req.session.user.id}>` : 'Dashboard';

    const { EmbedBuilder } = require('discord.js');
    const embed = new EmbedBuilder()
        .setColor(0x2f3136)
        .setTitle('🎉 New Giveaway! 🎉')
        .setDescription(`Prize: **${prize}**\nReact with 🎉 to enter!${reqText ? '\n\n**Requirements:**' + reqText : ''}`)
        .addFields(
            { name: 'Duration:', value: duration, inline: true },
            { name: 'Hosted By:', value: hostDisplay, inline: true },
            { name: 'Winners:', value: `${winners}`, inline: true }
        )
        .setTimestamp(Date.now() + msValue)
        .setFooter({ text: 'Giveaway ends at' });

    const m = await channel.send({ embeds: [embed] });
    await m.react('🎉');

    const giveaway = new Giveaway({
        messageId: m.id,
        channelId: channel.id,
        guildId: guild.id,
        prize: prize,
        winnerCount: winners,
        endTime: new Date(Date.now() + msValue),
        hostId: req.session.user?.id || client.user.id,
        requirements: {
            minMessages: reqMessages || 0,
            minInvites: reqInvites || 0,
            reqRoleId: reqRole || null
        }
    });

    await giveaway.save();
    
    setTimeout(async () => {
        const g = await Giveaway.findOne({ messageId: m.id });
        if (g && !g.ended) {
            await endAndAnnounceGiveaway(g);
        }
    }, msValue);

    res.json(giveaway);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create giveaway' });
  }
});

app.put('/api/guilds/:guildId/giveaways/:messageId', express.json(), async (req, res) => {
  const { guildId, messageId } = req.params;
  const hasAccess = await checkGuildAccess(req, guildId);
  if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

  const canEdit = await checkPermission(req, guildId, 'giveaways');
  if (!canEdit) return res.status(403).json({ error: 'You do not have permission to modify Giveaways.' });

  const { prize, winners, reqMessages, reqInvites, reqRole } = req.body;

  try {
    const Giveaway = require('./models/Giveaway');
    const giveaway = await Giveaway.findOne({ messageId, guildId });
    if (!giveaway) return res.status(404).json({ error: 'Giveaway not found' });
    if (giveaway.ended) return res.status(400).json({ error: 'Giveaway already ended' });

    giveaway.prize = prize || giveaway.prize;
    giveaway.winnerCount = winners !== undefined ? parseInt(winners) || giveaway.winnerCount : giveaway.winnerCount;
    if (!giveaway.requirements) giveaway.requirements = {};
    giveaway.requirements.minMessages = reqMessages !== undefined ? parseInt(reqMessages) || 0 : giveaway.requirements.minMessages;
    giveaway.requirements.minInvites = reqInvites !== undefined ? parseInt(reqInvites) || 0 : giveaway.requirements.minInvites;
    giveaway.requirements.reqRoleId = reqRole !== undefined ? reqRole || null : giveaway.requirements.reqRoleId;

    await giveaway.save();

    // Now edit the Discord message embed
    const guild = client.guilds.cache.get(guildId);
    if (guild) {
        const channel = guild.channels.cache.get(giveaway.channelId);
        if (channel) {
            const m = await channel.messages.fetch(messageId).catch(() => null);
            if (m && m.embeds && m.embeds[0]) {
                const oldEmbed = m.embeds[0];
                let reqText = '';
                if (giveaway.requirements.minMessages > 0) reqText += `\n💬 Messages: **${giveaway.requirements.minMessages}**`;
                if (giveaway.requirements.minInvites > 0) reqText += `\n✉️ Invites: **${giveaway.requirements.minInvites}**`;
                if (giveaway.requirements.reqRoleId) reqText += `\n🛡️ Role: <@&${giveaway.requirements.reqRoleId}>`;

                const hostedByField = oldEmbed.fields.find(f => f.name === 'Hosted By:');
                const durationField = oldEmbed.fields.find(f => f.name === 'Duration:');

                const newEmbed = EmbedBuilder.from(oldEmbed)
                    .setTitle('🎉 New Giveaway! 🎉')
                    .setDescription(`Prize: **${giveaway.prize}**\nReact with 🎉 to enter!${reqText ? '\n\n**Requirements:**' + reqText : ''}`)
                    .setFields([
                        { name: 'Duration:', value: durationField ? durationField.value : 'Active', inline: true },
                        { name: 'Hosted By:', value: hostedByField ? hostedByField.value : 'Dashboard', inline: true },
                        { name: 'Winners:', value: `${giveaway.winnerCount}`, inline: true }
                    ]);
                await m.edit({ embeds: [newEmbed] }).catch(() => {});
            }
        }
    }

    res.json(giveaway);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update giveaway' });
  }
});

app.post('/api/guilds/:guildId/embed', express.json(), async (req, res) => {
  const { guildId } = req.params;
  const hasAccess = await checkGuildAccess(req, guildId);
  if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

  const canEdit = await checkPermission(req, guildId, 'embed');
  if (!canEdit) return res.status(403).json({ error: 'You do not have permission to create embeds.' });

  const { channelId, title, description, color, author, footer, textPing } = req.body;

  try {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(400).json({ error: 'Guild not found' });
    const channel = guild.channels.cache.get(channelId);
    if (!channel || !channel.isTextBased()) return res.status(400).json({ error: 'Invalid channel' });

    const { EmbedBuilder } = require('discord.js');
    const embed = new EmbedBuilder();
    
    if (title) embed.setTitle(title);
    if (description) embed.setDescription(description);
    if (color) embed.setColor(color);
    if (author) embed.setAuthor({ name: author });
    if (footer) embed.setFooter({ text: footer });

    // Validate that the embed isn't completely empty
    if (!title && !description && !author && !footer) {
      return res.status(400).json({ error: 'Embed must have at least a title, description, author, or footer.' });
    }

    const payload = { embeds: [embed] };
    if (textPing) payload.content = textPing;

    await channel.send(payload);
    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to send embed:', err);
    res.status(500).json({ error: 'Failed to send embed' });
  }
});

// --- Triggers ---
app.get('/api/guilds/:guildId/triggers', async (req, res) => {
  const { guildId } = req.params;
  const hasAccess = await checkGuildAccess(req, guildId);
  if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

  try {
    const Trigger = require('./models/triggerSchema');
    const triggers = await Trigger.find({ guildId });
    res.json(triggers);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch triggers' });
  }
});

app.post('/api/guilds/:guildId/triggers', express.json(), async (req, res) => {
  const { guildId } = req.params;
  const hasAccess = await checkGuildAccess(req, guildId);
  if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

  const canEdit = await checkPermission(req, guildId, 'triggers');
  if (!canEdit) return res.status(403).json({ error: 'You do not have permission to modify Triggers.' });

  try {
    const { triggerWord, matchType, response } = req.body;
    if (!triggerWord) return res.status(400).json({ error: 'triggerWord required' });

    const Trigger = require('./models/triggerSchema');

    // Check limit if adding new
    const existing = await Trigger.findOne({ guildId, triggerWord: triggerWord.toLowerCase() });
    if (!existing) {
      const { getGuildPremiumTier } = require('./utils/premiumPromo');
      const guildTier = await getGuildPremiumTier(guildId);
      const count = await Trigger.countDocuments({ guildId });

      let triggerLimit = 3;
      if (guildTier === 'lite') triggerLimit = 20;
      else if (guildTier === 'pro') triggerLimit = 50;
      else if (guildTier === 'network' || guildTier === 'lifetime') triggerLimit = Infinity;

      if (count >= triggerLimit) {
        return res.status(403).json({ error: `Your server's tier (${guildTier.toUpperCase()}) is limited to ${triggerLimit} custom triggers. Get Premium starting as low as $1.99/mo (VERY CHEAP!) to unlock higher limits!` });
      }
    }

    const trigger = await Trigger.findOneAndUpdate(
        { guildId, triggerWord: triggerWord.toLowerCase() },
        { matchType, response },
        { upsert: true, new: true }
    );
    
    if (client.triggerCache) client.triggerCache.delete(guildId);
    
    res.json(trigger);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save trigger' });
  }
});

app.put('/api/guilds/:guildId/triggers/:id', express.json(), async (req, res) => {
  const { guildId, id } = req.params;
  const hasAccess = await checkGuildAccess(req, guildId);
  if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

  const canEdit = await checkPermission(req, guildId, 'triggers');
  if (!canEdit) return res.status(403).json({ error: 'You do not have permission to modify Triggers.' });

  try {
    const { triggerWord, matchType, response } = req.body;
    if (!triggerWord) return res.status(400).json({ error: 'triggerWord required' });

    const Trigger = require('./models/triggerSchema');
    const trigger = await Trigger.findOneAndUpdate(
        { _id: id, guildId },
        { triggerWord: triggerWord.toLowerCase(), matchType, response },
        { new: true }
    );
    if (!trigger) return res.status(404).json({ error: 'Trigger not found' });
    
    if (client.triggerCache) client.triggerCache.delete(guildId);
    
    res.json(trigger);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save trigger' });
  }
});

app.delete('/api/guilds/:guildId/triggers/:id', async (req, res) => {
  const { guildId, id } = req.params;
  const hasAccess = await checkGuildAccess(req, guildId);
  if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

  const canEdit = await checkPermission(req, guildId, 'triggers');
  if (!canEdit) return res.status(403).json({ error: 'You do not have permission to modify Triggers.' });

  try {
    const Trigger = require('./models/triggerSchema');
    await Trigger.findByIdAndDelete(id);
    if (client.triggerCache) client.triggerCache.delete(guildId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete trigger' });
  }
});

app.delete('/api/guilds/:guildId/giveaways/:messageId', async (req, res) => {
  const { guildId, messageId } = req.params;
  const hasAccess = await checkGuildAccess(req, guildId);
  if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

  const canEdit = await checkPermission(req, guildId, 'giveaways');
  if (!canEdit) return res.status(403).json({ error: 'You do not have permission to modify Giveaways.' });

  try {
    const Giveaway = require('./models/Giveaway');
    const g = await Giveaway.findOneAndDelete({ messageId, guildId });
    if (!g) return res.status(404).json({ error: 'Giveaway not found' });
    
    const guild = client.guilds.cache.get(guildId);
    if (guild) {
        const channel = guild.channels.cache.get(g.channelId);
        if (channel) {
            const m = await channel.messages.fetch(messageId).catch(()=>null);
            if (m) await m.delete().catch(()=>null);
        }
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete giveaway' });
  }
});

app.post('/api/guilds/:guildId/giveaways/:messageId/end', async (req, res) => {
  const { guildId, messageId } = req.params;
  const hasAccess = await checkGuildAccess(req, guildId);
  if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

  const canEdit = await checkPermission(req, guildId, 'giveaways');
  if (!canEdit) return res.status(403).json({ error: 'You do not have permission to modify Giveaways.' });

  try {
    const Giveaway = require('./models/Giveaway');
    const giveaway = await Giveaway.findOne({ messageId, guildId });
    if (!giveaway) return res.status(404).json({ error: 'Giveaway not found' });
    if (giveaway.ended) return res.status(400).json({ error: 'Already ended' });

    // Pick winners immediately and announce
    await endAndAnnounceGiveaway(giveaway, true);
    res.json(giveaway);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to end giveaway' });
  }
});

// --- Media Only Channels ---
app.get('/api/guilds/:guildId/media-only-channels', async (req, res) => {
  const { guildId } = req.params;
  const hasAccess = await checkGuildAccess(req, guildId);
  if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

  try {
    const MediaOnly = require('./models/mediaOnlySchema');
    const channels = await MediaOnly.find({ guildId }).lean();
    res.json(channels);
  } catch (err) {
    console.error('Failed to fetch media-only channels:', err);
    res.status(500).json({ error: 'Failed to fetch media-only channels' });
  }
});

app.post('/api/guilds/:guildId/media-only-channels', express.json(), async (req, res) => {
  const { guildId } = req.params;
  const hasAccess = await checkGuildAccess(req, guildId);
  if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

  const canEdit = await checkPermission(req, guildId, 'mediaonly');
  if (!canEdit) return res.status(403).json({ error: 'You do not have permission to modify Media Only channels.' });

  try {
    const { channelId, enabled, customWarning, createThread, applyToEveryone } = req.body;
    if (!channelId) return res.status(400).json({ error: 'channelId required' });

    const isPrem = await isPremium(guildId);
    const MediaOnly = require('./models/mediaOnlySchema');
    
    // Check limit if adding new
    const existing = await MediaOnly.findOne({ guildId, channelId });
    if (!existing) {
      const count = await MediaOnly.countDocuments({ guildId });
      if (count >= 1 && !isPrem) {
        return res.status(403).json({ error: 'Free servers are limited to 1 media-only channel. Get Premium starting as low as $1.99/mo (VERY CHEAP!) to unlock unlimited!' });
      }
    }
    
    const updateData = {};
    if (enabled !== undefined) updateData.enabled = (enabled !== false);
    if (customWarning !== undefined) updateData.customWarning = customWarning;
    if (createThread !== undefined) updateData.createThread = (createThread !== false);
    if (applyToEveryone !== undefined) updateData.applyToEveryone = (applyToEveryone === true);

    const mediaChannel = await MediaOnly.findOneAndUpdate(
      { guildId, channelId },
      { $set: updateData },
      { upsert: true, new: true }
    );
    res.json(mediaChannel);
  } catch (err) {
    console.error('Failed to save media-only channel:', err);
    res.status(500).json({ error: 'Failed to save media-only channel' });
  }
});

app.delete('/api/guilds/:guildId/media-only-channels/:channelId', async (req, res) => {
  const { guildId, channelId } = req.params;
  const hasAccess = await checkGuildAccess(req, guildId);
  if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

  const canEdit = await checkPermission(req, guildId, 'mediaonly');
  if (!canEdit) return res.status(403).json({ error: 'You do not have permission to modify Media Only channels.' });

  try {
    const MediaOnly = require('./models/mediaOnlySchema');
    const result = await MediaOnly.deleteOne({ guildId, channelId });
    res.json({ ok: result.deletedCount > 0 });
  } catch (err) {
    console.error('Failed to delete media-only channel:', err);
    res.status(500).json({ error: 'Failed to delete media-only channel' });
  }
});

// --- Reputation System Dashboard API ---
app.get('/api/guilds/:guildId/reputation', async (req, res) => {
  const { guildId } = req.params;
  const hasAccess = await checkGuildAccess(req, guildId);
  if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

  try {
    const MemberStats = require('./models/MemberStats');
    const guild = client.guilds.cache.get(guildId);
    const stats = await MemberStats.find({ guildId }).sort({ reputation: -1 }).lean();

    const leaderboard = [];
    for (const entry of stats) {
      if (!entry.reputation) continue; // skip zero rep members
      let username = entry.userId;
      let displayName = '';
      let avatarUrl = '';
      if (guild) {
        try {
          const member = await guild.members.fetch(entry.userId).catch(() => null);
          if (member) {
            username = member.user.username;
            displayName = member.displayName;
            avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 64 }) || '';
          } else {
            const user = await client.users.fetch(entry.userId).catch(() => null);
            if (user) {
              username = user.username;
              avatarUrl = user.displayAvatarURL({ extension: 'png', size: 64 }) || '';
            }
          }
        } catch (err) {}
      }
      leaderboard.push({
        userId: entry.userId,
        reputation: entry.reputation,
        lastRepGivenAt: entry.lastRepGivenAt,
        username,
        displayName,
        avatarUrl
      });
    }
    res.json(leaderboard);
  } catch (err) {
    console.error('Failed to fetch reputation leaderboard:', err);
    res.status(500).json({ error: 'Failed to fetch reputation leaderboard' });
  }
});

app.post('/api/guilds/:guildId/reputation/reset', express.json(), async (req, res) => {
  const { guildId } = req.params;
  const hasAccess = await checkGuildAccess(req, guildId);
  if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

  const guild = client.guilds.cache.get(guildId);
  if (!guild) return res.status(404).json({ error: 'Bot is not in this guild' });
  
  let isOwner = guild.ownerId === req.session.user.id;
  let isAdmin = false;
  try {
    const member = await guild.members.fetch(req.session.user.id);
    isAdmin = member.permissions.has('Administrator') || isOwner;
  } catch (err) {}

  if (!isAdmin) {
    return res.status(403).json({ error: 'Only server administrators can reset reputation.' });
  }

  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const MemberStats = require('./models/MemberStats');
    await MemberStats.findOneAndUpdate(
      { guildId, userId },
      { $set: { reputation: 0 } }
    );
    res.json({ ok: true, userId });
  } catch (err) {
    console.error('Failed to reset user reputation:', err);
    res.status(500).json({ error: 'Failed to reset user reputation' });
  }
});

app.post('/api/guilds/:guildId/reputation/reset-all', express.json(), async (req, res) => {
  const { guildId } = req.params;
  const hasAccess = await checkGuildAccess(req, guildId);
  if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

  const guild = client.guilds.cache.get(guildId);
  if (!guild) return res.status(404).json({ error: 'Bot is not in this guild' });
  
  let isOwner = guild.ownerId === req.session.user.id;
  let isAdmin = false;
  try {
    const member = await guild.members.fetch(req.session.user.id);
    isAdmin = member.permissions.has('Administrator') || isOwner;
  } catch (err) {}

  if (!isAdmin) {
    return res.status(403).json({ error: 'Only server administrators can reset reputation.' });
  }

  try {
    const MemberStats = require('./models/MemberStats');
    await MemberStats.updateMany({ guildId }, { $set: { reputation: 0 } });
    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to reset all reputation:', err);
    res.status(500).json({ error: 'Failed to reset all reputation' });
  }
});

// ─── User Profile & Personal Economy Dashboard API ──────────────────────────────

function webIsToday(date) {
    if (!date) return false;
    const now = new Date();
    return date.getFullYear() === now.getFullYear() &&
           date.getMonth() === now.getMonth() &&
           date.getDate() === now.getDate();
}

function webFormatTimeRemaining(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);
    return parts.join(' ');
}

function getWebDailyRarity(amount) {
    if (amount <= 1100) return { tier: 'Common', name: 'Mildly Disappointing Pocket Lint' };
    if (amount <= 1350) return { tier: 'Uncommon', name: 'Slightly Spicy Loose Change' };
    if (amount <= 1600) return { tier: 'Rare', name: 'Glow-in-the-Dark Jackpot' };
    if (amount <= 1750) return { tier: 'Epic', name: 'Hypnotic Glitter Explosion' };
    return { tier: 'Legendary', name: 'Deity-Tier Shiny Sparkler' };
}

app.get('/api/user/profile', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Not authenticated' });
  const userId = req.session.user.id;

  try {
    const Profile = require('./models/profileSchema');
    const Bauble = require('./models/baubleSchema');

    let profile = await Profile.findOne({ userId }).lean();
    if (!profile) {
      profile = {
        userId,
        bio: 'This is my bio!',
        bannerColor: '#7289DA',
        customDisplayName: '',
        pfpUrl: '',
        bannerUrl: '',
        private: false,
        showBaubles: true,
        dmOnRobbed: true
      };
    }

    let baublesData = await Bauble.findOne({ userId }).lean();
    if (!baublesData) {
      baublesData = {
        userId,
        baubles: 0,
        inventory: [],
        dailyStreak: 0,
        dailyMaxStreak: 0,
        dailyLastClaimed: null,
        weeklyLastClaimed: null,
        coffeeExpiresAt: null,
        luckExpiresAt: null,
        passiveMode: false,
        dailyWorkLastCompleted: null,
        dailyGameLastCompleted: null,
        dailyGambleLastCompleted: null,
        dailyTasksClaimedAt: null
      };
    }

    const hasPaintbrush = baublesData.inventory ? baublesData.inventory.some(item => item.itemId === 'paintbrush' && item.quantity > 0) : false;

    // Calculate tasks checklist details
    const checklistStatus = {
      daily: webIsToday(baublesData.dailyLastClaimed),
      work: webIsToday(baublesData.dailyWorkLastCompleted),
      game: webIsToday(baublesData.dailyGameLastCompleted),
      gamble: webIsToday(baublesData.dailyGambleLastCompleted),
      claimed: webIsToday(baublesData.dailyTasksClaimedAt),
    };
    let completedCount = 0;
    if (checklistStatus.daily) completedCount++;
    if (checklistStatus.work) completedCount++;
    if (checklistStatus.game) completedCount++;
    if (checklistStatus.gamble) completedCount++;
    checklistStatus.completedCount = completedCount;
    checklistStatus.allCompleted = completedCount === 4;

    const { getUserAchievements, ACHIEVEMENTS } = require('./utils/achievements');
    const userAchievements = await getUserAchievements(userId);

    res.json({
      profile,
      baubles: baublesData,
      hasPaintbrush,
      checklist: checklistStatus,
      user: req.session.user,
      achievements: userAchievements,
      allAchievements: ACHIEVEMENTS
    });
  } catch (err) {
    console.error('Failed to fetch user profile via web:', err);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

app.post('/api/user/profile', express.json(), async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Not authenticated' });
  const userId = req.session.user.id;
  const { bio, bannerColor, customDisplayName, bannerUrl, private: isPrivate, showBaubles, dmOnRobbed } = req.body;

  try {
    const Profile = require('./models/profileSchema');
    const Bauble = require('./models/baubleSchema');

    // Check Paintbrush requirement if bannerColor or bannerUrl is changing
    let currentProfile = await Profile.findOne({ userId }).lean();
    const isBannerColorChanging = bannerColor && (!currentProfile || currentProfile.bannerColor !== bannerColor);
    const isBannerUrlChanging = bannerUrl !== undefined && (!currentProfile || currentProfile.bannerUrl !== bannerUrl);

    if (isBannerColorChanging || isBannerUrlChanging) {
      const baublesData = await Bauble.findOne({ userId }).lean();
      const hasPaintbrush = baublesData?.inventory ? baublesData.inventory.some(item => item.itemId === 'paintbrush' && item.quantity > 0) : false;
      if (!hasPaintbrush) {
        return res.status(403).json({ error: 'You need a Profile Paintbrush in your inventory to customize your profile banner!' });
      }
    }

    const updateData = {};
    if (bio !== undefined) updateData.bio = bio;
    if (bannerColor !== undefined) updateData.bannerColor = bannerColor;
    if (customDisplayName !== undefined) updateData.customDisplayName = customDisplayName;
    if (bannerUrl !== undefined) updateData.bannerUrl = bannerUrl;
    if (isPrivate !== undefined) updateData.private = isPrivate;
    if (showBaubles !== undefined) updateData.showBaubles = showBaubles;
    if (dmOnRobbed !== undefined) updateData.dmOnRobbed = dmOnRobbed;

    const profile = await Profile.findOneAndUpdate(
      { userId },
      { $set: updateData },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      profile
    });
  } catch (err) {
    console.error('Failed to save user profile via web:', err);
    res.status(500).json({ error: 'Failed to save user profile' });
  }
});

app.post('/api/user/daily', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Not authenticated' });
  const userId = req.session.user.id;

  try {
    const Bauble = require('./models/baubleSchema');
    let baubleData = await Bauble.findOne({ userId });
    if (!baubleData) {
      baubleData = new Bauble({ userId, baubles: 0 });
      await baubleData.save();
    }

    const now = new Date();
    const lastClaimed = baubleData.dailyLastClaimed;
    const cooldownMs = 24 * 60 * 60 * 1000;
    const breakWindowMs = 48 * 60 * 60 * 1000;

    if (lastClaimed) {
      const diff = now.getTime() - lastClaimed.getTime();
      if (diff < cooldownMs) {
        const timeLeft = cooldownMs - diff;
        return res.status(400).json({ error: `Too early! Cooldown active for another ${webFormatTimeRemaining(timeLeft)}.` });
      }

      if (diff >= breakWindowMs) {
        baubleData.dailyStreak = 0;
      }
    }

    baubleData.dailyStreak = (baubleData.dailyStreak || 0) + 1;
    if (baubleData.dailyStreak > (baubleData.dailyMaxStreak || 0)) {
      baubleData.dailyMaxStreak = baubleData.dailyStreak;
    }

    const baseReward = Math.floor(Math.random() * 901) + 900;
    const streakBonus = Math.min((baubleData.dailyStreak - 1) * 20, 500);
    const totalReward = baseReward + streakBonus;

    baubleData.baubles = (baubleData.baubles || 0) + totalReward;
    baubleData.dailyLastClaimed = now;
    await baubleData.save();

    const rarity = getWebDailyRarity(baseReward);

    res.json({
      success: true,
      totalReward,
      baseReward,
      streakBonus,
      newBalance: baubleData.baubles,
      dailyStreak: baubleData.dailyStreak,
      rarity: `[${rarity.tier}] ${rarity.name}`
    });
  } catch (err) {
    console.error('Failed to claim daily via web:', err);
    res.status(500).json({ error: 'Failed to claim daily reward' });
  }
});

app.post('/api/user/checklist/claim', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Not authenticated' });
  const userId = req.session.user.id;

  try {
    const Bauble = require('./models/baubleSchema');
    let baubleData = await Bauble.findOne({ userId });
    if (!baubleData) {
      baubleData = new Bauble({ userId, baubles: 0 });
      await baubleData.save();
    }

    const daily = webIsToday(baubleData.dailyLastClaimed);
    const work = webIsToday(baubleData.dailyWorkLastCompleted);
    const game = webIsToday(baubleData.dailyGameLastCompleted);
    const gamble = webIsToday(baubleData.dailyGambleLastCompleted);
    const claimed = webIsToday(baubleData.dailyTasksClaimedAt);

    let completedCount = 0;
    if (daily) completedCount++;
    if (work) completedCount++;
    if (game) completedCount++;
    if (gamble) completedCount++;

    if (claimed) {
      return res.status(400).json({ error: 'Checklist reward already claimed today!' });
    }
    if (completedCount < 4) {
      return res.status(400).json({ error: `Checklist incomplete! (${completedCount}/4 completed)` });
    }

    baubleData.baubles = (baubleData.baubles || 0) + 2000;
    if (!baubleData.inventory) baubleData.inventory = [];
    const mysteryBox = baubleData.inventory.find(item => item.itemId === 'mystery_box');
    if (mysteryBox) {
        mysteryBox.quantity += 1;
    } else {
        baubleData.inventory.push({ itemId: 'mystery_box', quantity: 1 });
    }
    baubleData.dailyTasksClaimedAt = new Date();
    await baubleData.save();

    res.json({
      success: true,
      newBalance: baubleData.baubles
    });
  } catch (err) {
    console.error('Failed to claim checklist via web:', err);
    res.status(500).json({ error: 'Failed to claim checklist' });
  }
});

app.post('/api/user/use-item', express.json(), async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Not authenticated' });
  const userId = req.session.user.id;
  const { itemId } = req.body;

  if (!['coffee', 'clover', 'mystery_box'].includes(itemId)) {
    return res.status(400).json({ error: 'Item cannot be used via web or invalid item ID.' });
  }

  try {
    const Bauble = require('./models/baubleSchema');
    let baubleData = await Bauble.findOne({ userId });
    if (!baubleData) {
      return res.status(400).json({ error: 'Profile not found.' });
    }

    const hasItem = baubleData.inventory && baubleData.inventory.some(i => i.itemId === itemId && i.quantity > 0);
    if (!hasItem) {
      return res.status(400).json({ error: 'You do not own this item.' });
    }

    const addInvItem = (data, id, qty = 1) => {
      if (!data.inventory) data.inventory = [];
      const existing = data.inventory.find(i => i.itemId === id);
      if (existing) existing.quantity += qty;
      else data.inventory.push({ itemId: id, quantity: qty });
    };

    const removeInvItem = (data, id, qty = 1) => {
      if (!data.inventory) return false;
      const idx = data.inventory.findIndex(i => i.itemId === id);
      if (idx === -1) return false;
      if (data.inventory[idx].quantity < qty) return false;
      data.inventory[idx].quantity -= qty;
      if (data.inventory[idx].quantity <= 0) data.inventory.splice(idx, 1);
      return true;
    };

    let useMsg = '';
    if (itemId === 'coffee') {
      removeInvItem(baubleData, 'coffee', 1);
      baubleData.coffeeExpiresAt = new Date(Date.now() + 1800000);
      useMsg = '☕ You drank the Energizing Coffee! Work and scavenge cooldowns reduced by 50% for 30 minutes.';
    } else if (itemId === 'clover') {
      removeInvItem(baubleData, 'clover', 1);
      baubleData.luckExpiresAt = new Date(Date.now() + 900000);
      useMsg = '🍀 You rubbed the Lucky Clover! Win rates boosted by +10% for 15 minutes.';
    } else if (itemId === 'mystery_box') {
      removeInvItem(baubleData, 'mystery_box', 1);
      const rng = Math.random();
      if (rng < 0.4) {
          const bonus = Math.floor(Math.random() * 301) + 100;
          baubleData.baubles += bonus;
          useMsg = `📦 You opened the Mystery Box and found 💰 ${bonus} Glimmering Baubles!`;
      } else if (rng < 0.6) {
          addInvItem(baubleData, 'coffee', 1);
          useMsg = '📦 You opened the Mystery Box and found ☕ Energizing Coffee!';
      } else if (rng < 0.8) {
          addInvItem(baubleData, 'clover', 1);
          useMsg = '📦 You opened the Mystery Box and found 🍀 Lucky Clover!';
      } else {
          addInvItem(baubleData, 'shield', 1);
          useMsg = '📦 You opened the Mystery Box and found 🛡️ Aegis Shield!';
      }
    }

    await baubleData.save();
    res.json({
      success: true,
      message: useMsg,
      newBalance: baubleData.baubles,
      inventory: baubleData.inventory
    });
  } catch (err) {
    console.error('Failed to use item via web:', err);
    res.status(500).json({ error: 'Failed to use item' });
  }
});

// --- Global Leaderboard API ---
app.get('/api/leaderboard', async (req, res) => {
  try {
    const Bauble = require('./models/baubleSchema');
    const { type } = req.query;

    let sortQuery = { baubles: -1 };
    let field = 'baubles';

    if (type === 'daily') {
      sortQuery = { dailyMaxStreak: -1 };
      field = 'dailyMaxStreak';
    } else if (type === 'coinflip') {
      sortQuery = { coinflipMaxStreak: -1 };
      field = 'coinflipMaxStreak';
    } else if (type === 'gamble') {
      sortQuery = { gambleMaxStreak: -1 };
      field = 'gambleMaxStreak';
    } else if (type === 'slots') {
      sortQuery = { slotsMaxStreak: -1 };
      field = 'slotsMaxStreak';
    } else if (type === 'blackjack') {
      sortQuery = { blackjackMaxStreak: -1 };
      field = 'blackjackMaxStreak';
    } else if (type === 'animebattle') {
      sortQuery = { animebattleMaxStreak: -1 };
      field = 'animebattleMaxStreak';
    }

    const leaderboardData = await Bauble.find()
      .sort(sortQuery)
      .limit(10)
      .exec();

    const result = await Promise.all(leaderboardData.map(async (entry, index) => {
      let username = 'Unknown User';
      let displayName = entry.userId;
      let avatarUrl = '';
      try {
        const user = await client.users.fetch(entry.userId);
        username = user.username;
        displayName = user.displayName || user.globalName || user.username;
        avatarUrl = user.displayAvatarURL({ dynamic: true, size: 128 });
      } catch (e) {
        // ignore and use fallback
      }
      return {
        rank: index + 1,
        userId: entry.userId,
        username,
        displayName,
        avatarUrl,
        value: entry[field] || 0
      };
    }));

    res.json(result);
  } catch (err) {
    console.error('Failed to fetch web global leaderboard:', err);
    res.status(500).json({ error: 'Failed to fetch global leaderboard' });
  }
});

// --- Global Family API ---
app.get('/api/family', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Not authenticated' });
  const userId = req.session.user.id;

  try {
    const Family = require('./models/familySchema');
    let familyData = await Family.findOne({ userId });
    if (!familyData) {
      familyData = new Family({ userId });
      await familyData.save();
    }

    const resolveUser = async (id) => {
      if (!id) return null;
      try {
        const u = await client.users.fetch(id);
        return {
          userId: u.id,
          username: u.username,
          displayName: u.displayName || u.globalName || u.username,
          avatarUrl: u.displayAvatarURL({ dynamic: true, size: 128 })
        };
      } catch (e) {
        return {
          userId: id,
          username: `user_${id}`,
          displayName: `Unknown User (${id})`,
          avatarUrl: null
        };
      }
    };

    // Find siblings (sharing at least one parent, excluding self)
    let siblingIds = [];
    if (familyData.parents && familyData.parents.length > 0) {
      const siblingDocs = await Family.find({
        userId: { $ne: userId },
        parents: { $in: familyData.parents }
      }).lean();
      siblingIds = siblingDocs.map(d => d.userId);
    }

    const [
      spouse,
      parents,
      children,
      siblings,
      pendingSpouseProposal,
      pendingAdoptionProposals
    ] = await Promise.all([
      resolveUser(familyData.spouseId),
      Promise.all((familyData.parents || []).map(id => resolveUser(id))),
      Promise.all((familyData.children || []).map(id => resolveUser(id))),
      Promise.all(siblingIds.map(id => resolveUser(id))),
      resolveUser(familyData.pendingSpouseProposal),
      Promise.all((familyData.pendingAdoptionProposals || []).map(id => resolveUser(id)))
    ]);

    res.json({
      success: true,
      spouse,
      parents: parents.filter(Boolean),
      children: children.filter(Boolean),
      siblings: siblings.filter(Boolean),
      pendingSpouseProposal,
      pendingAdoptionProposals: pendingAdoptionProposals.filter(Boolean)
    });
  } catch (err) {
    console.error('Failed to fetch global family data:', err);
    res.status(500).json({ error: 'Failed to fetch family data' });
  }
});

app.post('/api/family/action', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Not authenticated' });
  const userId = req.session.user.id;
  const { action, targetId } = req.body;

  try {
    const Family = require('./models/familySchema');
    
    // Helper to get or create family
    const getFamily = async (id) => {
      let f = await Family.findOne({ userId: id });
      if (!f) {
        f = new Family({ userId: id });
        await f.save();
      }
      return f;
    };

    const selfFamily = await getFamily(userId);

    if (action === 'propose') {
      if (!targetId) return res.status(400).json({ error: 'Target ID required' });
      if (targetId === userId) return res.status(400).json({ error: 'You cannot marry yourself!' });
      
      const targetFamily = await getFamily(targetId);

      if (selfFamily.spouseId) return res.status(400).json({ error: 'You are already married! Divorce your current spouse first.' });
      if (targetFamily.spouseId) return res.status(400).json({ error: 'This person is already married! Don’t try to break their family.' });

      // Check if target has already proposed to sender - auto accept!
      if (selfFamily.pendingSpouseProposal === targetId) {
        selfFamily.spouseId = targetId;
        targetFamily.spouseId = userId;
        selfFamily.pendingSpouseProposal = null;
        targetFamily.pendingSpouseProposal = null;
        await selfFamily.save();
        await targetFamily.save();
        return res.json({ success: true, message: '🎉 Proposal accepted! You are now married.' });
      }

      targetFamily.pendingSpouseProposal = userId;
      await targetFamily.save();
      return res.json({ success: true, message: '💖 Marriage proposal sent successfully!' });
    }

    if (action === 'accept-marriage') {
      if (!targetId) return res.status(400).json({ error: 'Target ID required' });
      if (selfFamily.pendingSpouseProposal !== targetId) return res.status(400).json({ error: 'No active proposal from this user.' });

      const targetFamily = await getFamily(targetId);
      if (selfFamily.spouseId || targetFamily.spouseId) {
        selfFamily.pendingSpouseProposal = null;
        await selfFamily.save();
        return res.status(400).json({ error: 'One of you has already married someone else!' });
      }

      selfFamily.spouseId = targetId;
      targetFamily.spouseId = userId;
      selfFamily.pendingSpouseProposal = null;
      targetFamily.pendingSpouseProposal = null;
      await selfFamily.save();
      await targetFamily.save();
      return res.json({ success: true, message: '🎉 Congratulations! You are now married.' });
    }

    if (action === 'decline-marriage') {
      if (!targetId) return res.status(400).json({ error: 'Target ID required' });
      if (selfFamily.pendingSpouseProposal === targetId) {
        selfFamily.pendingSpouseProposal = null;
        await selfFamily.save();
      }
      return res.json({ success: true, message: 'Declined marriage proposal.' });
    }

    if (action === 'divorce') {
      if (!selfFamily.spouseId) return res.status(400).json({ error: 'You are not married!' });
      
      const exSpouseId = selfFamily.spouseId;
      const exFamily = await getFamily(exSpouseId);

      selfFamily.spouseId = null;
      exFamily.spouseId = null;
      await selfFamily.save();
      await exFamily.save();

      return res.json({ success: true, message: '💔 You are now divorced.' });
    }

    if (action === 'adopt') {
      if (!targetId) return res.status(400).json({ error: 'Target ID required' });
      if (targetId === userId) return res.status(400).json({ error: 'You cannot adopt yourself!' });

      const childFamily = await getFamily(targetId);

      if (selfFamily.parents.includes(targetId)) return res.status(400).json({ error: 'You cannot adopt your parent!' });
      if (selfFamily.spouseId === targetId) return res.status(400).json({ error: 'You cannot adopt your spouse!' });
      if (childFamily.parents.length >= 2) return res.status(400).json({ error: 'This user already has the maximum of 2 parents!' });
      if (childFamily.pendingAdoptionProposals.includes(userId)) return res.status(400).json({ error: 'Adoption proposal is already pending.' });

      childFamily.pendingAdoptionProposals.push(userId);
      await childFamily.save();
      return res.json({ success: true, message: '👶 Adoption proposal sent successfully!' });
    }

    if (action === 'accept-adoption') {
      if (!targetId) return res.status(400).json({ error: 'Target ID required' });
      if (!selfFamily.pendingAdoptionProposals.includes(targetId)) return res.status(400).json({ error: 'No active adoption proposal from this user.' });

      if (selfFamily.parents.length >= 2) {
        selfFamily.pendingAdoptionProposals = selfFamily.pendingAdoptionProposals.filter(id => id !== targetId);
        await selfFamily.save();
        return res.status(400).json({ error: 'You already have 2 parents!' });
      }

      const parentFamily = await getFamily(targetId);

      selfFamily.parents.push(targetId);
      if (!parentFamily.children.includes(userId)) {
        parentFamily.children.push(userId);
      }

      selfFamily.pendingAdoptionProposals = selfFamily.pendingAdoptionProposals.filter(id => id !== targetId);

      await selfFamily.save();
      await parentFamily.save();
      return res.json({ success: true, message: '🎉 You have been adopted!' });
    }

    if (action === 'decline-adoption') {
      if (!targetId) return res.status(400).json({ error: 'Target ID required' });
      selfFamily.pendingAdoptionProposals = selfFamily.pendingAdoptionProposals.filter(id => id !== targetId);
      await selfFamily.save();
      return res.json({ success: true, message: 'Declined adoption proposal.' });
    }

    if (action === 'disown') {
      if (!targetId) return res.status(400).json({ error: 'Target ID required' });
      if (!selfFamily.children.includes(targetId)) return res.status(400).json({ error: 'This user is not your child!' });

      const childFamily = await getFamily(targetId);

      selfFamily.children = selfFamily.children.filter(id => id !== targetId);
      childFamily.parents = childFamily.parents.filter(id => id !== userId);

      await selfFamily.save();
      await childFamily.save();
      return res.json({ success: true, message: '💔 You have disowned your child.' });
    }

    if (action === 'leave-family') {
      if (!targetId) return res.status(400).json({ error: 'Target ID required' });
      if (!selfFamily.parents.includes(targetId)) return res.status(400).json({ error: 'This user is not your parent!' });

      const parentFamily = await getFamily(targetId);

      selfFamily.parents = selfFamily.parents.filter(id => id !== targetId);
      parentFamily.children = parentFamily.children.filter(id => id !== userId);

      await selfFamily.save();
      await parentFamily.save();
      return res.json({ success: true, message: '🕊️ You have run away from your parent.' });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (err) {
    console.error('Failed to perform family action:', err);
    res.status(500).json({ error: 'Failed to perform action' });
  }
});

// --- Economy API ---
app.get('/api/economy-stats', async (req, res) => {
    try {
        const GlobalEconomy = require('./models/GlobalEconomy');
        const EconomyMetrics = require('./models/EconomyMetrics');
        const currentEco = await GlobalEconomy.findOne();
        const history = await EconomyMetrics.find().sort({ timestamp: -1 }).limit(30);
        res.json({
            current: currentEco || { currentMultiplier: 1.0, marketStatus: "⚖️ Stable Market", totalBaublesInCirculation: 0, activeUsersCount: 0 },
            history: history.reverse()
        });
    } catch (err) {
        console.error('Failed to fetch economy stats:', err);
        res.status(500).json({ error: 'Failed to fetch economy stats' });
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
