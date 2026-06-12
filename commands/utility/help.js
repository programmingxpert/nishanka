/* eslint-disable */
const {
	ActionRowBuilder,
	StringSelectMenuBuilder,
	EmbedBuilder,
	SlashCommandBuilder,
	ComponentType,
	ButtonBuilder,
	ButtonStyle,
} = require('discord.js');
const config = require('../../config.json');
const { emoji } = require('../../utils/customEmojis');

const categoryDetails = {
	admin: {
		label: 'Administration',
		emoji: emoji('category.admin', '⚙️'),
		description: 'Configure server settings, prefix, quotes, and triggers.',
	},
	moderation: {
		label: 'Moderation Tools',
		emoji: emoji('category.moderation', '🛡️'),
		description: 'Manage members, warnings, mutes, bans, and auto-mod.',
	},
	giveaway: {
		label: 'Giveaway Controls',
		emoji: emoji('category.giveaway', '🎁'),
		description: 'Schedule, run, draw, and end server giveaways.',
	},
	economy: {
		label: 'Economy & Shop',
		emoji: emoji('category.economy', '💵'),
		description: 'Earn baubles, check shop/inventory, and view leaderboards.',
	},
	casino: {
		label: 'Casino & Betting',
		emoji: emoji('category.casino', '🎰'),
		description: 'Play risk-reward games like gamble, blackjack, slots, and mines.',
	},
	marriage: {
		label: 'Marriage & Family',
		emoji: emoji('category.marriage', '💍'),
		description: 'Propose, marry, divorce, adopt children, and build family trees.',
	},
	minigames: {
		label: 'Minigames',
		emoji: emoji('category.minigames', '🎮'),
		description: 'Challenge others to wordbomb, scramble, hangman, and battles.',
	},
	fun: {
		label: 'Humor & Entertainment',
		emoji: emoji('category.fun', '🎭'),
		description: 'Check your iq, get random excuses, vibecheck, and post memes.',
	},
	profile: {
		label: 'Profiles & Banners',
		emoji: emoji('category.profile', '👤'),
		description: 'Customize and show off your premium user profile cards.',
	},
	music: {
		label: 'Music Player',
		emoji: emoji('category.music', '🎵'),
		description: 'Music commands to stream audio tracks in voice channels.',
	},
	actions: {
		label: 'Social Actions',
		emoji: emoji('category.actions', '🌸'),
		description: 'Anime-style social action animations (hug, slap, pat).',
	},
	ai: {
		label: 'Artificial Intelligence',
		emoji: emoji('category.ai', '🤖'),
		description: 'Nish AI-powered assistants, games, and utilities.',
	},
	utility: {
		label: 'Utility Tools',
		emoji: emoji('category.utility', '🛠️'),
		description: 'General utilities, reminders, AFK status, and server info.',
	},
	developer: {
		label: 'Developer Only',
		emoji: '👑',
		description: 'Exclusive command controls restricted to the bot owner.'
	}
};

const categoryColors = {
	admin: 0x2b2d42,
	moderation: 0x2ecc71,
	giveaway: 0xe67e22,
	economy: 0xf1c40f,
	casino: 0xe74c3c,
	marriage: 0xe84393,
	minigames: 0x3498db,
	fun: 0x9b59b6,
	profile: 0x1abc9c,
	music: 0x9b59b6,
	actions: 0xe84393,
	ai: 0x7c6cf0,
	utility: 0x95a5a6,
	developer: 0x2c3e50
};

const COMMAND_DETAILS = {
	// Admin
	config: '• **Server Config** - \`-config bot\` / \`/config\` • Configure bot settings on web dashboard',
	welcome: '• **Greeting Behaviour** - \`-welcome toggle\` (on/off), \`-welcome channel <#channel>\` • Configure welcome greetings',
	autorole: '• **Auto-Role Assignment** - \`-autorole add <@role>\`, \`-autorole remove <@role>\` • Auto-assign roles on join',
	logging: '• **Action Logging** - \`-logging toggle\`, \`-logging channel <#channel>\` • Setup visual server logs',
	leveling: '• **Leveling Settings** - \`-leveling toggle\`, \`-leveling channel <#channel>\` • Configure leveling and rank announcements',
	reactionroles: '• **Reaction Roles** - \`-reactionroles setup\` • Run interactive reaction-role creator wizard',
	setquoteschannel: '• **Quote Channel** - \`-setquoteschannel <#channel>\` • Set quotes drop channel',
	snipetoggle: '• **Snipe Feature** - \`-snipetoggle\` • Toggle message recovery snipe system',
	starboard: '• **Starboard System** - \`-starboard setup\`, \`-starboard channel <#channel>\` • Configure starboard channel',
	trigger: '• **Custom Triggers** - \`-trigger create <trigger> <reply>\`, \`-trigger delete <trigger>\` • Custom keyword replies',

	// Moderation
	automod: '• **AutoMod System** - \`-automod enable <links/invites/mentions>\` • Configure automated moderation',
	antispam: '• **Anti-Spam Filter** - \`-antispam enable\`, \`-antispam disable\` • Toggle anti-spam message rate limits',
	censor: '• **Word Censorship** - \`-censor add <word>\`, \`-censor remove <word>\` • Manage server censors',
	mediaonly: '• **Media-Only Channel** - \`-mediaonly add <#channel>\`, \`-mediaonly remove <#channel>\` • Lock channels to attachments only',
	securitycheck: '• **Security Audit** - \`-securitycheck\` / \`/securitycheck\` • Scan guild safety metrics',
	ban: '• **Ban Member** - \`-ban <@user> [reason]\` / \`/ban\` • Ban a member from the guild',
	unban: '• **Unban Member** - \`-unban <userId> [reason]\` • Revoke a member\'s ban',
	fakeban: '• **Fake Ban Joke** - \`-fakeban <@user>\` • Trigger a realistic troll ban message',
	mkick: '• **Multi-Kick** - \`-mkick <@user1> <@user2>\` / \`/mkick\` • Kick multiple members at once',
	timeout: '• **Mute/Timeout User** - \`-timeout <@user> <duration> [reason]\` / \`/timeout\` • Time-out a member',
	removetimeout: '• **Remove Timeout** - \`-removetimeout <@user>\` / \`/removetimeout\` • Lift time-out from a user',
	warn: '• **Warn Member** - \`-warn <@user> [reason]\` / \`/warn\` • Issue warning infraction to a member',
	warnings: '• **Infraction History** - \`-warnings <@user>\` / \`/warnings\` • View warning infraction history',
	clearwarn: '• **Void Warning** - \`-clearwarn <@user> <warningId>\` • Void a specific warning ID',
	clearwarnings: '• **Clear All Warnings** - \`-clearwarnings <@user>\` • Clear all warnings for a user',
	purge: '• **Message Purging** - \`-purge <amount>\` / \`/purge\` • Bulk delete messages',
	defaultpurge: '• **Default Purge Limit** - \`-defaultpurge <amount>\` • Purge messages matching server presets',
	lock: '• **Channel Locking** - \`-lock [#channel] [@role] [reason]\` / \`/lock\` • Lock down text channels',
	unlock: '• **Channel Unlocking** - \`-unlock [#channel] [@role] [reason]\` / \`/unlock\` • Unlock a channel',
	lockdown: '• **Server Lockdown** - \`-lockdown\` • Restrict or lockdown all server channels during emergencies',
	temprole: '• **Temporary Roles** - \`-temprole <@user> <@role> <duration>\` • Assign temporary roles',
	role: '• **Role Management** - \`-role add/remove <@user> <@role>\` • Grant or revoke roles',
	colorrole: '• **Color Role Customization** - \`-colorrole <#hex>\` • Set custom color role for a user',
	ticket: '• **Support Tickets** - \`-ticket setup\` or \`-ticket close\` • Configure server support tickets',
	steal: '• **Emoji & Sticker Stealer** - \`-steal <emoji/sticker/reply>\` / \`/steal\` • Upload custom emojis/stickers',

	// Giveaway
	giveaway: '• **Giveaway Creator** - \`-giveaway start <duration> <winners> <prize>\` • Launch a custom giveaway',
	giveawayend: '• **End Giveaway** - \`-giveawayend <messageId>\` / \`/giveaway end\` • Terminate giveaway and pick winners early',

	// Economy
	bauble: '• **Bauble Balance** - \`-bauble [@user]\` • View Glimmering Bauble balance',
	inventory: '• **Backpack Inventory** - \`-inventory [@user]\` • View backpack inventory items',
	passive: '• **Passive Toggle** - \`-passive toggle\` • Turn passive mode on/off to block thefts',
	collections: '• **Item Collections** - \`-collections\` • Inspect completed collectible trophies',
	economy: '• **Economy Metrics** - \`-economy\` • Access server market details and economy status',
	gamestats: '• **Player Gameplay Stats** - \`-gamestats [@user]\` • View detailed minigame wins and streaks',
	winloss: '• **Game Win/Loss Record** - \`-winloss [@user]\` • Check casino win/loss statistics',
	streak: '• **Active Streaks** - \`-streak [@user]\` • Check active minigame streaks',
	work: '• **Interactive Work** - \`-work\` • Perform daily jobs to earn baubles',
	scavenge: '• **Scavenge Areas** - \`-scavenge\` • Rummage around for items or cash',
	rob: '• **Rob User** - \`-rob <@user>\` • Attempt to steal baubles from another user',
	daily: '• **Daily Allowance** - \`-daily\` • Claim daily bauble rewards',
	weekly: '• **Weekly Allowance** - \`-weekly\` • Claim weekly bauble rewards',
	hourly: '• **Hourly Allowance** - \`-hourly\` • Claim hourly bauble rewards',
	monthly: '• **Monthly Allowance** - \`-monthly\` • Claim monthly bauble rewards',
	checklist: '• **Daily Checklist** - \`-checklist\` • Track completed daily tasks and bonuses',
	grab: '• **Grab Baubles** - \`-grab\` • Grab active bauble rain drops',
	crime: '• **Commit Crime** - \`-crime\` • Undertake high-risk crimes for baubles',
	dig: '• **Dig For Loot** - \`-dig\` • Dig up ground items with a shovel',
	dumpster: '• **Dumpster Diving** - \`-dumpster\` • Dive into dumpsters for hidden loot',
	expedition: '• **Send Expedition** - \`-expedition start <id>\` • Dispatch ducks on expeditions for treasure',
	fish: '• **Go Fishing** - \`-fish\` • Cast a line to catch valuable marine life',
	memehunt: '• **Meme Hunting** - \`-memehunt\` • Hunt down viral memes for rewards',
	baublerain: '• **Bauble Rain** - \`-baublerain <amount>\` • Drop a rain of baubles for the chat to grab',
	shop: '• **Item Shop** - \`-shop\` • Open the server item catalog',
	sell: '• **Sell Items** - \`-sell <item> [qty]\` • Sell items from your inventory back to the shop',
	use: '• **Activate Item** - \`-use <item>\` • Consume or trigger an item in your inventory',
	give: '• **Transfer Baubles** - \`-give <@user> <amount>\` • Transfer baubles directly to another user',
	gift: '• **Wrap Gift** - \`-gift <@user> <item>\` • Present an inventory item as a gift to a user',
	opengift: '• **Open Gift Boxes** - \`-opengift\` • Open a gift box received from another user',
	items: '• **Item Catalog** - \`-items\` • List catalog statistics',
	leaderboard: '• **Guild Leaderboard** - \`-leaderboard\` • View interactive guild economy leaderboards',
	globalleaderboard: '• **Global Standings** - \`-globalleaderboard\` • View global cross-server leaderboards',

	// Casino
	gamble: '• **Gamble Multiplier** - \`-gamble <amount>\` / \`/gamble\` • Bet baubles on a multiplier roll',
	coinflip: '• **Coinflip Bet** - \`-coinflip <heads/tails> <amount>\` / \`/coinflip\` • Double or nothing coin flip',
	slots: '• **Slots Jackpot** - \`-slots <amount>\` / \`/slots\` • Roll the slot machine for jackpots',
	blackjack: '• **Blackjack** - \`-blackjack <amount>\` / \`/blackjack\` • Play blackjack against the dealer',
	mblackjack: '• **Multiplayer Blackjack** - \`-mblackjack <amount>\` • Play multiplayer blackjack with friends',
	duckrace: '• **Duck Race Bet** - \`-duckrace <amount>\` / \`/duckrace\` • Enter a duck in a multi-player race',
	mines: '• **Minesweeper Bet** - \`-mines <amount> [mines]\` / \`/mines\` • Bet baubles on a mine field grid',
	buckshot: '• **Buckshot Showdown** - \`-buckshot <amount>\` / \`/buckshot\` • Play a deadly game of Russian Roulette',

	// Marriage
	marry: '• **Marry Partner** - \`-marry <@user>\` • Propose marriage to another member',
	divorce: '• **Divorce Spouse** - \`-divorce\` • End your active marriage',
	proposals: '• **Pending Proposals** - \`-proposals\` • Check pending marriage proposals',
	adopt: '• **Adopt Member** - \`-adopt <@user>\` • Adopt a member into your family',
	disown: '• **Disown Child** - \`-disown <@user>\` • Disown a child from your family tree',
	family: '• **Family Members** - \`-family [@user]\` • View your family relationships',
	familytree: '• **Family Tree Graphic** - \`-familytree [@user]\` • View the pedigree family tree map',

	// Minigames
	wordbomb: '• **Word Bomb Arena** - \`-wordbomb\` / \`/wordbomb\` • Start a spelling wordbomb game',
	scramble: '• **Word Scramble** - \`-scramble\` / \`/scramble\` • Unscramble letters to find the correct word',
	hangman: '• **Hangman Game** - \`-hangman\` / \`/hangman\` • Start a classic word guessing game of Hangman',
	battle: '• **Arena Brawl Duel** - \`-battle <@user>\` • Challenge a user to a combat battle',
	animebattle: '• **Anime Battle Duel** - \`-animebattle <@user>\` • Fight a user using anime cards and spells',
	deathbattle: '• **Death Match Simulation** - \`-deathbattle <@user>\` • Fight to the death in a text simulator',
	gridduel: '• **Grid Battleship Duel** - \`-gridduel <@user>\` • Challenge a user to a grid-based battle',
	emojidecode: '• **Emoji Decoding** - \`-emojidecode\` • Translate complex emoji sequences',
	guesstheflag: '• **Guess the Flag** - \`-guesstheflag\` • Guess the country flag shown in chat',
	geoguesser: '• **Geoguesser Maps** - \`-geoguesser\` • Identify the location from coordinates or map images',
	truthordare: '• **Truth or Dare** - \`-truthordare\` • Play a game of Truth or Dare',

	// Profile
	profile: '• **Profile Card** - \`-profile [@user]\` / \`/profile view\` • Display your profile banner card',
	'profile-edit': '• **Customize Profile** - \`-profile-edit\` / \`/profile edit\` • Edit profile configuration',
	'profile-reset': '• **Reset Profile** - \`-profile-reset\` / \`/profile reset\` • Revert profile customization back to default',
	title: '• **Equip Title** - \`-title set <title>\` / \`-title list\` • Configure showing titles on your profile card',
	achievements: '• **Player Badges** - \`-achievements [@user]\` • View your earned badges and awards',
	'achievements-list': '• **Achievements Directory** - \`-achievements-list\` • View all achievements catalog list',

	// Fun
	meme: '• **Internet Meme** - \`-meme\` • Display a random high-quality internet meme',
	wanted: '• **Wanted Poster** - \`-wanted [@user]\` • Create a wanted poster image of a member',
	hack: '• **Mock Hacking** - \`-hack <@user>\` • Execute a simulated funny hacking operation',
	iq: '• **IQ Assessment** - \`-iq [@user]\` • Run an IQ test on a user',
	vibecheck: '• **Vibe Meter** - \`-vibecheck [@user]\` • Measure the general vibe percentage of a user',
	ship: '• **Compatibility Check** - \`-ship <@user1> <@user2>\` • Calculate romantic compatibility between users',
	pp: '• **Size Gauge** - \`-pp [@user]\` • Measure a user\'s size',
	gayrate: '• **Gay Meter** - \`-gayrate [@user]\` • Run a rating scan on a user',
	'8ball': '• **Magic 8-Ball** - \`-8ball <question>\` • Ask the Magic 8-Ball a question',
	furry: '• **Furry Calculator** - \`-furry [@user]\` • Measure a user\'s percentage of furry',
	quote: '• **Create Graphic Quote** - \`-quote\` • Fetch a random quote',
	gta6: '• **GTA 6 Countdown** - \`-gta6\` • Check the release timer countdown for GTA 6',

	// AI
	ai: '• **DeepSeek Conversation** - \`-ai <question>\` / \`/ai\` • Talk to the DeepSeek conversational AI',
	apu: '• **APU Balance** - \`-apu [@user]\` / \`/apu\` • Check APU status, limits, and recharge status',
	excuse: '• **Excuse Generator** - \`-excuse\` • Generate a random, funny excuse',

	// Music
	play: '• **Play Music** - \`-play <search/URL>\` • Join voice channel and stream music tracks',
	stop: '• **Stop Music** - \`-stop\` • Stop audio playback and leave voice channel',
	pause: '• **Pause Playback** - \`-pause\` • Pause currently playing audio',
	resume: '• **Resume Playback** - \`-resume\` • Resume paused audio tracks',
	queue: '• **Show Queue** - \`-queue\` • View current audio queue tracklist',
	skip: '• **Skip Song** - \`-skip\` • Vote to skip the current track',
	remove: '• **Remove Track** - \`-remove <index>\` • Remove a track from the audio queue',
	clearmusic: '• **Clear Music Queue** - \`-clearmusic\` • Clear the entire audio queue',
	songinfo: '• **Song Metadata** - \`-songinfo\` • View full details of the currently playing track',
	lyrics: '• **Song Lyrics** - \`-lyrics [song]\` • Search and retrieve song lyrics',

	// Utility
	help: '• **Help Guide** - \`-help\` • Open this interactive help commands catalog',
	ping: '• **Latencies** - \`-ping\` • Measure the bot\'s WebSocket latency',
	announce: '• **Server Announcement** - \`-announce\` • Announce messages across channels',
	remind: '• **Set Reminder** - \`-remind <duration> <message>\` • Schedule a notification reminder',
	afk: '• **Away From Keyboard** - \`-afk [status]\` • Set your AFK status to auto-reply to pings',
	server: '• **Server Metrics** - \`-server\` • Display current server metrics and information',
	servericon: '• **Server Logo** - \`-servericon\` • Fetch server\'s logo image icon',
	user: '• **Database Account** - \`-user [@member]\` • Retrieve database profile and roles for a member',
	avatar: '• **Avatar Image** - \`-avatar [@member]\` • Fetch user\'s profile avatar image URL',
	rep: '• **Reputation Score** - \`-rep <@member>\` • Upvote and grant reputation points to a user',
	rank: '• **Chat XP Rank** - \`-rank [@member]\` • View current XP levels and rank progress',
	snipe: '• **Retrieve Deleted Message** - \`-snipe\` • Retrieve the last deleted message in the channel',
	support: '• **Developer Support** - \`-support\` • Fetch support server and developer contact details',
	invite: '• **Invite Link** - \`-invite\` • Fetch the bot\'s direct authorization invitation link',

	// Actions
	action: '• **Social Action** - \`-action <type> [@member]\` / \`/action\` • Perform anime actions (hug, kiss, slap)',
	angry: '• **Angry Expression** - \`-angry <@user>\` • Express anger at someone',
	baka: '• **Baka Callout** - \`-baka <@user>\` • Call someone a baka',
	bite: '• **Bite Interaction** - \`-bite <@user>\` • Bite someone',
	blush: '• **Blush Expression** - \`-blush\` • Blushes in embarrassment',
	bored: '• **Bored Expression** - \`-bored\` • Express boredom',
	cheer: '• **Cheer On** - \`-cheer <@user>\` • Cheer someone on',
	cry: '• **Cry Expression** - \`-cry\` • Start crying',
	cuddle: '• **Cuddle Interaction** - \`-cuddle <@user>\` • Cuddle someone',
	dance: '• **Dance Expression** - \`-dance\` • Starts dancing',
	facepalm: '• **Facepalm Expression** - \`-facepalm\` • Facepalm',
	feed: '• **Feed Interaction** - \`-feed <@user>\` • Feed someone',
	handhold: '• **Hold Hands** - \`-handhold <@user>\` • Hold hands with someone',
	handshake: '• **Handshake Interaction** - \`-handshake <@user>\` • Shake hands with someone',
	happy: '• **Happy Expression** - \`-happy\` • Express happiness',
	highfive: '• **High-Five Interaction** - \`-highfive <@user>\` • Give someone a high five',
	hug: '• **Hug Interaction** - \`-hug <@user>\` • Hug someone',
	husbando: '• **Husbando Check** - \`-husbando [@user]\` • Declare someone your husbando',
	kick: '• **Kick Interaction** - \`-kick <@user>\` • Kick someone (action)',
	kiss: '• **Kiss Interaction** - \`-kiss <@user>\` • Kiss someone',
	kitsune: '• **Kitsune Imagery** - \`-kitsune\` • Post a kitsune image',
	laugh: '• **Laugh Expression** - \`-laugh\` • Start laughing',
	lewd: '• **Lewd Reaction** - \`-lewd <@user>\` • Be lewd to someone (NSFW channels only)',
	lurk: '• **Lurk Expression** - \`-lurk\` • Lurk in chat',
	neko: '• **Neko Imagery** - \`-neko\` • Post a neko image',
	nod: '• **Nod Expression** - \`-nod\` • Nod your head',
	nom: '• **Nom nom Expression** - \`-nom\` • Start eating',
	nope: '• **Nope Expression** - \`-nope\` • Say nope',
	pat: '• **Pat Interaction** - \`-pat <@user>\` • Pat someone',
	peck: '• **Peck Kiss** - \`-peck <@user>\` • Give someone a quick peck',
	pout: '• **Pout Expression** - \`-pout\` • Pout',
	punch: '• **Punch Interaction** - \`-punch <@user>\` • Punch someone',
	run: '• **Run Away** - \`-run\` • Start running',
	shocked: '• **Shocked Expression** - \`-shocked\` • Look shocked',
	shoot: '• **Shoot Interaction** - \`-shoot <@user>\` • Shoot someone',
	shrug: '• **Shrug Expression** - \`-shrug\` • Shrug your shoulders',
	slap: '• **Slap Interaction** - \`-slap <@user>\` • Slap someone',
	sleep: '• **Sleep Expression** - \`-sleep\` • Go to sleep',
	smug: '• **Smug Expression** - \`-smug\` • Look smug',
	stare: '• **Stare Interaction** - \`-stare <@user>\` • Stare at someone',
	surprised: '• **Surprise Expression** - \`-surprised\` • Look surprised',
	think: '• **Thinking Expression** - \`-think\` • Start thinking',
	thumbsup: '• **Thumbs Up** - \`-thumbsup\` • Give a thumbs up',
	tickle: '• **Tickle Interaction** - \`-tickle <@user>\` • Tickle someone',
	touch: '• **Touch Interaction** - \`-touch <@user>\` • Touch someone',
	waifu: '• **Waifu Imagery** - \`-waifu\` • Post a waifu image',
	wave: '• **Wave Hello** - \`-wave <@user>\` • Wave at someone',
	whoop: '• **Whoop cheer** - \`-whoop <@user>\` • Whoop cheerily',
	wink: '• **Wink Interaction** - \`-wink <@user>\` • Wink at someone',
	yawn: '• **Yawn Expression** - \`-yawn\` • Yawn',
	yay: '• **Yay Cheer** - \`-yay\` • Celebrate with yay',
	yeet: '• **Yeet Interaction** - \`-yeet <@user>\` • Yeet someone',

	// Developer
	devinfo: '• **System Statistics** - \`-devinfo\` • View technical system details',
	eval: '• **Eval Script** - \`-eval <code>\` • Evaluate arbitrary javascript code',
	reload: '• **Reload Command** - \`-reload <command>\` • Reload command file',
	add: '• **Add XP/Baubles** - \`-add <baubles/xp> <@user> <amount>\` • Grant currency or XP',
	take: '• **Deduct XP/Baubles** - \`-take <baubles/xp> <@user> <amount>\` • Deduct currency or XP',
	reset: '• **Reset DB Document** - \`-reset <economy/xp/all> <@user>\` • Reset user profile data',
	awardachievement: '• **Award Badge** - \`-awardachievement <@user> <id>\` • Grant achievement manually',
	devban: '• **Global Ban** - \`-devban <ban/unban> <@user> [reason]\` • Globally restrict user access',
	devlogs: '• **Console Logs** - \`-devlogs [lines]\` • View recent bot system error logs',
	maintenance: '• **Maintenance Mode** - \`-maintenance <on/off>\` • Toggle global developer maintenance',
	taxfund: '• **View Tax Vault** - \`-taxfund\` • View government wealth tax vaults status',
	togglecmd: '• **Toggle Commands** - \`-togglecmd <command>\` • Enable/disable commands server-wide',
	devpremium: '• **Check Premium** - \`-devpremium [list/check] [@user]\` • Inspect or check active premiums',
	devprofile: '• **Deep Account Check** - \`-devprofile <@user>\` • Dump all bot statistics for a user',
	setpremium: '• **Manage Premium** - \`-setpremium <@user> <tier> [duration]\` • Modify user premium status'
};

const COMMAND_MAPPING = {
	// Developer Only
	devinfo: 'developer',
	eval: 'developer',
	reload: 'developer',
	add: 'developer',
	take: 'developer',
	reset: 'developer',
	awardachievement: 'developer',
	devban: 'developer',
	devlogs: 'developer',
	maintenance: 'developer',
	taxfund: 'developer',
	togglecmd: 'developer',
	devpremium: 'developer',
	devprofile: 'developer',
	setpremium: 'developer',

	// Admin
	config: 'admin',
	welcome: 'admin',
	autorole: 'admin',
	logging: 'admin',
	leveling: 'admin',
	reactionroles: 'admin',
	setquoteschannel: 'admin',
	snipetoggle: 'admin',
	starboard: 'admin',
	trigger: 'admin',

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
	lockdown: 'moderation',
	temprole: 'moderation',
	role: 'moderation',
	colorrole: 'moderation',
	securitycheck: 'moderation',
	ticket: 'moderation',
	steal: 'moderation',

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
	hourly: 'economy',
	monthly: 'economy',
	checklist: 'economy',
	grab: 'economy',
	shop: 'economy',
	sell: 'economy',
	use: 'economy',
	give: 'economy',
	gift: 'economy',
	leaderboard: 'economy',
	globalleaderboard: 'economy',
	collections: 'economy',
	crime: 'economy',
	dig: 'economy',
	dumpster: 'economy',
	economy: 'economy',
	expedition: 'economy',
	fish: 'economy',
	items: 'economy',
	memehunt: 'economy',
	gamestats: 'economy',
	winloss: 'economy',
	streak: 'economy',
	baublerain: 'economy',
	opengift: 'economy',

	// Casino
	gamble: 'casino',
	coinflip: 'casino',
	slots: 'casino',
	mines: 'casino',
	buckshot: 'casino',
	blackjack: 'casino',
	bj: 'casino',
	mblackjack: 'casino',
	duckrace: 'casino',

	// Profile
	profile: 'profile',
	'profile-edit': 'profile',
	'profile-reset': 'profile',
	title: 'profile',
	achievements: 'profile',
	'achievements-list': 'profile',

	// Marriage
	family: 'marriage',
	familytree: 'marriage',
	proposals: 'marriage',
	marry: 'marriage',
	divorce: 'marriage',
	adopt: 'marriage',
	disown: 'marriage',

	// Minigames
	wordbomb: 'minigames',
	scramble: 'minigames',
	emojidecode: 'minigames',
	guesstheflag: 'minigames',
	deathbattle: 'minigames',
	geoguesser: 'minigames',
	hangman: 'minigames',
	truthordare: 'minigames',
	battle: 'minigames',
	animebattle: 'minigames',
	gridduel: 'minigames',

	// Fun
	meme: 'fun',
	wanted: 'fun',
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

	// AI
	excuse: 'ai',
	ai: 'ai',
	apu: 'ai',

	// Music
	play: 'music',
	stop: 'music',
	pause: 'music',
	resume: 'music',
	queue: 'music',
	skip: 'music',
	remove: 'music',
	clearmusic: 'music',
	songinfo: 'music',
	lyrics: 'music',

	// Utility
	help: 'utility',
	ping: 'utility',
	remind: 'utility',
	afk: 'utility',
	server: 'utility',
	servericon: 'utility',
	user: 'utility',
	avatar: 'utility',
	rep: 'utility',
	rank: 'utility',
	snipe: 'utility',
	support: 'utility',
	invite: 'utility',
	announce: 'utility'
};

const commandGroups = {
	admin: [
		{
			title: '⚙️ Server Configurations',
			commands: ['config', 'welcome', 'autorole', 'logging', 'leveling', 'starboard', 'setquoteschannel', 'snipetoggle']
		},
		{
			title: '🎭 Interactive & Utility Setup',
			commands: ['reactionroles', 'trigger']
		}
	],
	moderation: [
		{
			title: '🛡️ Automated Moderation & Security',
			commands: ['automod', 'antispam', 'censor', 'mediaonly', 'securitycheck']
		},
		{
			title: '🔨 Punishments',
			commands: ['ban', 'unban', 'fakeban', 'mkick', 'timeout', 'removetimeout']
		},
		{
			title: '⚠️ Warnings & Infractions',
			commands: ['warn', 'warnings', 'clearwarn', 'clearwarnings']
		},
		{
			title: '🛠️ Staff Tools & Systems',
			commands: ['purge', 'defaultpurge', 'lock', 'unlock', 'lockdown', 'temprole', 'role', 'colorrole', 'ticket', 'steal']
		}
	],
	giveaway: [
		{
			title: '🎁 Giveaway Control',
			commands: ['giveaway', 'giveawayend']
		}
	],
	economy: [
		{
			title: '💳 Balance & Stats',
			commands: ['bauble', 'inventory', 'passive', 'collections', 'economy', 'gamestats', 'winloss', 'streak']
		},
		{
			title: '💼 Earnings & Work',
			commands: ['work', 'scavenge', 'rob', 'daily', 'weekly', 'hourly', 'monthly', 'checklist', 'grab', 'crime', 'dig', 'dumpster', 'expedition', 'fish', 'memehunt', 'baublerain']
		},
		{
			title: '🛒 Market & Trading',
			commands: ['shop', 'sell', 'use', 'give', 'gift', 'opengift', 'items']
		},
		{
			title: '📈 Leaderboards',
			commands: ['leaderboard', 'globalleaderboard']
		}
	],
	casino: [
		{
			title: '🎰 Classic Casino Games',
			commands: ['gamble', 'coinflip', 'slots', 'blackjack', 'mblackjack', 'duckrace']
		},
		{
			title: '💣 Survival & Strategy',
			commands: ['mines', 'buckshot']
		}
	],
	marriage: [
		{
			title: '💍 Matrimony & Marriage',
			commands: ['marry', 'divorce', 'proposals']
		},
		{
			title: '👪 Family Dynamics',
			commands: ['adopt', 'disown', 'family', 'familytree']
		}
	],
	minigames: [
		{
			title: '🧠 Word & Vocabulary Games',
			commands: ['wordbomb', 'scramble', 'hangman']
		},
		{
			title: '⚔️ Battles & Duels',
			commands: ['battle', 'animebattle', 'deathbattle', 'gridduel']
		},
		{
			title: '🌐 Trivia & Logic',
			commands: ['emojidecode', 'guesstheflag', 'geoguesser', 'truthordare']
		}
	],
	profile: [
		{
			title: '👤 User Profile Customization',
			commands: ['profile', 'profile-edit', 'profile-reset', 'title', 'achievements', 'achievements-list']
		}
	],
	fun: [
		{
			title: '🎭 Humor & Interactive',
			commands: ['meme', 'wanted', 'hack', 'iq', 'vibecheck', 'ship', 'pp', 'gayrate', '8ball', 'furry', 'gta6']
		},
		{
			title: '💬 Attributions',
			commands: ['quote']
		}
	],
	ai: [
		{
			title: '🤖 Artificial Intelligence',
			commands: ['ai', 'apu', 'excuse']
		}
	],
	music: [
		{
			title: '🎵 Playback & Control',
			commands: ['play', 'stop', 'pause', 'resume']
		},
		{
			title: '📜 Queue Management',
			commands: ['queue', 'skip', 'remove', 'clearmusic']
		},
		{
			title: 'ℹ️ Song Information & Lyrics',
			commands: ['songinfo', 'lyrics']
		}
	],
	utility: [
		{
			title: '⚙️ System Commands',
			commands: ['help', 'ping']
		},
		{
			title: '📢 Broadcast & Announcements',
			commands: ['announce']
		},
		{
			title: '📅 Reminders & AFK',
			commands: ['remind', 'afk']
		},
		{
			title: 'ℹ️ Information Lookup',
			commands: ['server', 'servericon', 'user', 'avatar', 'rep', 'rank', 'snipe', 'support', 'invite']
		}
	],
	developer: [
		{
			title: '👑 Owner / Developer Commands',
			commands: ['devinfo', 'eval', 'reload', 'add', 'take', 'reset', 'awardachievement', 'devban', 'devlogs', 'maintenance', 'taxfund', 'togglecmd', 'devpremium', 'devprofile', 'setpremium']
		}
	]
};

const actionGroups = [
	{
		title: '💖 Affectionate Actions',
		commands: ['hug', 'kiss', 'cuddle', 'pat', 'peck', 'tickle', 'touch', 'handhold']
	},
	{
		title: '😄 Friendly & Social',
		commands: ['happy', 'yay', 'laugh', 'wave', 'wink', 'thumbsup', 'highfive', 'dance', 'handshake', 'cheer', 'whoop']
	},
	{
		title: '😢 Sad & Tired',
		commands: ['cry', 'bored', 'pout', 'sleep', 'yawn', 'lurk']
	},
	{
		title: '😡 Aggressive / Action',
		commands: ['angry', 'slap', 'bite', 'punch', 'kick', 'shoot', 'yeet', 'run']
	},
	{
		title: '🤔 Expressive & Anime Info',
		commands: ['action', 'think', 'shrug', 'smug', 'stare', 'blush', 'baka', 'nom', 'nod', 'nope', 'facepalm', 'feed', 'lewd', 'waifu', 'neko', 'kitsune', 'husbando', 'shocked', 'surprised']
	}
];

module.exports = {
	category: 'utility',
	aliases: ['h', 'commands'],
	data: new SlashCommandBuilder()
		.setName('help')
		.setDescription('Displays all commands grouped by category.'),

	async execute(context) {
		const commands = context.client.commands;
		const grouped = {};
		const isOwner = (context.user?.id || context.author?.id) === config.devId;
		const { checkCommandPermission } = require('../../utils/permissions');
		const isAdmin = isOwner || (context.member && (context.member.permissions.has('Administrator') || await checkCommandPermission(context, 'bot')));

		// Group commands by category (collect name -> description map)
		for (const [, cmd] of commands) {
			const isDev = cmd.devOnly || cmd.hidden || cmd.category === 'developer' || COMMAND_MAPPING[cmd.data.name] === 'developer';
			if (isDev && !isOwner) continue;
			if (context.client.disabledCommands && context.client.disabledCommands.has(cmd.data.name)) continue;

			// Permission filtering: Skip if user lacks required permissions
			if (cmd.data.default_member_permissions && context.member) {
				if (!context.member.permissions.has(BigInt(cmd.data.default_member_permissions))) {
					continue;
				}
			}

			// Map command to its category dynamically
			let category = COMMAND_MAPPING[cmd.data.name];
			if (!category) {
				if (cmd.category === 'actions') {
					category = 'actions';
				} else {
					category = cmd.category || 'Uncategorized';
				}
			}

			if (category === 'developer' && !isOwner) continue;
			if (category === 'admin' && !isAdmin) continue;

			if (!grouped[category]) grouped[category] = {};
			grouped[category][cmd.data.name] = cmd.data.description || 'No description provided.';
		}

		// Sort categories by predefined order
		const categoryOrder = ['admin', 'moderation', 'giveaway', 'economy', 'casino', 'marriage', 'minigames', 'fun', 'profile', 'music', 'actions', 'ai', 'utility', 'developer'];
		const categories = Object.keys(grouped).sort((a, b) => {
			const idxA = categoryOrder.indexOf(a);
			const idxB = categoryOrder.indexOf(b);
			if (idxA === -1 && idxB === -1) return a.localeCompare(b);
			if (idxA === -1) return 1;
			if (idxB === -1) return -1;
			return idxA - idxB;
		});

		// Calculate total commands dynamically
		const totalCommands = Object.values(grouped).reduce((acc, cat) => acc + Object.keys(cat).length, 0);

		const embed = new EmbedBuilder()
			.setColor(0x2B2D31)
			.setTitle('✦ Nishanka')
			.setDescription(
				[
			'**Economy • Games • Moderation • Utility**',
			'',
			'A complete Discord experience built around progression, fun, and community.',
			'',
			'> Select a category below to explore commands.'
				].join('\n')
			)
			.setFooter({
				text: 'Nishanka • Built with ❤️'
			});

		const selectMenu = new StringSelectMenuBuilder()
			.setCustomId('help-category-select')
			.setPlaceholder('📂 Choose a category')
			.addOptions(
				categories.map((cat) => {
					const details = categoryDetails[cat] || {
						label: cat.charAt(0).toUpperCase() + cat.slice(1),
						emoji: '📂',
						description: 'List of commands'
					};
					return {
						label: details.label,
						value: cat,
						description: details.description,
						emoji: details.emoji
					};
				})
			);

		const row = new ActionRowBuilder().addComponents(selectMenu);

		const buttons = new ActionRowBuilder()
			.addComponents(
				new ButtonBuilder()
					.setLabel('Invite')
					.setStyle(ButtonStyle.Link)
					.setURL('https://discord.com/api/oauth2/authorize?client_id=1357752347643609198&permissions=8&scope=bot%20applications.commands'),

				new ButtonBuilder()
					.setLabel('Support')
					.setStyle(ButtonStyle.Link)
					.setURL('https://discord.gg/tkPfDP4n7D'),

				new ButtonBuilder()
					.setLabel('Dashboard / Server Config')
					.setStyle(ButtonStyle.Link)
					.setURL('https://nishanka.zeyuki.app/'),
				new ButtonBuilder()
					.setLabel('🗎 Docs')
					.setStyle(ButtonStyle.Link)
					.setURL('https://nishanka.zeyuki.app/docs')
			);

		const reply = await context.reply({
			embeds: [embed],
			components: [buttons, row],
			ephemeral: context.isPrefix ? false : true,
			fetchReply: true,
		});

		// Create a collector to listen to the dropdown selection
		const collector = reply.createMessageComponentCollector({
			componentType: ComponentType.StringSelect,
			time: 300000, // 5 minutes
		});

		collector.on('collect', async (interaction) => {
			try {

				const selected = interaction.values[0];
				const categoryCmds = grouped[selected] || {};
				const formattedSections = [];
				const formattedNames = new Set();

				if (selected === 'actions') {
					for (const group of actionGroups) {
						const activeInGroup = group.commands.filter(name => categoryCmds[name] !== undefined);
						if (activeInGroup.length > 0) {
							activeInGroup.forEach(name => formattedNames.add(name));
							const list = activeInGroup.map(name => {
								const detail = COMMAND_DETAILS[name] || `\`-${name}\` • Description not available.`;
								return detail;
							}).join('\n');
							formattedSections.push(`**${group.title}**\n${list}`);
						}
					}
				} else {
					const groups = commandGroups[selected] || [];
					for (const group of groups) {
						const activeInGroup = group.commands.filter(name => categoryCmds[name] !== undefined);
						if (activeInGroup.length > 0) {
							activeInGroup.forEach(name => formattedNames.add(name));
							const list = activeInGroup.map(name => {
								const detail = COMMAND_DETAILS[name] || `\`-${name}\` • Description not available.`;
								return detail;
							}).join('\n');
							formattedSections.push(`**${group.title}**\n${list}`);
						}
					}
				}

				// Catch-all for any un-categorized commands in that category folder
				const otherCmds = [];
				for (const name in categoryCmds) {
					if (!formattedNames.has(name)) {
						otherCmds.push(name);
					}
				}
				if (otherCmds.length > 0) {
					const list = otherCmds.map(name => {
						const detail = COMMAND_DETAILS[name] || `\`-${name}\` • Description not available.`;
						return detail;
					}).join('\n');
					formattedSections.push(`**❓ Miscellaneous Commands**\n${list}`);
				}

				const details = categoryDetails[selected] || { label: selected.toUpperCase(), description: "List of commands" };
				const embedColor = categoryColors[selected] || 0x3498db;

				const embeds = [];
				let currentDescription = '';
				
				for (const section of formattedSections) {
					if (currentDescription.length + section.length > 1800) {
						embeds.push(
							new EmbedBuilder()
								.setColor(0x2B2D31)
								.setTitle(`${details.emoji || '✦'} ${details.label} Commands ${embeds.length > 0 ? '(Cont.)' : ''}`)
								.setDescription(
									[
										`${details.description}`,
										'',
										currentDescription
									].join('\n')
								)
						);
						currentDescription = section;
					} else {
						if (currentDescription.length > 0) currentDescription += '\n\n';
						currentDescription += section;
					}
				}
				
				if (currentDescription.length > 0 || embeds.length === 0) {
					embeds.push(
						new EmbedBuilder()
							.setColor(0x2B2D31)
							.setTitle(`${details.emoji || '✦'} ${details.label} Commands ${embeds.length > 0 ? '(Cont.)' : ''}`)
							.setDescription(
								[
									`${details.description}`,
									'',
									currentDescription || 'No commands found.'
								].join('\n')
							)
							.setColor(embedColor)
					);
				}
				
				embeds[embeds.length - 1].setFooter({ text: 'Nishanka • Built with ❤️' });
				
				const finalEmbeds = embeds.slice(0, 10);

				await interaction.update({
					embeds: finalEmbeds,
					components: [buttons, row],
				});

			} catch (error) {
				if (error.code === 10062) {
					return;
				}
				console.error("Error updating help message:", error);
				await interaction.followUp({ content: "❌ An error occurred while updating the help message.", ephemeral: true }).catch(() => {});
			}
		});

		collector.on('end', (collected, reason) => {
			if (reply.edit) {
				if (reason === 'time') {
					const expiredEmbed = new EmbedBuilder()
						.setTitle('📘 Help Menu')
						.setDescription('This help menu has expired due to inactivity. Run the command again to use it.')
						.setColor(0x95a5a6)
						.setFooter({ text: 'Nishanka • Built with ❤️' });

					reply.edit({ embeds: [expiredEmbed], components: [] }).catch(console.error);
				} else {
					reply.edit({ components: [] }).catch(console.error);
				}
			}
		});
	},

	async executePrefix(message) {
		await module.exports.execute({
			client: message.client,
			author: message.author,
			member: message.member,
			channel: message.channel,
			reply: (...args) => message.channel.send(...args),
			isPrefix: true,
		});
	},
};
