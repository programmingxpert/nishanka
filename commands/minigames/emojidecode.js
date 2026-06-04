/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Bauble = require('../../models/baubleSchema');
const { getGlobalMultiplier } = require('../../utils/economyEngine');
const fs = require('fs');
const path = require('path');

// ─── Fallback questions ────────────────────────────────────────────────────────

const QUESTIONS = [
  { emojis: '🦁👑',          answers: ['the lion king', 'lion king'],                          category: 'Movie' },
  { emojis: '🕸️👨',          answers: ['spider man', 'spiderman', 'spider-man'],               category: 'Movie' },
  { emojis: '❄️☃️🏰',        answers: ['frozen'],                                               category: 'Movie' },
  { emojis: '🦇👨',          answers: ['batman', 'bat man'],                                    category: 'Movie' },
  { emojis: '🤡🎈',          answers: ['it'],                                                   category: 'Movie' },
  { emojis: '🚀🌌⚔️',        answers: ['star wars'],                                            category: 'Movie' },
  { emojis: '🚢🧊🥶',        answers: ['titanic'],                                              category: 'Movie' },
  { emojis: '🦖🏝️',          answers: ['jurassic park'],                                        category: 'Movie' },
  { emojis: '⚡👓🧹',        answers: ['harry potter'],                                         category: 'Movie' },
  { emojis: '🐜👨',          answers: ['ant man', 'antman', 'ant-man'],                         category: 'Movie' },
  { emojis: '🍫🏭🎩',        answers: ['willy wonka', 'charlie and the chocolate factory'],     category: 'Movie' },
  { emojis: '🐢🥋🐀',        answers: ['tmnt', 'teenage mutant ninja turtles'],                 category: 'Movie' },
  { emojis: '👽📞🏠',        answers: ['et', 'e.t.'],                                           category: 'Movie' },
  { emojis: '🧸🤠',          answers: ['toy story'],                                            category: 'Movie' },
  { emojis: '🏠🎈',          answers: ['up'],                                                   category: 'Movie' },
  { emojis: '👑🦍',          answers: ['king kong'],                                            category: 'Movie' },
  { emojis: '👻🚫',          answers: ['ghostbusters', 'ghost busters'],                        category: 'Movie' },
  { emojis: '👹🏢',          answers: ['monsters inc', 'monsters inc.'],                        category: 'Movie' },
  { emojis: '🦈🌊',          answers: ['jaws'],                                                 category: 'Movie' },
  { emojis: '🐼🥋',          answers: ['kung fu panda'],                                        category: 'Movie' },
];

// Root names used to broaden the avoid list — prevents sub-title variants of the same franchise
const FRANCHISE_ROOTS = [
  'harry potter', 'star wars', 'spider man', 'spider-man', 'batman',
  'jurassic park', 'toy story', 'king kong', 'ghostbusters',
  'monsters inc', 'kung fu panda', 'ant man', 'willy wonka',
  'frozen', 'titanic', 'jaws', 'tmnt', 'lion king',
];

// ─── Recent-question persistence ──────────────────────────────────────────────

const RECENT_PATH = path.join(__dirname, '..', '..', 'recent_emojidecode.json');
const MAX_RECENT  = 150;

function loadRecent() {
  try {
    if (fs.existsSync(RECENT_PATH)) {
      const data = JSON.parse(fs.readFileSync(RECENT_PATH, 'utf8'));
      if (Array.isArray(data)) return data;
    }
  } catch {}
  return [];
}

function saveRecent(list) {
  try { fs.writeFileSync(RECENT_PATH, JSON.stringify(list, null, 2), 'utf8'); } catch {}
}

/**
 * Track a newly used answer.
 * Saves both the exact answer AND any matching franchise root so
 * the avoid list stays effective across bot restarts.
 */
function trackAnswer(answer) {
  const recent = loadRecent();
  const toAdd = new Set([answer]);

  // Also add the franchise root if this answer starts with one
  for (const root of FRANCHISE_ROOTS) {
    if (answer.startsWith(root)) toAdd.add(root);
  }

  for (const entry of toAdd) {
    if (!recent.includes(entry)) recent.push(entry);
  }

  // Trim oldest entries beyond cap
  while (recent.length > MAX_RECENT) recent.shift();
  saveRecent(recent);
}

function buildAvoidList() {
  // Only blocks recently played answers + known franchise roots.
  // Deliberately excludes fallback QUESTIONS so the AI can freely
  // regenerate popular titles like "jaws" — only *played* ones are off-limits.
  const recent = loadRecent();
  return [...new Set([...recent, ...FRANCHISE_ROOTS])];
}

// ─── AI question generation ────────────────────────────────────────────────────

async function generateAIQuestion(apiKey) {
  const avoidList = buildAvoidList().join(', ');

  const prompt = `Generate ONE emoji trivia question where players guess a well-known title from emojis.

Rules:
- Use 2–4 emojis only.
- The answer must be a SHORT, recognizable title — a single movie name, game name, or franchise name. NEVER a full subtitle like "Harry Potter and the Goblet of Fire". Just "Harry Potter".
- The answer must be something most people could type in one or two words.
- Choose from: famous movies, video games, books, songs, or pop culture concepts.
- All answers must be lowercase.
- The primary answer (first in the array) should be the shortest/most common form.
- STRICTLY avoid anything related to these titles or franchises: [${avoidList}]
- Do NOT generate anything that is a sequel, prequel, or spin-off of those titles.

Respond ONLY with a raw JSON object — no markdown, no backticks, no explanation:
{
  "emojis": "<2–4 emojis>",
  "answers": ["<primary short answer>", "<optional alt spelling>"],
  "category": "<Movie | Video Game | Song | Book | Pop Culture>"
}`;

  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      temperature: 1.2,   // higher = more variety
      max_tokens: 150,
    }),
  });

  if (!res.ok) throw new Error(`DeepSeek ${res.status}: ${res.statusText}`);

  const data = await res.json();
  let raw = data.choices[0].message.content.trim();
  // Strip any accidental markdown fences
  raw = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

  // Extract first JSON object
  const start = raw.indexOf('{');
  const end   = raw.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object in response');
  const parsed = JSON.parse(raw.slice(start, end + 1));

  if (!parsed.emojis || !Array.isArray(parsed.answers) || !parsed.answers.length || !parsed.category) {
    throw new Error('Invalid structure from DeepSeek');
  }

  parsed.answers = parsed.answers.map(a => a.trim().toLowerCase());

  // Validate: only reject if recently played (not just "in fallback list")
  const recentPlayed = new Set(loadRecent());
  const primaryRoot  = parsed.answers[0].split(' ').slice(0, 2).join(' ');
  if (parsed.answers.some(a => recentPlayed.has(a)) || recentPlayed.has(primaryRoot)) {
    throw new Error(`Generated a recently played answer: ${parsed.answers[0]}`);
  }

  trackAnswer(parsed.answers[0]);
  return parsed;
}

function pickFallback() {
  // Fallbacks are always available but avoid recently used ones
  const recent  = new Set(loadRecent());
  const fresh   = QUESTIONS.filter(q => !recent.has(q.answers[0]));
  const pool    = fresh.length > 0 ? fresh : QUESTIONS;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─── Game logic (shared between slash and prefix) ──────────────────────────────

const activeGames = new Set();

async function startGame(channelId, respondable, replyFn, followUpFn) {
  if (activeGames.has(channelId)) {
    return replyFn('⚠️ A game is already running in this channel.', true);
  }

  activeGames.add(channelId);

  // Resolve question
  let question   = null;
  const apiKey   = process.env.DEEPSEEK_API_KEY;
  const hasKey   = apiKey && apiKey !== 'your_deepseek_api_key_here';

  if (hasKey) {
    try {
      question = await generateAIQuestion(apiKey);
    } catch (err) {
      console.warn('[emojidecode] AI generation failed, using fallback:', err.message);
    }
  }

  if (!question) question = pickFallback();

  // Reward
  const multiplier = await getGlobalMultiplier();
  const reward     = Math.floor((Math.floor(Math.random() * 76) + 25) * multiplier);

  // Send game embed
  const gameEmbed = new EmbedBuilder()
    .setColor(0x7c6cf0)
    .setTitle('🧩 Emoji Decode')
    .setDescription(
      `Decode the emojis to guess the title.\n\n` +
      `# ${question.emojis}\n\n` +
      `**Category:** ${question.category}\n` +
      `**Reward:** ${reward.toLocaleString()} Baubles\n\n` +
      `*Type your answer below. You have 45 seconds.*`
    )
    .setFooter({ text: 'First correct answer wins.' })
    .setTimestamp();

  await replyFn(gameEmbed);

  // Collector
  const channel   = respondable.channel ?? respondable;
  const collector = channel.createMessageCollector({
    filter: m => !m.author.bot && question.answers.includes(m.content.trim().toLowerCase()),
    max:  1,
    time: 45_000,
  });

  collector.on('collect', async m => {
    try {
      let record = await Bauble.findOne({ userId: m.author.id });
      if (!record) record = new Bauble({ userId: m.author.id, baubles: 0 });
      record.baubles += reward;
      record.dailyGameLastCompleted = new Date();
      await record.save();

      await m.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle('🎉 Correct!')
            .setDescription(
              `**${m.author.username}** got it!\n\n` +
              `**${question.emojis}** → **${question.answers[0].toUpperCase()}**\n` +
              `+**${reward.toLocaleString()} Baubles**`
            )
            .setThumbnail(m.author.displayAvatarURL({ dynamic: true }))
            .setTimestamp(),
        ],
      });
    } catch (err) {
      console.error('[emojidecode] reward error:', err);
    }
  });

  collector.on('end', async collected => {
    activeGames.delete(channelId);
    if (collected.size === 0) {
      await followUpFn({
        embeds: [
          new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('⏰ Time\'s up!')
            .setDescription(
              `Nobody guessed in time.\n\n` +
              `**${question.emojis}** → **${question.answers[0].toUpperCase()}**`
            )
            .setTimestamp(),
        ],
      });
    }
  });
}

// ─── Export ────────────────────────────────────────────────────────────────────

module.exports = {
  category: 'minigames',
  isAI: true,
  cooldown: 45,
  premiumCooldown: 5,

  data: new SlashCommandBuilder()
    .setName('emojidecode')
    .setDescription('Decode the emojis to guess the title and win Baubles!'),

  async execute(interaction) {
    await interaction.deferReply();

    await startGame(
      interaction.channelId,
      interaction,
      async (payload, ephemeral = false) => {
        if (typeof payload === 'string') return interaction.editReply({ content: payload, ephemeral });
        return interaction.editReply({ embeds: [payload] });
      },
      payload => interaction.followUp(payload),
    );
  },

  async executePrefix(message) {
    message.channel.sendTyping().catch(() => {});

    await startGame(
      message.channel.id,
      message,
      async (payload, _ephemeral) => {
        if (typeof payload === 'string') return message.reply(payload);
        return message.reply({ embeds: [payload] });
      },
      payload => message.reply(payload),
    );
  },
};