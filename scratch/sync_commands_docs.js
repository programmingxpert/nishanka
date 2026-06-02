const fs = require('fs');
const path = require('path');

const commandsDir = path.join(__dirname, '..', 'commands');
const docsDir = path.join(__dirname, '..', 'dashboard-v2', 'src', 'data', 'docs');

// Helper to resolve parameter types from Discord Option type numbers
const optionTypes = {
    1: 'subcommand',
    2: 'subcommand_group',
    3: 'string',
    4: 'integer',
    5: 'boolean',
    6: 'user',
    7: 'channel',
    8: 'role',
    9: 'mentionable',
    10: 'number',
    11: 'attachment'
};

// Dynamic extraction of defaultAliasesMap from index.js to keep them 100% in sync
let defaultAliasesMap = {};
try {
    const indexContent = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8');
    const match = indexContent.match(/const defaultAliasesMap = ({[\s\S]*?});/);
    if (match) {
        defaultAliasesMap = new Function(`return ${match[1]}`)();
        console.log('Successfully extracted defaultAliasesMap dynamically from index.js!');
    } else {
        console.warn('Could not find defaultAliasesMap in index.js, using empty map.');
    }
} catch (e) {
    console.error('Failed to parse defaultAliasesMap from index.js:', e);
}

// Category mapping matching help.js and frontend doc files
const commandCategoryMapping = {
    // Admin
    setquoteschannel: 'admin',
    trigger: 'admin',
    reload: 'admin',

    // Moderation
    automod: 'moderation',
    antispam: 'moderation',
    censor: 'moderation',
    mediaonly: 'moderation',
    ban: 'moderation',
    unban: 'moderation',
    fakeban: 'moderation',
    mkick: 'moderation',
    timeout: 'moderation',
    removetimeout: 'moderation',
    warn: 'moderation',
    warnings: 'moderation',
    clearwarn: 'moderation',
    clearwarnings: 'moderation',
    purge: 'moderation',
    defaultpurge: 'moderation',
    lock: 'moderation',
    unlock: 'moderation',
    temprole: 'moderation',

    // Giveaway
    giveaway: 'giveaway',
    giveawayend: 'giveaway',

    // Economy
    bauble: 'economy',
    inventory: 'economy',
    passive: 'economy',
    work: 'economy',
    scavenge: 'economy',
    rob: 'economy',
    daily: 'economy',
    weekly: 'economy',
    checklist: 'economy',
    grab: 'economy',
    shop: 'economy',
    sell: 'economy',
    use: 'economy',
    give: 'economy',
    gift: 'economy',
    leaderboard: 'economy',
    globalleaderboard: 'economy',
    add: 'economy',
    take: 'economy',
    reset: 'economy',
    taxfund: 'economy',
    collections: 'economy',
    crime: 'economy',
    dig: 'economy',
    dumpster: 'economy',
    economy: 'economy',
    expedition: 'economy',
    fish: 'economy',
    items: 'economy',
    memehunt: 'economy',

    // Casino
    gamble: 'casino',
    coinflip: 'casino',
    slots: 'casino',
    mines: 'casino',
    buckshot: 'casino',
    battle: 'minigames',
    blackjack: 'casino',
    bj: 'casino',
    animebattle: 'minigames',
    mblackjack: 'casino',

    // Profile
    profile: 'profile',
    'profile-edit': 'profile',
    'profile-reset': 'profile',
    title: 'profile',

    // Marriage (Maps to 'fun' in frontend)
    family: 'fun',
    familytree: 'fun',
    proposals: 'fun',
    marry: 'fun',
    divorce: 'fun',
    adopt: 'fun',
    disown: 'fun',

    // Games
    wordbomb: 'minigames',
    scramble: 'minigames',
    emojidecode: 'minigames',
    guesstheflag: 'minigames',
    deathbattle: 'minigames',
    geoguesser: 'minigames',
    hangman: 'minigames',
    truthordare: 'minigames',

    // Fun
    meme: 'fun',
    wanted: 'fun',
    excuse: 'fun',
    hack: 'fun',
    iq: 'fun',
    vibecheck: 'fun',
    ship: 'fun',
    pp: 'fun',
    gayrate: 'fun',
    '8ball': 'fun',
    furry: 'fun',
    quote: 'fun',
    gta6: 'fun',

    // Music
    play: 'music',
    stop: 'music',
    pause: 'music',
    resume: 'music',
    queue: 'music',
    skip: 'music',
    remove: 'music',
    clearmusic: 'music',

    // Utility
    help: 'utility',
    ping: 'utility',
    reload: 'utility',
    togglecmd: 'utility',
    remind: 'utility',
    afk: 'utility',
    server: 'utility',
    servericon: 'utility',
    user: 'utility',
    avatar: 'utility',
    rep: 'utility',
    rank: 'utility',
    snipe: 'utility'
};

// Rich descriptions for actions and other commands
const customDescriptions = {
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

function getSlashPath(cmdName, category) {
    if (category === 'moderation') return `/moderation ${cmdName}`;
    if (category === 'economy') {
        if (cmdName === 'economy') return '/economy status';
        return `/economy ${cmdName}`;
    }
    if (category === 'fun') {
        const RELATIONSHIP_CMDS = ['adopt', 'divorce', 'family', 'familytree', 'marry', 'proposals', 'ship'];
        const GAME_CMDS = ['blackjack', 'geoguesser', 'hangman', 'scramble', 'wordbomb', 'emojidecode', 'guesstheflag', 'truthordare'];
        if (RELATIONSHIP_CMDS.includes(cmdName)) return `/fun relationship ${cmdName}`;
        if (GAME_CMDS.includes(cmdName)) return `/fun game ${cmdName}`;
        return `/fun ${cmdName}`;
    }
    if (category === 'giveaway') {
        if (cmdName === 'giveaway') return '/giveaway create';
        if (cmdName === 'giveawayend') return '/giveaway end';
        return `/giveaway ${cmdName}`;
    }
    if (category === 'music') return `/music ${cmdName}`;
    if (category === 'profile') {
        if (cmdName === 'profile') return '/profile view';
        if (cmdName === 'profile-edit') return '/profile edit';
        if (cmdName === 'profile-reset') return '/profile reset';
        return `/profile ${cmdName}`;
    }
    if (category === 'utility') return `/utility ${cmdName}`;
    if (category === 'admin') return `/admin ${cmdName}`;
    if (category === 'actions') return `/actions type:${cmdName}`;
    return `/${cmdName}`;
}

const parsedCommands = [];

function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            scanDir(fullPath);
        } else if (entry.name.endsWith('.js') && !entry.name.endsWith('.example')) {
            try {
                const cmd = require(fullPath);
                if (cmd.devOnly === true || cmd.hidden === true) {
                    continue;
                }
                const name = cmd.data?.name || cmd.name || path.basename(entry.name, '.js');
                
                // Determine Category
                let category = cmd.category || path.basename(dir);
                if (category === 'giveaways') category = 'giveaway';
                if (commandCategoryMapping[name]) {
                    category = commandCategoryMapping[name];
                }

                // Cooldown
                const cooldown = cmd.cooldown ?? 3;

                // Description
                let description = 'No description provided.';
                if (cmd.data?.description) {
                    description = cmd.data.description;
                } else if (cmd.description) {
                    description = cmd.description;
                } else if (customDescriptions[name]) {
                    description = customDescriptions[name];
                }

                // Options / Parameters
                let options = [];
                if (cmd.data && typeof cmd.data.toJSON === 'function') {
                    const json = cmd.data.toJSON();
                    if (json.options) {
                        options = json.options.map(opt => ({
                            name: opt.name,
                            description: opt.description || 'No description.',
                            required: !!opt.required,
                            type: optionTypes[opt.type] || 'string',
                            choices: opt.choices || []
                        }));
                    }
                }

                // Aliases
                let aliases = cmd.aliases || [];
                if (defaultAliasesMap[name]) {
                    aliases = [...new Set([...aliases, ...defaultAliasesMap[name]])];
                }

                // Flags
                const hasPrefixVersion = typeof cmd.executePrefix === 'function';
                const dashboardConfigurable = ['setquoteschannel', 'trigger', 'defaultpurge', 'mediaonly'].includes(name);
                const slashPath = getSlashPath(name, category);

                parsedCommands.push({
                    name,
                    description,
                    options,
                    hasPrefixVersion,
                    dashboardConfigurable,
                    cooldown,
                    aliases,
                    slashPath,
                    category
                });
            } catch (err) {
                console.error(`Error loading command file ${entry.name}:`, err.message);
            }
        }
    }
}

// Start scanning
scanDir(commandsDir);

// Group commands by resolved documentation categories
const categories = ['actions', 'admin', 'casino', 'economy', 'fun', 'giveaway', 'minigames', 'moderation', 'music', 'profile', 'utility'];
const grouped = {};
for (const cat of categories) {
    grouped[cat] = [];
}

for (const cmd of parsedCommands) {
    if (grouped[cmd.category]) {
        // Exclude internal wrapper command "action" from showing up, only show actual action types
        if (cmd.category === 'actions' && cmd.name === 'action') continue;
        
        grouped[cmd.category].push({
            name: cmd.name,
            description: cmd.description,
            options: cmd.options,
            hasPrefixVersion: cmd.hasPrefixVersion,
            dashboardConfigurable: cmd.dashboardConfigurable,
            cooldown: cmd.cooldown,
            aliases: cmd.aliases,
            slashPath: cmd.slashPath
        });
    } else {
        console.warn(`Warning: command ${cmd.name} has uncategorized category: ${cmd.category}`);
    }
}

// Write the category JSON files
for (const cat of categories) {
    const list = grouped[cat].sort((a, b) => a.name.localeCompare(b.name));
    const filePath = path.join(docsDir, `${cat}.json`);
    fs.writeFileSync(filePath, JSON.stringify(list, null, 2));
    console.log(`Wrote ${filePath} (${list.length} commands)`);
}

// Update index.json
const indexFilePath = path.join(docsDir, 'index.json');
const indexData = {
    categories: categories.map(cat => ({
        id: cat,
        name: cat === 'automod' ? 'AutoMod' : cat.charAt(0).toUpperCase() + cat.slice(1),
        count: grouped[cat].length
    }))
};
fs.writeFileSync(indexFilePath, JSON.stringify(indexData, null, 2));
console.log(`Wrote ${indexFilePath}`);

console.log('Commands doc sync complete!');
