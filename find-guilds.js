require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', () => {
    console.log(`🤖 Logged in as ${client.user.tag}`);
    console.log('🏘️ Current Guilds:');
    client.guilds.cache.forEach(guild => {
        console.log(`- ${guild.name} (ID: ${guild.id})`);
    });
    process.exit(0);
});

client.login(process.env.TOKEN).catch(err => {
    console.error('❌ Login failed:', err.message);
    process.exit(1);
});
