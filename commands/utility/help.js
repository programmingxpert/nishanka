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
	config: '**Server Config**\n\`-config bot\` / \`/config\`\n> Configure bot settings on web dashboard',
	welcome: '**Greeting Behaviour**\n\`-welcome toggle\` (on/off), \`-welcome channel <#channel>\`\n> Configure welcome greetings',
	autorole: '**Auto-Role Assignment**\n\`-autorole add <@role>\`, \`-autorole remove <@role>\`\n> Auto-assign roles on join',
	logging: '**Action Logging**\n\`-logging toggle\`, \`-logging channel <#channel>\`\n> Setup visual server logs',
	leveling: '**Leveling Settings**\n\`-leveling toggle\`, \`-leveling channel <#channel>\`\n> Configure leveling and rank announcements',
	reactionroles: '**Reaction Roles**\n\`-reactionroles setup\`\n> Run interactive reaction-role creator wizard',
	setquoteschannel: '**Quote Channel**\n\`-setquoteschannel <#channel>\`\n> Set quotes drop channel',
	snipetoggle: '**Snipe Feature**\n\`-snipetoggle\`\n> Toggle message recovery snipe system',
	starboard: '**Starboard System**\n\`-starboard setup\`, \`-starboard channel <#channel>\`\n> Configure starboard channel',
	trigger: '**Custom Triggers**\n\`-trigger create <trigger> <reply>\`, \`-trigger delete <trigger>\`\n> Custom keyword replies',

	// Moderation
	automod: '**AutoMod System**\n\`-automod enable <links/invites/mentions>\`\n> Configure automated moderation',
	antispam: '**Anti-Spam Filter**\n\`-antispam enable\`, \`-antispam disable\`\n> Toggle anti-spam message rate limits',
	censor: '**Word Censorship**\n\`-censor add <word>\`, \`-censor remove <word>\`\n> Manage server censors',
	mediaonly: '**Media-Only Channel**\n\`-mediaonly add <#channel>\`, \`-mediaonly remove <#channel>\`\n> Lock channels to attachments only',
	securitycheck: '**Security Audit**\n\`-securitycheck\` / \`/securitycheck\`\n> Scan guild safety metrics',
	ban: '**Ban Member**\n\`-ban <@user> [reason]\` / \`/ban\`\n> Ban a member from the guild',
	unban: '**Unban Member**\n\`-unban <userId> [reason]\`\n> Revoke a member\'s ban',
	fakeban: '**Fake Ban Joke**\n\`-fakeban <@user>\`\n> Trigger a realistic troll ban message',
	mkick: '**Multi-Kick**\n\`-mkick <@user1> <@user2>\` / \`/mkick\`\n> Kick multiple members at once',
	timeout: '**Mute/Timeout User**\n\`-timeout <@user> <duration> [reason]\` / \`/timeout\`\n> Time-out a member',
	removetimeout: '**Remove Timeout**\n\`-removetimeout <@user>\` / \`/removetimeout\`\n> Lift time-out from a user',
	warn: '**Warn Member**\n\`-warn <@user> [reason]\` / \`/warn\`\n> Issue warning infraction to a member',
	warnings: '**Infraction History**\n\`-warnings <@user>\` / \`/warnings\`\n> View warning infraction history',
	clearwarn: '**Void Warning**\n\`-clearwarn <@user> <warningId>\`\n> Void a specific warning ID',
	clearwarnings: '**Clear All Warnings**\n\`-clearwarnings <@user>\`\n> Clear all warnings for a user',
	purge: '**Message Purging**\n\`-purge <amount>\` / \`/purge\`\n> Bulk delete messages',
	defaultpurge: '**Default Purge Limit**\n\`-defaultpurge <amount>\`\n> Purge messages matching server presets',
	lock: '**Channel Locking**\n\`-lock [#channel] [@role] [reason]\` / \`/lock\`\n> Lock down text channels',
	unlock: '**Channel Unlocking**\n\`-unlock [#channel] [@role] [reason]\` / \`/unlock\`\n> Unlock a channel',
	lockdown: '**Server Lockdown**\n\`-lockdown\`\n> Restrict or lockdown all server channels during emergencies',
	temprole: '**Temporary Roles**\n\`-temprole <@user> <@role> <duration>\`\n> Assign temporary roles',
	role: '**Role Management**\n\`-role add/remove <@user> <@role>\`\n> Grant or revoke roles',
	colorrole: '**Color Role Customization**\n\`-colorrole <#hex>\`\n> Set custom color role for a user',
	ticket: '**Support Tickets**\n\`-ticket setup\` or \`-ticket close\`\n> Configure server support tickets',
	steal: '**Emoji & Sticker Stealer**\n\`-steal <emoji/sticker/reply>\` / \`/steal\`\n> Upload custom emojis/stickers',

	// Giveaway
	giveaway: '**Giveaway Creator**\n\`-giveaway start <duration> <winners> <prize>\`\n> Launch a custom giveaway',
	giveawayend: '**End Giveaway**\n\`-giveawayend <messageId>\` / \`/giveaway end\`\n> Terminate giveaway and pick winners early',

	// Economy
	bauble: '**Bauble Balance**\n\`-bauble [@user]\`\n> View Glimmering Bauble balance',
	inventory: '**Backpack Inventory**\n\`-inventory [@user]\`\n> View backpack inventory items',
	passive: '**Passive Toggle**\n\`-passive toggle\`\n> Turn passive mode on/off to block thefts',
	collections: '**Item Collections**\n\`-collections\`\n> Inspect completed collectible trophies',
	economy: '**Economy Metrics**\n\`-economy\`\n> Access server market details and economy status',
	gamestats: '**Player Gameplay Stats**\n\`-gamestats [@user]\`\n> View detailed minigame wins and streaks',
	winloss: '**Game Win/Loss Record**\n\`-winloss [@user]\`\n> Check casino win/loss statistics',
	streak: '**Active Streaks**\n\`-streak [@user]\`\n> Check active minigame streaks',
	work: '**Interactive Work**\n\`-work\`\n> Perform daily jobs to earn baubles',
	scavenge: '**Scavenge Areas**\n\`-scavenge\`\n> Rummage around for items or cash',
	rob: '**Rob User**\n\`-rob <@user>\`\n> Attempt to steal baubles from another user',
	daily: '**Daily Allowance**\n\`-daily\`\n> Claim daily bauble rewards',
	weekly: '**Weekly Allowance**\n\`-weekly\`\n> Claim weekly bauble rewards',
	hourly: '**Hourly Allowance**\n\`-hourly\`\n> Claim hourly bauble rewards',
	monthly: '**Monthly Allowance**\n\`-monthly\`\n> Claim monthly bauble rewards',
	checklist: '**Daily Checklist**\n\`-checklist\`\n> Track completed daily tasks and bonuses',
	grab: '**Grab Baubles**\n\`-grab\`\n> Grab active bauble rain drops',
	crime: '**Commit Crime**\n\`-crime\`\n> Undertake high-risk crimes for baubles',
	dig: '**Dig For Loot**\n\`-dig\`\n> Dig up ground items with a shovel',
	dumpster: '**Dumpster Diving**\n\`-dumpster\`\n> Dive into dumpsters for hidden loot',
	expedition: '**Send Expedition**\n\`-expedition start <id>\`\n> Dispatch ducks on expeditions for treasure',
	fish: '**Go Fishing**\n\`-fish\`\n> Cast a line to catch valuable marine life',
	memehunt: '**Meme Hunting**\n\`-memehunt\`\n> Hunt down viral memes for rewards',
	baublerain: '**Bauble Rain**\n\`-baublerain <amount>\`\n> Drop a rain of baubles for the chat to grab',
	shop: '**Item Shop**\n\`-shop\`\n> Open the server item catalog',
	sell: '**Sell Items**\n\`-sell <item> [qty]\`\n> Sell items from your inventory back to the shop',
	use: '**Activate Item**\n\`-use <item>\`\n> Consume or trigger an item in your inventory',
	give: '**Transfer Baubles**\n\`-give <@user> <amount>\`\n> Transfer baubles directly to another user',
	gift: '**Wrap Gift**\n\`-gift <@user> <item>\`\n> Present an inventory item as a gift to a user',
	opengift: '**Open Gift Boxes**\n\`-opengift\`\n> Open a gift box received from another user',
	items: '**Item Catalog**\n\`-items\`\n> List catalog statistics',
	leaderboard: '**Guild Leaderboard**\n\`-leaderboard\`\n> View interactive guild economy leaderboards',
	globalleaderboard: '**Global Standings**\n\`-globalleaderboard\`\n> View global cross-server leaderboards',

	// Casino
	gamble: '**Gamble Multiplier**\n\`-gamble <amount>\` / \`/gamble\`\n> Bet baubles on a multiplier roll',
	coinflip: '**Coinflip Bet**\n\`-coinflip <heads/tails> <amount>\` / \`/coinflip\`\n> Double or nothing coin flip',
	slots: '**Slots Jackpot**\n\`-slots <amount>\` / \`/slots\`\n> Roll the slot machine for jackpots',
	blackjack: '**Blackjack**\n\`-blackjack <amount>\` / \`/blackjack\`\n> Play blackjack against the dealer',
	mblackjack: '**Multiplayer Blackjack**\n\`-mblackjack <amount>\`\n> Play multiplayer blackjack with friends',
	duckrace: '**Duck Race Bet**\n\`-duckrace <amount>\` / \`/duckrace\`\n> Enter a duck in a multi-player race',
	mines: '**Minesweeper Bet**\n\`-mines <amount> [mines]\` / \`/mines\`\n> Bet baubles on a mine field grid',
	buckshot: '**Buckshot Showdown**\n\`-buckshot <amount>\` / \`/buckshot\`\n> Play a deadly game of Russian Roulette',

	// Marriage
	marry: '**Marry Partner**\n\`-marry <@user>\`\n> Propose marriage to another member',
	divorce: '**Divorce Spouse**\n\`-divorce\`\n> End your active marriage',
	proposals: '**Pending Proposals**\n\`-proposals\`\n> Check pending marriage proposals',
	adopt: '**Adopt Member**\n\`-adopt <@user>\`\n> Adopt a member into your family',
	disown: '**Disown Child**\n\`-disown <@user>\`\n> Disown a child from your family tree',
	family: '**Family Members**\n\`-family [@user]\`\n> View your family relationships',
	familytree: '**Family Tree Graphic**\n\`-familytree [@user]\`\n> View the pedigree family tree map',

	// Minigames
	wordbomb: '**Word Bomb Arena**\n\`-wordbomb\` / \`/wordbomb\`\n> Start a spelling wordbomb game',
	scramble: '**Word Scramble**\n\`-scramble\` / \`/scramble\`\n> Unscramble letters to find the correct word',
	hangman: '**Hangman Game**\n\`-hangman\` / \`/hangman\`\n> Start a classic word guessing game of Hangman',
	battle: '**Arena Brawl Duel**\n\`-battle <@user>\`\n> Challenge a user to a combat battle',
	animebattle: '**Anime Battle Duel**\n\`-animebattle <@user>\`\n> Fight a user using anime cards and spells',
	deathbattle: '**Death Match Simulation**\n\`-deathbattle <@user>\`\n> Fight to the death in a text simulator',
	gridduel: '**Grid Battleship Duel**\n\`-gridduel <@user>\`\n> Challenge a user to a grid-based battle',
	emojidecode: '**Emoji Decoding**\n\`-emojidecode\`\n> Translate complex emoji sequences',
	guesstheflag: '**Guess the Flag**\n\`-guesstheflag\`\n> Guess the country flag shown in chat',
	geoguesser: '**Geoguesser Maps**\n\`-geoguesser\`\n> Identify the location from coordinates or map images',
	truthordare: '**Truth or Dare**\n\`-truthordare\`\n> Play a game of Truth or Dare',

	// Profile
	profile: '**Profile Card**\n\`-profile [@user]\` / \`/profile view\`\n> Display your profile banner card',
	'profile-edit': '**Customize Profile**\n\`-profile-edit\` / \`/profile edit\`\n> Edit profile configuration',
	'profile-reset': '**Reset Profile**\n\`-profile-reset\` / \`/profile reset\`\n> Revert profile customization back to default',
	title: '**Equip Title**\n\`-title set <title>\` / \`-title list\`\n> Configure showing titles on your profile card',
	achievements: '**Player Badges**\n\`-achievements [@user]\`\n> View your earned badges and awards',
	'achievements-list': '**Achievements Directory**\n\`-achievements-list\`\n> View all achievements catalog list',

	// Fun
	meme: '**Internet Meme**\n\`-meme\`\n> Display a random high-quality internet meme',
	wanted: '**Wanted Poster**\n\`-wanted [@user]\`\n> Create a wanted poster image of a member',
	hack: '**Mock Hacking**\n\`-hack <@user>\`\n> Execute a simulated funny hacking operation',
	iq: '**IQ Assessment**\n\`-iq [@user]\`\n> Run an IQ test on a user',
	vibecheck: '**Vibe Meter**\n\`-vibecheck [@user]\`\n> Measure the general vibe percentage of a user',
	ship: '**Compatibility Check**\n\`-ship <@user1> <@user2>\`\n> Calculate romantic compatibility between users',
	pp: '**Size Gauge**\n\`-pp [@user]\`\n> Measure a user\'s size',
	gayrate: '**Gay Meter**\n\`-gayrate [@user]\`\n> Run a rating scan on a user',
	'8ball': '**Magic 8-Ball**\n\`-8ball <question>\`\n> Ask the Magic 8-Ball a question',
	furry: '**Furry Calculator**\n\`-furry [@user]\`\n> Measure a user\'s percentage of furry',
	quote: '**Create Graphic Quote**\n\`-quote\`\n> Fetch a random quote',
	gta6: '**GTA 6 Countdown**\n\`-gta6\`\n> Check the release timer countdown for GTA 6',

	// AI
	ai: '**DeepSeek Conversation**\n\`-ai <question>\` / \`/ai\`\n> Talk to the DeepSeek conversational AI',
	apu: '**APU Balance**\n\`-apu [@user]\` / \`/apu\`\n> Check APU status, limits, and recharge status',
	excuse: '**Excuse Generator**\n\`-excuse\`\n> Generate a random, funny excuse',

	// Music
	play: '**Play Music**\n\`-play <search/URL>\`\n> Join voice channel and stream music tracks',
	stop: '**Stop Music**\n\`-stop\`\n> Stop audio playback and leave voice channel',
	pause: '**Pause Playback**\n\`-pause\`\n> Pause currently playing audio',
	resume: '**Resume Playback**\n\`-resume\`\n> Resume paused audio tracks',
	queue: '**Show Queue**\n\`-queue\`\n> View current audio queue tracklist',
	skip: '**Skip Song**\n\`-skip\`\n> Vote to skip the current track',
	remove: '**Remove Track**\n\`-remove <index>\`\n> Remove a track from the audio queue',
	clearmusic: '**Clear Music Queue**\n\`-clearmusic\`\n> Clear the entire audio queue',
	songinfo: '**Song Metadata**\n\`-songinfo\`\n> View full details of the currently playing track',
	lyrics: '**Song Lyrics**\n\`-lyrics [song]\`\n> Search and retrieve song lyrics',

	// Utility
	help: '**Help Guide**\n\`-help\`\n> Open this interactive help commands catalog',
	ping: '**Latencies**\n\`-ping\`\n> Measure the bot\'s WebSocket latency',
	announce: '**Server Announcement**\n\`-announce\`\n> Announce messages across channels',
	remind: '**Set Reminder**\n\`-remind <duration> <message>\`\n> Schedule a notification reminder',
	afk: '**Away From Keyboard**\n\`-afk [status]\`\n> Set your AFK status to auto-reply to pings',
	server: '**Server Metrics**\n\`-server\`\n> Display current server metrics and information',
	servericon: '**Server Logo**\n\`-servericon\`\n> Fetch server\'s logo image icon',
	user: '**Database Account**\n\`-user [@member]\`\n> Retrieve database profile and roles for a member',
	avatar: '**Avatar Image**\n\`-avatar [@member]\`\n> Fetch user\'s profile avatar image URL',
	rep: '**Reputation Score**\n\`-rep <@member>\`\n> Upvote and grant reputation points to a user',
	rank: '**Chat XP Rank**\n\`-rank [@member]\`\n> View current XP levels and rank progress',
	snipe: '**Retrieve Deleted Message**\n\`-snipe\`\n> Retrieve the last deleted message in the channel',
	support: '**Developer Support**\n\`-support\`\n> Fetch support server and developer contact details',
	invite: '**Invite Link**\n\`-invite\`\n> Fetch the bot\'s direct authorization invitation link',

	// Actions
	action: '**Social Action**\n\`-action <type> [@member]\` / \`/action\`\n> Perform anime actions (hug, kiss, slap)',
	angry: '**Angry Expression**\n\`-angry <@user>\`\n> Express anger at someone',
	baka: '**Baka Callout**\n\`-baka <@user>\`\n> Call someone a baka',
	bite: '**Bite Interaction**\n\`-bite <@user>\`\n> Bite someone',
	blush: '**Blush Expression**\n\`-blush\`\n> Blushes in embarrassment',
	bored: '**Bored Expression**\n\`-bored\`\n> Express boredom',
	cheer: '**Cheer On**\n\`-cheer <@user>\`\n> Cheer someone on',
	cry: '**Cry Expression**\n\`-cry\`\n> Start crying',
	cuddle: '**Cuddle Interaction**\n\`-cuddle <@user>\`\n> Cuddle someone',
	dance: '**Dance Expression**\n\`-dance\`\n> Starts dancing',
	facepalm: '**Facepalm Expression**\n\`-facepalm\`\n> Facepalm',
	feed: '**Feed Interaction**\n\`-feed <@user>\`\n> Feed someone',
	handhold: '**Hold Hands**\n\`-handhold <@user>\`\n> Hold hands with someone',
	handshake: '**Handshake Interaction**\n\`-handshake <@user>\`\n> Shake hands with someone',
	happy: '**Happy Expression**\n\`-happy\`\n> Express happiness',
	highfive: '**High-Five Interaction**\n\`-highfive <@user>\`\n> Give someone a high five',
	hug: '**Hug Interaction**\n\`-hug <@user>\`\n> Hug someone',
	husbando: '**Husbando Check**\n\`-husbando [@user]\`\n> Declare someone your husbando',
	kick: '**Kick Interaction**\n\`-kick <@user>\`\n> Kick someone (action)',
	kiss: '**Kiss Interaction**\n\`-kiss <@user>\`\n> Kiss someone',
	kitsune: '**Kitsune Imagery**\n\`-kitsune\`\n> Post a kitsune image',
	laugh: '**Laugh Expression**\n\`-laugh\`\n> Start laughing',
	lewd: '**Lewd Reaction**\n\`-lewd <@user>\`\n> Be lewd to someone (NSFW channels only)',
	lurk: '**Lurk Expression**\n\`-lurk\`\n> Lurk in chat',
	neko: '**Neko Imagery**\n\`-neko\`\n> Post a neko image',
	nod: '**Nod Expression**\n\`-nod\`\n> Nod your head',
	nom: '**Nom nom Expression**\n\`-nom\`\n> Start eating',
	nope: '**Nope Expression**\n\`-nope\`\n> Say nope',
	pat: '**Pat Interaction**\n\`-pat <@user>\`\n> Pat someone',
	peck: '**Peck Kiss**\n\`-peck <@user>\`\n> Give someone a quick peck',
	pout: '**Pout Expression**\n\`-pout\`\n> Pout',
	punch: '**Punch Interaction**\n\`-punch <@user>\`\n> Punch someone',
	run: '**Run Away**\n\`-run\`\n> Start running',
	shocked: '**Shocked Expression**\n\`-shocked\`\n> Look shocked',
	shoot: '**Shoot Interaction**\n\`-shoot <@user>\`\n> Shoot someone',
	shrug: '**Shrug Expression**\n\`-shrug\`\n> Shrug your shoulders',
	slap: '**Slap Interaction**\n\`-slap <@user>\`\n> Slap someone',
	sleep: '**Sleep Expression**\n\`-sleep\`\n> Go to sleep',
	smug: '**Smug Expression**\n\`-smug\`\n> Look smug',
	stare: '**Stare Interaction**\n\`-stare <@user>\`\n> Stare at someone',
	surprised: '**Surprise Expression**\n\`-surprised\`\n> Look surprised',
	think: '**Thinking Expression**\n\`-think\`\n> Start thinking',
	thumbsup: '**Thumbs Up**\n\`-thumbsup\`\n> Give a thumbs up',
	tickle: '**Tickle Interaction**\n\`-tickle <@user>\`\n> Tickle someone',
	touch: '**Touch Interaction**\n\`-touch <@user>\`\n> Touch someone',
	waifu: '**Waifu Imagery**\n\`-waifu\`\n> Post a waifu image',
	wave: '**Wave Hello**\n\`-wave <@user>\`\n> Wave at someone',
	whoop: '**Whoop cheer**\n\`-whoop <@user>\`\n> Whoop cheerily',
	wink: '**Wink Interaction**\n\`-wink <@user>\`\n> Wink at someone',
	yawn: '**Yawn Expression**\n\`-yawn\`\n> Yawn',
	yay: '**Yay Cheer**\n\`-yay\`\n> Celebrate with yay',
	yeet: '**Yeet Interaction**\n\`-yeet <@user>\`\n> Yeet someone',

	// Developer
	devinfo: '**System Statistics**\n\`-devinfo\`\n> View technical system details',
	eval: '**Eval Script**\n\`-eval <code>\`\n> Evaluate arbitrary javascript code',
	reload: '**Reload Command**\n\`-reload <command>\`\n> Reload command file',
	add: '**Add XP/Baubles**\n\`-add <baubles/xp> <@user> <amount>\`\n> Grant currency or XP',
	take: '**Deduct XP/Baubles**\n\`-take <baubles/xp> <@user> <amount>\`\n> Deduct currency or XP',
	reset: '**Reset DB Document**\n\`-reset <economy/xp/all> <@user>\`\n> Reset user profile data',
	awardachievement: '**Award Badge**\n\`-awardachievement <@user> <id>\`\n> Grant achievement manually',
	devban: '**Global Ban**\n\`-devban <ban/unban> <@user> [reason]\`\n> Globally restrict user access',
	devlogs: '**Console Logs**\n\`-devlogs [lines]\`\n> View recent bot system error logs',
	maintenance: '**Maintenance Mode**\n\`-maintenance <on/off>\`\n> Toggle global developer maintenance',
	taxfund: '**View Tax Vault**\n\`-taxfund\`\n> View government wealth tax vaults status',
	togglecmd: '**Toggle Commands**\n\`-togglecmd <command>\`\n> Enable/disable commands server-wide',
	devpremium: '**Check Premium**\n\`-devpremium [list/check] [@user]\`\n> Inspect or check active premiums',
	devprofile: '**Deep Account Check**\n\`-devprofile <@user>\`\n> Dump all bot statistics for a user',
	setpremium: '**Manage Premium**\n\`-setpremium <@user> <tier> [duration]\`\n> Modify user premium status',
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
							}).join('\n\n');
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
							}).join('\n\n');
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
					}).join('\n\n');
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
									].join('\n\n')
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
								].join('\n\n')
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
