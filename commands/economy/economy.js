const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const GlobalEconomy = require('../../models/GlobalEconomy');
const EconomyMetrics = require('../../models/EconomyMetrics');

const INFLATION_THRESHOLDS = [
  [5,   '📈 Rapidly Inflating'],
  [0,   '↗️ Inflating'],
  [-5,  '↘️ Deflating'],
  [-Infinity, '📉 Rapidly Deflating'],
];

function getInflationLabel(rate) {
  for (const [threshold, label] of INFLATION_THRESHOLDS) {
    if (rate > threshold) return label;
  }
  return '➡️ Static';
}

async function getInflationData() {
  const [current, previous] = await EconomyMetrics.find()
    .sort({ timestamp: -1 })
    .limit(2)
    .lean();

  if (!current || !previous) return { rateText: '0.00%', trend: '➡️ Static' };

  const rate = ((current.totalBaubles - previous.totalBaubles) / previous.totalBaubles) * 100;
  return {
    rateText: `${rate > 0 ? '+' : ''}${rate.toFixed(2)}%`,
    trend: getInflationLabel(rate),
  };
}

function buildEmbed(eco, inflation) {
  const multiplier   = eco.currentMultiplier ?? 1.0;
  const status       = eco.marketStatus ?? '⚖️ Stable Market';
  const circulation  = (eco.totalBaublesInCirculation ?? 0).toLocaleString();
  const activeUsers  = (eco.activeUsersCount ?? 0).toLocaleString();

  return new EmbedBuilder()
    .setColor(0x00AE86)
    .setTitle('🌐 Global Economy Status')
    .setDescription(
      `The economy reacts dynamically to money in circulation.\n\n` +
      `**Market Status:** \`${status}\``
    )
    .addFields(
      {
        name: '📊 Multiplier',
        value: `**${multiplier.toFixed(2)}x**\n*Affects minigame payouts*`,
        inline: true,
      },
      {
        name: '📈 Inflation (24h)',
        value: `**${inflation.rateText}** — ${inflation.trend}`,
        inline: true,
      },
      { name: '\u200b', value: '\u200b', inline: false },
      {
        name: '💰 Circulation',
        value: `${circulation} Baubles`,
        inline: true,
      },
      {
        name: '👥 Active Accounts',
        value: `${activeUsers} Users`,
        inline: true,
      },
      { name: '\u200b', value: '\u200b', inline: false },
      {
        name: '⚙️ How It Works',
        value:
          '**High inflation** → multiplier drops, shop prices rise.\n' +
          '**Deflation** → multiplier rises, shop prices fall.\n' +
          '**Wealth tax** → 2% daily at 150k+ Baubles, 5% at 500k+. Tax goes into the server fund.',
      },
    )
    .setFooter({ text: 'Last calculated' })
    .setTimestamp(eco.lastCalculated ?? new Date());
}

async function handleEconomyCommand(respondable) {
  const eco = await GlobalEconomy.findOne().lean();

  if (!eco) {
    const msg = '❌ Economy engine has not generated its first snapshot yet.';
    return respondable.editReply ? respondable.editReply(msg) : respondable.reply(msg);
  }

  const inflation = await getInflationData();
  const embed = buildEmbed(eco, inflation);

  return respondable.editReply
    ? respondable.editReply({ embeds: [embed] })
    : respondable.reply({ embeds: [embed] });
}

module.exports = {
  category: 'economy',
  aliases: ['eco', 'inflation', 'market'],

  data: new SlashCommandBuilder()
    .setName('economy')
.setDescription('View economy status'),

  async execute(interaction) {
    await interaction.deferReply();
    await handleEconomyCommand(interaction);
  },

  async executePrefix(message) {
    await handleEconomyCommand(message);
  },
};