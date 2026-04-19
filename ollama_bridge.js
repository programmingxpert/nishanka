require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const TARGET_CHANNEL_ID = '1255802935594450974';
const TARGET_GUILD_ID = '1159902452649316432';

client.on('ready', () => {
    console.log(`[Ollama Bridge] Logged in as ${client.user.tag}`);
    console.log(`[Ollama Bridge] Listening on channel ID: ${TARGET_CHANNEL_ID}`);
});

client.on('messageCreate', async (message) => {
    // Ignore bots to prevent infinite loops
    if (message.author.bot) return;

    // Only process for the specific guild and channel
    if (message.guildId !== TARGET_GUILD_ID || message.channelId !== TARGET_CHANNEL_ID) return;

    try {
        await message.channel.sendTyping();
        
        // Indicate typing loop since generation might take time
        const typingInterval = setInterval(() => {
            message.channel.sendTyping().catch(console.error);
        }, 9000);

        try {
            const response = await fetch('http://127.0.0.1:11434/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'llama3.2:latest',
                    messages: [{ role: 'user', content: message.content }],
                    stream: false
                })
            });

            clearInterval(typingInterval);

            if (!response.ok) {
                throw new Error(`Ollama HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const reply = data.message?.content || "*(No response generated)*";

            // Discord limit is 2000 chars per message, chunk if needed
            const chunkSize = 1950;
            for (let i = 0; i < reply.length; i += chunkSize) {
                const chunk = reply.slice(i, i + chunkSize);
                await message.reply(chunk);
            }
        } catch (error) {
            clearInterval(typingInterval);
            throw error;
        }
        
    } catch (error) {
        console.error('[Ollama Error]:', error);
        message.reply("*(Ollama locally encountered an error. Check console.)*");
    }
});

client.login(process.env.TOKEN);
