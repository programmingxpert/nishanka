const fs = require('fs');
const path = require('path');

const docsDir = path.join('C:\\Projects\\Projects\\Projects\\nishanka\\dashboard-v2\\src\\data\\docs');

// Cooldowns and Aliases map based on index.js and command structures
const defaultCooldowns = {
    // Economy
    daily: 86400, weekly: 604800, scavenge: 3600, dig: 2400, dumpster: 1800,
    fish: 2700, memehunt: 3000, rob: 3600, coinflip: 5, slots: 30, gamble: 5,
    mines: 5, work: 300, battle: 10, buckshot: 15, mblackjack: 5,
    // Fun
    blackjack: 5, geoguesser: 30, hangman: 10, scramble: 10, wordbomb: 10,
    emojidecode: 10, guesstheflag: 10, truthordare: 5, deathbattle: 15,
    marry: 10, divorce: 10, adopt: 8, proposals: 5, family: 5, familytree: 10,
    // Actions
    action: 3,
    // Moderation
    ban: 2, kick: 2, timeout: 2, temprole: 3, purge: 2, warn: 2,
    // Music
    play: 3, stop: 3, pause: 2, resume: 2, queue: 3, skip: 3,
    // Utility
    ping: 2, afk: 5, remind: 5, rep: 86400, rank: 5, help: 2
};

const defaultAliases = {
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

// Rich descriptions for commands that had empty descriptions or need refinement
const customDescriptions = {
    // Admin / Owner
    add: 'Add Glimmering Baubles or items directly to a user\'s balance/inventory. (Admin only)',
    reset: 'Completely reset a user\'s economy profile or specific statistics. (Admin only)',
    take: 'Take Glimmering Baubles or items from a user\'s balance/inventory. (Admin only)',
    taxfund: 'Manage or burn the accumulated federal tax fund. (Owner only)',
    setquoteschannel: 'Set the designated text channel where server quotes are automatically collected.',
    trigger: 'Manage text keyword triggers and automatic custom replies for the guild.',
    reload: 'Reload bot command files live without shutting down the bot. (Admin only)',

    // Actions
    angry: 'Direct your rage at someone with a fitting anime reaction gif.',
    baka: 'Tease someone by calling them an absolute baka!',
    bite: 'Softly bite someone to show affection or playfulness.',
    blush: 'Blush deeply, showing that you are embarrassed or flattered.',
    bored: 'Express your absolute boredom or lack of interest.',
    cry: 'Let out your tears with a sad anime reaction gif.',
    cuddle: 'Give someone a warm, comforting cuddle.',
    dance: 'Break into a dance and celebrate the vibes.',
    facepalm: 'Slap your forehead in disappointment or disbelief.',
    feed: 'Feed a delicious treat or snack to a friend.',
    handhold: 'Lock fingers and hold hands with someone special.',
    handshake: 'Shake hands with another user, finalizing a deal.',
    happy: 'Express your pure joy and positive energy.',
    highfive: 'Give a high-five to celebrate a job well done!',
    hug: 'Give a big, friendly hug to another server member.',
    husbando: 'Declare another user as your anime husband!',
    kick: 'Give someone a playful (or not-so-playful) kick.',
    kiss: 'Give a sweet, loving kiss to someone you care about.',
    kitsune: 'Show off your adorable fox-like features.',
    laugh: 'Laugh out loud at something hilarious.',
    lewd: 'React with a smug, lewd face to a questionable message.',
    lurk: 'Peek out from the shadows and lurk in the chat.',
    neko: 'Display an adorable anime cat-girl reaction.',
    nod: 'Nod your head in agreement or approval.',
    nom: 'Crunch down and nibble on some delicious food.',
    nope: 'Cross your arms and say absolutely not!',
    pat: 'Gently pat someone on the head to comfort them.',
    peck: 'Give a quick, affectionate peck on the cheek.',
    pout: 'Pout your lips in annoyance or cute frustration.',
    punch: 'Throw a heavy anime punch at a target user.',
    run: 'Sprint away as fast as your legs can carry you!',
    shoot: 'Take a playful shot at someone with a toy gun.',
    shrug: 'Shrug your shoulders, expressing your cluelessness.',
    slap: 'Give a resounding anime slap to another user.',
    sleep: 'Curl up and drift off into a peaceful sleep.',
    smug: 'Show off your superior smugness with a cheeky grin.',
    stare: 'Stare intensely at another user with wide eyes.',
    think: 'Ponder deeply about life\'s greatest questions.',
    thumbsup: 'Give a thumbs-up of absolute approval.',
    tickle: 'Attack another user with a relentless tickle storm!',
    touch: 'Gently touch or poke another member.',
    waifu: 'Declare another user as your beloved anime waifu!',
    wave: 'Wave hello or goodbye to the chat.',
    wink: 'Give a playful, cheeky wink to someone.',
    yawn: 'Yawn sleepily, showing you are ready for bed.',
    yeet: 'Yeet someone or something into outer space!'
};

// Map each command to its correct Discord slash command hierarchy
function getSlashPath(cmdName, category) {
    if (category === 'moderation') {
        return `/moderation ${cmdName}`;
    }
    if (category === 'economy') {
        if (cmdName === 'economy') return '/economy status';
        return `/economy ${cmdName}`;
    }
    if (category === 'fun') {
        const RELATIONSHIP_CMDS = ['adopt', 'divorce', 'family', 'familytree', 'marry', 'proposals', 'ship'];
        const GAME_CMDS = ['blackjack', 'geoguesser', 'hangman', 'scramble', 'wordbomb', 'emojidecode', 'guesstheflag', 'truthordare'];
        
        if (RELATIONSHIP_CMDS.includes(cmdName)) {
            return `/fun relationship ${cmdName}`;
        }
        if (GAME_CMDS.includes(cmdName)) {
            return `/fun game ${cmdName}`;
        }
        return `/fun ${cmdName}`;
    }
    if (category === 'giveaway') {
        if (cmdName === 'giveaway') return '/giveaway create';
        if (cmdName === 'giveawayend') return '/giveaway end';
        return `/giveaway ${cmdName}`;
    }
    if (category === 'music') {
        return `/music ${cmdName}`;
    }
    if (category === 'profile') {
        if (cmdName === 'profile') return '/profile view';
        if (cmdName === 'profile-edit') return '/profile edit';
        if (cmdName === 'profile-reset') return '/profile reset';
        return `/profile ${cmdName}`;
    }
    if (category === 'utility') {
        return `/utility ${cmdName}`;
    }
    if (category === 'admin') {
        return `/admin ${cmdName}`;
    }
    if (category === 'actions') {
        return `/actions type:${cmdName}`;
    }
    return `/${cmdName}`;
}

const files = fs.readdirSync(docsDir).filter(f => f.endsWith('.json') && f !== 'index.json' && f !== 'dashboardFeatures.json');

for (const file of files) {
    const category = path.basename(file, '.json');
    const filePath = path.join(docsDir, file);
    const commands = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    const enriched = commands.map(cmd => {
        const name = cmd.name;
        
        // Cooldown
        const cooldown = defaultCooldowns[name] || 0;
        
        // Aliases
        const aliases = defaultAliases[name] || [];
        
        // Description
        let desc = cmd.description;
        if (desc === 'No description provided.' && customDescriptions[name]) {
            desc = customDescriptions[name];
        }
        
        // Slash Path
        const slashPath = getSlashPath(name, category);
        
        // Integration flag (manually configured based on actual integration)
        const dashboardConfigurable = [
            'setquoteschannel', 'trigger', 'defaultpurge', 'mediaonly'
        ].includes(name);

        return {
            ...cmd,
            description: desc,
            cooldown,
            aliases,
            slashPath,
            dashboardConfigurable
        };
    });

    // Save enriched
    fs.writeFileSync(filePath, JSON.stringify(enriched, null, 2));
    console.log(`Enriched docs for category: ${category} (${enriched.length} commands)`);
}

console.log('Doc enrichment complete!');
