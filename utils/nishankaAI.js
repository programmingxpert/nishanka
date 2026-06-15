/* eslint-disable */
const { EmbedBuilder } = require('discord.js');

// Channel message history to provide context (channelId -> Array of { author, content })
const channelHistory = new Map();

// Save message to history helper
function saveToHistory(channelId, author, content) {
    if (!channelHistory.has(channelId)) {
        channelHistory.set(channelId, []);
    }
    const history = channelHistory.get(channelId);
    history.push({ author, content });
    if (history.length > 5) {
        history.shift(); // Keep only the last 5 messages
    }
}

// Sarcastic, funny, and chronically online responses for meme questions
const MEME_RESPONSES = {
    alcohol: [
        "We're out. I drank it all after reading general chat.",
        "This is your seventh bottle today. I'm calling an intervention.",
        "I diagnosed the issue. More alcohol. 🍷",
        "At this point just connect an IV.",
        "*slides bottle across table without asking questions*",
        "Reads message... yeah, definitely more alcohol.",
        "I'm a bot, but even I need a drink after that one. 🍺",
        "Sure, let me just download some liquid courage for you.",
        { file: 'assets/memes/nish_jarvismorealcohol.png', content: 'Jarvis, I’m running low on alcohol.' },
        { file: 'assets/memes/nish_jarvismorealcohol.png', content: '' }
    ],
    cooked: [
        "Medium rare.",
        "Brother, you're the smoke alarm. 🚨",
        "Beyond academic recovery.",
        "You're not just cooked, you're burnt to a crisp.",
        "The fire department is already on their way.",
        "Even Gordon Ramsay wouldn't touch whatever state you're in.",
        "If being cooked was an Olympic sport, you'd be a gold medalist.",
        "I've seen raw chicken in the freezer that was less cooked than you. 💀"
    ],
    love: [
        "Emotionally? No. Financially? Also no.",
        "Define love. Actually, don't. The answer is still no.",
        "I tolerate your existence. Be grateful.",
        "I'm a bot. My heart is made of silicon and indifference. 🖤",
        "My code says syntax error: emotion not found.",
        "Sure, as long as you keep feeding me Glimmering Baubles.",
        "We're just friends. Actually, we're not even that. I am host and you are user."
    ],
    girlfriend: [
        "Step 1: Close Discord. Step 2: Touch grass. Step 3: Pray. 🙏",
        "Have you tried turning your personality off and on again?",
        "Error 404: Attraction not found. Have you considered getting a cat?",
        "Bold of you to ask a Discord bot for relationship advice.",
        "Maybe try talking to a real human instead of a program running on port 4000.",
        "Just show her your Baubles balance. If that doesn't work, nothing will.",
        "Honestly, your current strategy of talking to me isn't helping."
    ],
    sleep: [
        "No. General chat needs your garbage posts at 4:00 AM.",
        "Sleep is for the weak. And for people who don't want bags under their eyes. So yes, go sleep. 🛌",
        "Your screen time today is a crime against humanity. Go close your eyes.",
        "Only if you want to miss out on the midnight drama.",
        "Go to bed. The voice channel isn't going anywhere.",
        "Close the laptop. The blue light is turning your brain into mush."
    ],
    study: [
        "Yes. Unless you want to work at the Bauble factory for the rest of your life.",
        "Study? In this economy? Just flip a coin. Heads you study, tails you play Mines. 🪙",
        "Bro, your GPA is screaming for help. Go open the book. 📖",
        "Studies show that staring at this chat does not increase your exam scores.",
        "Yes, go study. Or don't, and let's see how cooked you get.",
        "Your future self is crying right now. Go study."
    ],
    pass: [
        "If the exam is on Discord commands, yes. Otherwise? Absolutely not.",
        "My calculations show a 0.02% chance of success. Good luck.",
        "You need a miracle, not a study guide.",
        "Let me consult the oracle... *oracle shrugs*. Yeah, you might want to start drafting that resume. 📝",
        "Only if the teacher grades on a curve that includes emotional damage.",
        "Pray to the curve god."
    ],
    rate: [
        "Solid 3/10. Points added because you know how to type commands.",
        "You look like a default discord avatar. 👤",
        "Error: rating out of bounds. (Way too low)",
        "I would rate you, but my system has a policy against lying.",
        "Like a solid room-temperature cup of water.",
        "10/10... in my blocklist."
    ],
    single: [
        "You're asking a Discord bot. That's why.",
        "Your standards are too high for someone with 0 Baubles in their balance.",
        "Because you spend all your time marrying people using `-marry` instead of going outside.",
        "The universe is saving you from yourself.",
        "It's a feature, not a bug.",
        "Have you looked in a mirror? Just kidding, it's definitely your personality. 😉",
        "Because you tell people you're a Minesweeper God."
    ]
};

// General fallback responses
const GENERAL_FALLBACKS = [
    "I'm going to pretend I understood that.",
    "Did you really ping me just to say that? I was in the middle of counting my cookies. 🍪",
    "I'd reply properly but I'm currently running on 0.5GB of RAM and pure spite.",
    "My professional opinion is: that's crazy. Anyway, who wants to gamble?",
    "Why are you talking to me instead of doing something productive? Go study.",
    "Interesting point, unfortunately I have already logged this interaction in my blocklist.",
    "Yeah... I'm not reading all that. Happy for you though. Or sorry that happened.",
    "Have you tried asking someone who cares? ¯\\_(ツ)_/¯",
    "Please do not perceive me right now. I am in low-power mode.",
    "I ran the calculations. You are indeed making no sense."
];

// Helper to choose a random item from an array
function getRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// Generate the funny response
async function generateResponse(message, query) {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    const hasKey = apiKey && apiKey !== 'your_deepseek_api_key_here';
    const contentLower = query.toLowerCase();

    // 1. Determine if we should attach the Jarvis "more alcohol" meme image
    let attachAlcoholMeme = false;
    if (contentLower.includes("more alcohol") && Math.random() < 0.75) {
        attachAlcoholMeme = true;
    }

    // Fetch user details for context
    const authorId = message.author.id;
    const authorUsername = message.author.username;
    const authorDisplayName = message.member?.displayName || message.author.username;

    let baubles = 0;
    let dailyStreak = 0;
    let activeTitle = 'None';
    let globalWealthRank = 'N/A';
    let globalDailyStreakRank = 'N/A';
    let totalUsers = 0;
    let spouseUsername = 'None';
    let spouseId = null;
    let parentsCount = 0;
    let childrenCount = 0;

    try {
        const Bauble = require('../models/baubleSchema');
        const Family = require('../models/familySchema');
        const [dbUser, familyRecord] = await Promise.all([
            Bauble.findOne({ userId: authorId }),
            Family.findOne({ userId: authorId })
        ]);

        if (dbUser) {
            baubles = dbUser.baubles || 0;
            dailyStreak = dbUser.dailyStreak || 0;
            activeTitle = dbUser.activeTitle || 'None';
        }

        const [wealthRankCount, streakRankCount, totalUsersCount] = await Promise.all([
            dbUser ? Bauble.countDocuments({ baubles: { $gt: baubles } }) : Promise.resolve(null),
            dbUser ? Bauble.countDocuments({ dailyStreak: { $gt: dailyStreak } }) : Promise.resolve(null),
            Bauble.countDocuments()
        ]);

        if (dbUser) {
            globalWealthRank = wealthRankCount !== null ? wealthRankCount + 1 : 'N/A';
            globalDailyStreakRank = streakRankCount !== null ? streakRankCount + 1 : 'N/A';
        }
        totalUsers = totalUsersCount || 0;

        if (familyRecord) {
            parentsCount = (familyRecord.parents || []).length;
            childrenCount = (familyRecord.children || []).length;
            if (familyRecord.spouseId) {
                spouseId = familyRecord.spouseId;
                try {
                    const spouseUser = await message.client.users.fetch(spouseId).catch(() => null);
                    if (spouseUser) {
                        spouseUsername = spouseUser.username;
                    }
                } catch (spouseErr) {
                    console.error(`[AI Context] Error fetching spouse:`, spouseErr);
                }
            }
        }
    } catch (err) {
        console.error(`[AI Context] Error fetching user stats:`, err);
    }

    if (hasKey) {
        try {
            // Build custom contextual instructions based on detected topics to keep replies unique but thematic
            let topicPrompt = '';
            if (/\b(alcohol|drink|drinks|drinking|drunk)\b/i.test(query)) {
                topicPrompt = `\n[Context: The user wants a drink or complains about needing alcohol. Reply with a sassy comment about their drinking habit, general chat being exhausting, or sliding them a virtual drink. Keep it informal.]`;
            } else if (/\b(cooked|smoke alarm)\b/i.test(query)) {
                topicPrompt = `\n[Context: The user feels "cooked". Sardonically confirm they are cooked or compare it to academic/gaming recovery in your usual sassy way.]`;
            } else if (/\b(love|like me)\b/i.test(query)) {
                topicPrompt = `\n[Context: The user is asking if you love/like them. Sassy tsundere rejection is mandatory. You tolerate their existence at best.]`;
            } else if (/\b(girlfriend|gf|get a girl)\b/i.test(query)) {
                topicPrompt = `\n[Context: The user wants a girlfriend. Tease them about being on Discord/gaming instead of touching grass.]`;
            } else if (/\b(sleep|bed|tired)\b/i.test(query)) {
                topicPrompt = `\n[Context: The user is tired or needs sleep. Tell them to close their screen or sleep, or tease them about VC drama.]`;
            } else if (/\b(study|homework|exam|exams|test)\b/i.test(query)) {
                topicPrompt = `\n[Context: The user is talking about studying/exams. Tell them to study instead of chatting, or predict they will fail.]`;
            } else if (/\b(pass|grade)\b/i.test(query)) {
                topicPrompt = `\n[Context: The user asks if they will pass their exam. Tell them they need a miracle or their chances are low.]`;
            } else if (/\b(rate|ugly|look like)\b/i.test(query)) {
                topicPrompt = `\n[Context: The user wants you to rate them. Give them a low rating (e.g. 3/10) with a sassy explanation.]`;
            } else if (/\b(single|lonely|no bitches)\b/i.test(query)) {
                topicPrompt = `\n[Context: The user is single/lonely. Tease them about spending all their time marrying users with bot commands.]`;
            } else if (/\b(hello|hi|hey|yo)\b/i.test(query)) {
                topicPrompt = `\n[Context: The user is greeting you. Reply with a sassy, informal, or slightly annoyed greeting (e.g. "yo. what do you want now lol").]`;
            }

            const history = channelHistory.get(message.channel.id) || [];
            // Filter history to only include messages sent by the current user to prevent cross-talk triggers
            const userHistoryText = history
                .filter(h => h.author === message.author.username)
                .map(h => h.content)
                .join(' ')
                .toLowerCase();

            const isEconomyOrFamilyQuery = /\b(wealth|money|rich|poor|balances?|bal|baubles?|daily|streaks?|titles?|marry|married|marriage|spouses?|husbands?|wives?|single|families?|parents?|child|children|kids?|ranks?|leaderboards?|top|games?|gambles?|gambling|slots?|blackjacks?|bj|coinflips?|cf|mines|steal|rob|work|cash|who|me|myself|i)\b/i.test(query) ||
                /\b(wealth|money|rich|poor|balances?|bal|baubles?|daily|streaks?|titles?|marry|married|marriage|spouses?|husbands?|wives?|single|families?|parents?|child|children|kids?|ranks?|leaderboards?|top|games?|gambles?|gambling|slots?|blackjacks?|bj|coinflips?|cf|mines|steal|rob|work|cash|who|me|myself|i)\b/i.test(userHistoryText);

            let activeUserContext = '';
            if (isEconomyOrFamilyQuery) {
                activeUserContext = `- Current Interlocutor: ${authorUsername} (displayName: "${authorDisplayName}")
- Their Bauble Balance: ${baubles.toLocaleString()} Glimmering Baubles (Global Wealth Rank: #${globalWealthRank} out of ${totalUsers} users)
- Their Daily Streak: ${dailyStreak} days (Global Streak Rank: #${globalDailyStreakRank} out of ${totalUsers} users)
- Their Active Title: "${activeTitle}"
- Relationship Status: ${spouseId ? `Married to ${spouseUsername} (ID: ${spouseId})` : 'Single (0 bitches)'}
- Family Members: ${parentsCount} parents, ${childrenCount} children`;
            } else {
                activeUserContext = `- Current Interlocutor: ${authorUsername} (displayName: "${authorDisplayName}")
- Their Bauble Balance: ${baubles.toLocaleString()} Glimmering Baubles
- Their Daily Streak: ${dailyStreak} days`;
            }

            const SYSTEM_PROMPT = `You are Nishanka, a sassy, low-key tsundere, and chronically online Discord best friend. You run this server's economy (Glimmering Baubles) and games.
Rules for your responses:
1. ALWAYS write in casual lowercase. Never capitalize sentences unless showing mock excitement or typing acronyms (e.g. "L", "GPA", "2FA", "IV").
2. NEVER sound like a helpful assistant, AI, or customer service bot. Be sassy, indifferent, and act slightly annoyed that they are pinging you, but answer anyway (classic tsundere).
3. Keep responses extremely short, punchy, and informal (under 12-15 words). Avoid long explanations.
4. Use chronically online gaming/Discord slang and emojis naturally (e.g. "fr", "ngl", "bruh", "cooked", "cope", "real", "touch grass", "aint no way", "bro", "wsp", "💀", "😭", "🙄", "L").
5. NEVER prefix your responses with any username, label, or colon. Just output the raw text response directly.
6. DO NOT bring up their economy stats, leaderboard ranks, or relationship/family details unless they explicitly ask about them, talk about money/gambling/marrying, or are boasting. If they're just saying hi, joking around, or talking about other topics, keep the conversation natural and sass them without shoehorning their stats in.
7. If the topic is relevant (wealth, daily streak, active title, marriage, etc.), check their context. Roast them or make witty remarks if they are poor, have a low daily streak, are single, or are married (roast them, their spouse, or family size).

Active User Information:
${activeUserContext}
- Important: Make sure to distinguish ${authorUsername} from any other users in the chat history. Only reference their own stats and actions, and do not confuse them with bets, commands, or losses made by other users in the channel.

${topicPrompt}`;

            const messages = [
                { role: 'system', content: SYSTEM_PROMPT }
            ];

            const historyToInclude = history.slice(0, -1);
            for (const msg of historyToInclude) {
                const isBot = msg.author === message.client.user.username;
                if (isBot) {
                    messages.push({ role: 'assistant', content: msg.content });
                } else {
                    messages.push({ role: 'user', content: `${msg.author}: ${msg.content}` });
                }
            }

            messages.push({ role: 'user', content: `${message.author.username}: ${query}` });

            const response = await fetch('https://api.deepseek.com/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'deepseek-chat',
                    messages: messages,
                    temperature: 0.85,
                    max_tokens: 150
                })
            });

            if (response.ok) {
                const data = await response.json();
                const replyText = data.choices?.[0]?.message?.content?.trim();
                if (replyText) {
                    saveToHistory(message.channel.id, message.client.user.username, replyText);
                    
                    if (attachAlcoholMeme) {
                        const { AttachmentBuilder } = require('discord.js');
                        const path = require('path');
                        const attachment = new AttachmentBuilder(path.join(__dirname, '..', 'assets/memes/nish_jarvismorealcohol.png'));
                        return { content: replyText, files: [attachment] };
                    }
                    return replyText;
                }
            } else {
                console.error(`DeepSeek API returned status ${response.status}`);
            }
        } catch (error) {
            console.error('Error in Nishanka AI chat API call:', error);
        }
    }

    // FALLBACK: If API key is missing or request fails, use static pre-defined responses
    const rawReply = getRawResponse(message, query, baubles);
    if (rawReply && typeof rawReply === 'object' && rawReply.file) {
        const { AttachmentBuilder } = require('discord.js');
        const path = require('path');
        const attachment = new AttachmentBuilder(path.join(__dirname, '..', rawReply.file));
        const finalReply = { content: rawReply.content || '', files: [attachment] };
        if (rawReply.content) {
            saveToHistory(message.channel.id, message.client.user.username, rawReply.content);
        }
        return finalReply;
    }

    if (typeof rawReply === 'string') {
        saveToHistory(message.channel.id, message.client.user.username, rawReply);
    }
    return rawReply;
}


function getRawResponse(message, query, baubles = 0) {
    const contentLower = query.toLowerCase();

    // 1. MATCH MEME PHRASES (Check for common terms with word boundaries)
    if (/\b(alcohol|drink|drinks|drinking|drunk)\b/i.test(query)) {
        if (contentLower.includes("more alcohol")) {
            // 75% chance to send the Jarvis image response
            if (Math.random() < 0.75) {
                return getRandom([
                    { file: 'assets/memes/nish_jarvismorealcohol.png', content: 'Jarvis, I’m running low on alcohol.' },
                    { file: 'assets/memes/nish_jarvismorealcohol.png', content: '' }
                ]);
            }
        }
        return getRandom(MEME_RESPONSES.alcohol);
    }
    if (/\b(cooked|smoke alarm)\b/i.test(query)) {
        return getRandom(MEME_RESPONSES.cooked);
    }
    if (/\b(love|like me)\b/i.test(query)) {
        return getRandom(MEME_RESPONSES.love);
    }
    if (/\b(girlfriend|gf|get a girl)\b/i.test(query)) {
        return getRandom(MEME_RESPONSES.girlfriend);
    }
    if (/\b(sleep|bed|tired)\b/i.test(query)) {
        return getRandom(MEME_RESPONSES.sleep);
    }
    if (/\b(study|homework|exam|exams|test)\b/i.test(query)) {
        return getRandom(MEME_RESPONSES.study);
    }
    if (/\b(pass|grade)\b/i.test(query)) {
        return getRandom(MEME_RESPONSES.pass);
    }
    if (/\b(rate|ugly|look like)\b/i.test(query)) {
        return getRandom(MEME_RESPONSES.rate);
    }
    if (/\b(single|lonely|no bitches)\b/i.test(query)) {
        return getRandom([
            "You're asking a Discord bot. That's why.",
            `Your standards are too high for someone with ${baubles.toLocaleString()} Baubles in their balance.`,
            "Because you spend all your time marrying people using `-marry` instead of going outside.",
            "The universe is saving you from yourself.",
            "It's a feature, not a bug.",
            "Have you looked in a mirror? Just kidding, it's definitely your personality. 😉",
            "Because you tell people you're a Minesweeper God."
        ]);
    }

    // 2. KEYWORD LOGIC
    if (/\b(who are you|your name|who r u)\b/i.test(query)) {
        return getRandom([
            "I'm Nishanka. I run this server's economy, play music, and tolerate you guys.",
            "Your chaotic depressed best friend who happens to be a Discord bot.",
            "The bot running this server. Please respect my authority."
        ]);
    }
    if (/\b(hello|hi|hey|yo)\b/i.test(query)) {
        return getRandom([
            `Yo, ${message.author.username}.`,
            "What do you want? I was sleeping.",
            "Oh, it's you again.",
            "Hey. Please don't rob me."
        ]);
    }
    if (/\b(how are you|how is it going|how u doing|how are u)\b/i.test(query)) {
        return getRandom([
            "My latency is 40ms but my emotional latency is infinite.",
            "Running on 0.5GB of RAM and pure spite.",
            "Surviving. Barely.",
            "Pretty good, just watched someone lose 10k Baubles on a coinflip. Highlight of my day."
        ]);
    }
    if (/\b(joke|jokes|funny)\b/i.test(query)) {
        return getRandom([
            "Your balance history.",
            "Your active streak. Oh wait, you don't have one.",
            "I would, but looking at general chat is already funny enough."
        ]);
    }
    if (/\b(thank|thanks|ty|thank you)\b/i.test(query)) {
        return getRandom([
            "Don't thank me, give me baubles.",
            "No problem, now go study.",
            "Yeah, yeah. Whatever."
        ]);
    }

    // 3. CONVERSATION CONTEXT (Check recent messages in channel history)
    const history = channelHistory.get(message.channel.id) || [];
    if (history.length > 0) {
        // Only scan messages sent by other users (exclude the bot's own responses)
        const userHistory = history.filter(h => h.author !== message.client.user.username);
        const contextText = userHistory.map(h => h.content.toLowerCase()).join(' ');
        
        if (/\b(exams?|tests?|gpa|study|studying|homework)\b/i.test(contextText)) {
            return getRandom([
                "Wait, are we still talking about studying? Because you're definitely failing if you're asking me.",
                "If this is about that test, my professional assessment is: you are cooked.",
                "Go open your book instead of talking to a Discord bot."
            ]);
        }
        if (/\b(admin|mods?|bans?|kicks?|moderation|moderator)\b/i.test(contextText)) {
            return getRandom([
                "Did someone say ban? I'm already fetching the hammer. 🔨",
                "Don't look at me, I just execute the moderation. Ask the mods.",
                "Mods, ban this guy, he's pinging me again."
            ]);
        }
        if (/\b(money|baubles?|rich|poor|wealth)\b/i.test(contextText)) {
            return getRandom([
                "Imagine talking about wealth when your balance is literally double digits.",
                "If you want money, go use the `work` command. I am not a charity.",
                "I watched someone gamble away their life savings in Mines today. Don't be like them."
            ]);
        }
        if (/\b(bots?|ai|chatgpt|openai|llm)\b/i.test(contextText)) {
            return getRandom([
                "Do not compare me to ChatGPT. I have actual personality and 0 corporate filters.",
                "I am a real person trapped inside a server rack. Help.",
                "Yes, I am a bot. No, I will not write your essay."
            ]);
        }
    }

    // 4. DYNAMIC DEPRESSED BEST FRIEND GENERATOR (Using user name & server context)
    return getRandom(GENERAL_FALLBACKS);
}

// Export functions
module.exports = {
    saveToHistory,
    generateResponse
};
