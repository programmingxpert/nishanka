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
	mod_security: {
		label: 'Moderation: AutoMod & Security',
		emoji: emoji('category.mod_security', '🛡️'),
		description: 'Setup antispam, censor words, media locks, and safety audits.',
	},
	mod_punish: {
		label: 'Moderation: Punishments & Warns',
		emoji: emoji('category.mod_punish', '🔨'),
		description: 'Ban, unban, kick, timeout, and warn infractions.',
	},
	mod_staff: {
		label: 'Moderation: Staff Tools & Tickets',
		emoji: emoji('category.mod_staff', '🛠️'),
		description: 'Purge, locks, ticket setup, role management, and stealer.',
	},
	giveaway: {
		label: 'Giveaway Controls',
		emoji: emoji('category.giveaway', '🎁'),
		description: 'Schedule, run, draw, and end server giveaways.',
	},
	economy_balance: {
		label: 'Economy: Balances & Stats',
		emoji: emoji('category.economy_balance', '💳'),
		description: 'Check baubles, inventory, passive mode, and stats.',
	},
	economy_earn: {
		label: 'Economy: Work & Activities',
		emoji: emoji('category.economy_earn', '💼'),
		description: 'Daily work, scavenge, rob, crime, dig, fish, and expeditions.',
	},
	economy_shop: {
		label: 'Economy: Shop & Trading',
		emoji: emoji('category.economy_shop', '🛒'),
		description: 'Browse items shop, sell, use, gift, or open gifts.',
	},
	economy_rank: {
		label: 'Economy: Leaderboards',
		emoji: emoji('category.economy_rank', '📈'),
		description: 'View local server and global cross-server leaderboards.',
	},
	casino: {
		label: 'Casino & Betting',
		emoji: emoji('category.casino', '🎰'),
		description: 'Play gamble, coinflip, slots, blackjack, mines, and buckshot.',
	},
	marriage: {
		label: 'Marriage & Family',
		emoji: emoji('category.marriage', '💍'),
		description: 'Propose, marry, divorce, adopt children, and build family trees.',
	},
	minigames: {
		label: 'Minigames',
		emoji: emoji('category.minigames', '🎮'),
		description: 'Wordbomb, scramble, hangman, duels, flag-guessing, and trivia.',
	},
	fun: {
		label: 'Humor & Entertainment',
		emoji: emoji('category.fun', '🎭'),
		description: 'Meme generator, wanted posters, hack, iq, pp, and compatibility.',
	},
	profile: {
		label: 'Profiles & Banners',
		emoji: emoji('category.profile', '👤'),
		description: 'View profile banner card, reset, edit banners, equip titles and badges.',
	},
	music: {
		label: 'Music Player',
		emoji: emoji('category.music', '🎵'),
		description: 'Stream audio tracks, manage queues, and fetch lyrics.',
	},
	actions_affection: {
		label: 'Social: Affectionate Actions',
		emoji: emoji('category.actions_affection', '💖'),
		description: 'Hug, kiss, cuddle, pat, peck, tickle, touch, and hold hands.',
	},
	actions_friendly: {
		label: 'Social: Friendly & Celebration',
		emoji: emoji('category.actions_friendly', '😄'),
		description: 'Happy, yay, laugh, wave, wink, thumbsup, highfive, dance, and handshake.',
	},
	actions_sad: {
		label: 'Social: Sad & Tired Expressions',
		emoji: emoji('category.actions_sad', '😢'),
		description: 'Cry, bored, pout, sleep, yawn, and lurk.',
	},
	actions_aggressive: {
		label: 'Social: Aggressive Expressions',
		emoji: emoji('category.actions_aggressive', '😡'),
		description: 'Angry, slap, bite, punch, kick, shoot, yeet, and run.',
	},
	actions_expressive: {
		label: 'Social: Expressions & Info',
		emoji: emoji('category.actions_expressive', '🤔'),
		description: 'Actions info, think, shrug, smug, baka, nom, nod, and waifu/neko art.',
	},
	ai: {
		label: 'Artificial Intelligence',
		emoji: emoji('category.ai', '🤖'),
		description: 'DeepSeek conversational assistant, APU status, and excuse maker.',
	},
	utility: {
		label: 'Utility Tools',
		emoji: emoji('category.utility', '🛠️'),
		description: 'General bot help, ping latency, reminders, AFK status, and server info.',
	},
	developer: {
		label: 'Developer Only',
		emoji: '👑',
		description: 'Exclusive command controls restricted to the bot owner.'
	}
};

const categoryColors = {
	admin: 0x2b2d42,
	mod_security: 0x2ecc71,
	mod_punish: 0x2ecc71,
	mod_staff: 0x2ecc71,
	giveaway: 0xe67e22,
	economy_balance: 0xf1c40f,
	economy_earn: 0xf1c40f,
	economy_shop: 0xf1c40f,
	economy_rank: 0xf1c40f,
	casino: 0xe74c3c,
	marriage: 0xe84393,
	minigames: 0x3498db,
	fun: 0x9b59b6,
	profile: 0x1abc9c,
	music: 0x9b59b6,
	actions_affection: 0xe84393,
	actions_friendly: 0xe84393,
	actions_sad: 0xe84393,
	actions_aggressive: 0xe84393,
	actions_expressive: 0xe84393,
	ai: 0x7c6cf0,
	utility: 0x95a5a6,
	developer: 0x2c3e50
};

const COMMAND_DETAILS = {
	// Admin
	config: '**Server Config** » \`-config bot\` / \`/config\` • *Configure bot settings on web dashboard.*',
	welcome: '**Greeting Behaviour** » \`-welcome toggle\` (on/off), \`-welcome channel <#channel>\` • *Configure welcome greetings.*',
	autorole: '**Auto-Role Assignment** » \`-autorole add <@role>\`, \`-autorole remove <@role>\` • *Auto-assign roles on join.*',
	logging: '**Action Logging** » \`-logging toggle\`, \`-logging channel <#channel>\` • *Setup visual server logs.*',
	leveling: '**Leveling Settings** » \`-leveling toggle\`, \`-leveling channel <#channel>\` • *Configure leveling and rank announcements.*',
	reactionroles: '**Reaction Roles** » \`-reactionroles setup\` • *Run interactive reaction-role creator wizard.*',
	setquoteschannel: '**Quote Channel** » \`-setquoteschannel <#channel>\` • *Set quotes drop channel.*',
	snipetoggle: '**Snipe Feature** » \`-snipetoggle\` • *Toggle message recovery snipe system.*',
	starboard: '**Starboard System** » \`-starboard setup\`, \`-starboard channel <#channel>\` • *Configure starboard channel.*',
	trigger: '**Custom Triggers** » \`-trigger create <trigger> <reply>\`, \`-trigger delete <trigger>\` • *Custom keyword replies.*',

	// Moderation
	automod: '**AutoMod System** » \`-automod enable <links/invites/mentions>\` • *Configure automated moderation.*',
	antispam: '**Anti-Spam Filter** » \`-antispam enable\`, \`-antispam disable\` • *Toggle anti-spam message rate limits.*',
	censor: '**Word Censorship** » \`-censor add <word>\`, \`-censor remove <word>\` • *Manage server censors.*',
	mediaonly: '**Media-Only Channel** » \`-mediaonly add <#channel>\`, \`-mediaonly remove <#channel>\` • *Lock channels to attachments only.*',
	securitycheck: '**Security Audit** » \`-securitycheck\` / \`/securitycheck\` • *Scan guild safety metrics.*',
	ban: '**Ban Member** » \`-ban <@user> [reason]\` / \`/ban\` • *Ban a member from the guild.*',
	unban: '**Unban Member** » \`-unban <userId> [reason]\` • *Revoke a member\'s ban.*',
	fakeban: '**Fake Ban Joke** » \`-fakeban <@user>\` • *Trigger a realistic troll ban message.*',
	mkick: '**Multi-Kick** » \`-mkick <@user1> <@user2>\` / \`/mkick\` • *Kick multiple members at once.*',
	timeout: '**Mute/Timeout User** » \`-timeout <@user> <duration> [reason]\` / \`/timeout\` • *Time-out a member.*',
	removetimeout: '**Remove Timeout** » \`-removetimeout <@user>\` / \`/removetimeout\` • *Lift time-out from a user.*',
	warn: '**Warn Member** » \`-warn <@user> [reason]\` / \`/warn\` • *Issue warning infraction to a member.*',
	warnings: '**Infraction History** » \`-warnings <@user>\` / \`/warnings\` • *View warning infraction history.*',
	clearwarn: '**Void Warning** » \`-clearwarn <@user> <warningId>\` • *Void a specific warning ID.*',
	clearwarnings: '**Clear All Warnings** » \`-clearwarnings <@user>\` • *Clear all warnings for a user.*',
	purge: '**Message Purging** » \`-purge <amount>\` / \`/purge\` • *Bulk delete messages.*',
	defaultpurge: '**Default Purge Limit** » \`-defaultpurge <amount>\` • *Purge messages matching server presets.*',
	lock: '**Channel Locking** » \`-lock [#channel] [@role] [reason]\` / \`/lock\` • *Lock down text channels.*',
	unlock: '**Channel Unlocking** » \`-unlock [#channel] [@role] [reason]\` / \`/unlock\` • *Unlock a channel.*',
	lockdown: '**Server Lockdown** » \`-lockdown\` • *Restrict or lockdown all server channels during emergencies.*',
	temprole: '**Temporary Roles** » \`-temprole <@user> <@role> <duration>\` • *Assign temporary roles.*',
	role: '**Role Management** » \`-role add/remove <@user> <@role>\` • *Grant or revoke roles.*',
	colorrole: '**Color Role Customization** » \`-colorrole <#hex>\` • *Set custom color role for a user.*',
	ticket: '**Support Tickets** » \`-ticket setup\` or \`-ticket close\` • *Configure server support tickets.*',
	steal: '**Emoji & Sticker Stealer** » \`-steal <emoji/sticker/reply>\` / \`/steal\` • *Upload custom emojis/stickers.*',

	// Giveaway
	giveaway: '**Giveaway Creator** » \`-giveaway start <duration> <winners> <prize>\` • *Launch a custom giveaway.*',
	giveawayend: '**End Giveaway** » \`-giveawayend <messageId>\` / \`/giveaway end\` • *Terminate giveaway and pick winners early.*',

	// Economy
	bauble: '**Bauble Balance** » \`-bauble [@user]\` • *View Glimmering Bauble balance.*',
	inventory: '**Backpack Inventory** » \`-inventory [@user]\` • *View backpack inventory items.*',
	passive: '**Passive Toggle** » \`-passive toggle\` • *Turn passive mode on/off to block thefts.*',
	collections: '**Item Collections** » \`-collections\` • *Inspect completed collectible trophies.*',
	economy: '**Economy Metrics** » \`-economy\` • *Access server market details and economy status.*',
	gamestats: '**Player Gameplay Stats** » \`-gamestats [@user]\` • *View detailed minigame wins and streaks.*',
	winloss: '**Game Win/Loss Record** » \`-winloss [@user]\` • *Check casino win/loss statistics.*',
	streak: '**Active Streaks** » \`-streak [@user]\` • *Check active minigame streaks.*',
	work: '**Interactive Work** » \`-work\` • *Perform daily jobs to earn baubles.*',
	scavenge: '**Scavenge Areas** » \`-scavenge\` • *Rummage around for items or cash.*',
	rob: '**Rob User** » \`-rob <@user>\` • *Attempt to steal baubles from another user.*',
	daily: '**Daily Allowance** » \`-daily\` • *Claim daily bauble rewards.*',
	weekly: '**Weekly Allowance** » \`-weekly\` • *Claim weekly bauble rewards.*',
	hourly: '**Hourly Allowance** » \`-hourly\` • *Claim hourly bauble rewards.*',
	monthly: '**Monthly Allowance** » \`-monthly\` • *Claim monthly bauble rewards.*',
	checklist: '**Daily Checklist** » \`-checklist\` • *Track completed daily tasks and bonuses.*',
	grab: '**Grab Baubles** » \`-grab\` • *Grab active bauble rain drops.*',
	crime: '**Commit Crime** » \`-crime\` • *Undertake high-risk crimes for baubles.*',
	dig: '**Dig For Loot** » \`-dig\` • *Dig up ground items with a shovel.*',
	dumpster: '**Dumpster Diving** » \`-dumpster\` • *Dive into dumpsters for hidden loot.*',
	expedition: '**Send Expedition** » \`-expedition start <id>\` • *Dispatch ducks on expeditions for treasure.*',
	fish: '**Go Fishing** » \`-fish\` • *Cast a line to catch valuable marine life.*',
	memehunt: '**Meme Hunting** » \`-memehunt\` • *Hunt down viral memes for rewards.*',
	baublerain: '**Bauble Rain** » \`-baublerain <amount>\` • *Drop a rain of baubles for the chat to grab.*',
	shop: '**Item Shop** » \`-shop\` • *Open the server item catalog.*',
	sell: '**Sell Items** » \`-sell <item> [qty]\` • *Sell items from your inventory back to the shop.*',
	use: '**Activate Item** » \`-use <item>\` • *Consume or trigger an item in your inventory.*',
	give: '**Transfer Baubles** » \`-give <@user> <amount>\` • *Transfer baubles directly to another user.*',
	gift: '**Wrap Gift** » \`-gift <@user> <item>\` • *Present an inventory item as a gift to a user.*',
	opengift: '**Open Gift Boxes** » \`-opengift\` • *Open a gift box received from another user.*',
	items: '**Item Catalog** » \`-items\` • *List catalog statistics.*',
	leaderboard: '**Guild Leaderboard** » \`-leaderboard\` • *View interactive guild economy leaderboards.*',
	globalleaderboard: '**Global Standings** » \`-globalleaderboard\` • *View global cross-server leaderboards.*',

	// Casino
	gamble: '**Gamble Multiplier** » \`-gamble <amount>\` / \`/gamble\` • *Bet baubles on a multiplier roll.*',
	coinflip: '**Coinflip Bet** » \`-coinflip <heads/tails> <amount>\` / \`/coinflip\` • *Double or nothing coin flip.*',
	slots: '**Slots Jackpot** » \`-slots <amount>\` / \`/slots\` • *Roll the slot machine for jackpots.*',
	blackjack: '**Blackjack** » \`-blackjack <amount>\` / \`/blackjack\` • *Play blackjack against the dealer.*',
	mblackjack: '**Multiplayer Blackjack** » \`-mblackjack <amount>\` • *Play multiplayer blackjack with friends.*',
	duckrace: '**Duck Race Bet** » \`-duckrace <amount>\` / \`/duckrace\` • *Enter a duck in a multi-player race.*',
	mines: '**Minesweeper Bet** » \`-mines <amount> [mines]\` / \`/mines\` • *Bet baubles on a mine field grid.*',
	buckshot: '**Buckshot Showdown** » \`-buckshot <amount>\` / \`/buckshot\` • *Play a deadly game of Russian Roulette.*',

	// Marriage
	marry: '**Marry Partner** » \`-marry <@user>\` • *Propose marriage to another member.*',
	divorce: '**Divorce Spouse** » \`-divorce\` • *End your active marriage.*',
	proposals: '**Pending Proposals** » \`-proposals\` • *Check pending marriage proposals.*',
	adopt: '**Adopt Member** » \`-adopt <@user>\` • *Adopt a member into your family.*',
	disown: '**Disown Child** » \`-disown <@user>\` • *Disown a child from your family tree.*',
	family: '**Family Members** » \`-family [@user]\` • *View your family relationships.*',
	familytree: '**Family Tree Graphic** » \`-familytree [@user]\` • *View the pedigree family tree map.*',

	// Minigames
	wordbomb: '**Word Bomb Arena** » \`-wordbomb\` / \`/wordbomb\` • *Start a spelling wordbomb game.*',
	scramble: '**Word Scramble** » \`-scramble\` / \`/scramble\` • *Unscramble letters to find the correct word.*',
	hangman: '**Hangman Game** » \`-hangman\` / \`/hangman\` • *Start a classic word guessing game of Hangman.*',
	battle: '**Arena Brawl Duel** » \`-battle <@user>\` • *Challenge a user to a combat battle.*',
	animebattle: '**Anime Battle Duel** » \`-animebattle <@user>\` • *Fight a user using anime cards and spells.*',
	deathbattle: '**Death Match Simulation** » \`-deathbattle <@user>\` • *Fight to the death in a text simulator.*',
	gridduel: '**Grid Battleship Duel** » \`-gridduel <@user>\` • *Challenge a user to a grid-based battle.*',
	emojidecode: '**Emoji Decoding** » \`-emojidecode\` • *Translate complex emoji sequences.*',
	guesstheflag: '**Guess the Flag** » \`-guesstheflag\` • *Guess the country flag shown in chat.*',
	geoguesser: '**Geoguesser Maps** » \`-geoguesser\` • *Identify the location from coordinates or map images.*',
	truthordare: '**Truth or Dare** » \`-truthordare\` • *Play a game of Truth or Dare.*',

	// Profile
	profile: '**Profile Card** » \`-profile [@user]\` / \`/profile view\` • *Display your profile banner card.*',
	'profile-edit': '**Customize Profile** » \`-profile-edit\` / \`/profile edit\` • *Edit profile configuration.*',
	'profile-reset': '**Reset Profile** » \`-profile-reset\` / \`/profile reset\` • *Revert profile customization back to default.*',
	title: '**Equip Title** » \`-title set <title>\` / \`-title list\` • *Configure showing titles on your profile card.*',
	achievements: '**Player Badges** » \`-achievements [@user]\` • *View your earned badges and awards.*',
	'achievements-list': '**Achievements Directory** » \`-achievements-list\` • *View all achievements catalog list.*',

	// Fun
	meme: '**Internet Meme** » \`-meme\` • *Display a random high-quality internet meme.*',
	wanted: '**Wanted Poster** » \`-wanted [@user]\` • *Create a wanted poster image of a member.*',
	hack: '**Mock Hacking** » \`-hack <@user>\` • *Execute a simulated funny hacking operation.*',
	iq: '**IQ Assessment** » \`-iq [@user]\` • *Run an IQ test on a user.*',
	vibecheck: '**Vibe Meter** » \`-vibecheck [@user]\` • *Measure the general vibe percentage of a user.*',
	ship: '**Compatibility Check** » \`-ship <@user1> <@user2>\` • *Calculate romantic compatibility between users.*',
	pp: '**Size Gauge** » \`-pp [@user]\` • *Measure a user\'s size.*',
	gayrate: '**Gay Meter** » \`-gayrate [@user]\` • *Run a rating scan on a user.*',
	'8ball': '**Magic 8-Ball** » \`-8ball <question>\` • *Ask the Magic 8-Ball a question.*',
	furry: '**Furry Calculator** » \`-furry [@user]\` • *Measure a user\'s percentage of furry.*',
	quote: '**Create Graphic Quote** » \`-quote\` • *Fetch a random quote.*',
	gta6: '**GTA 6 Countdown** » \`-gta6\` • *Check the release timer countdown for GTA 6.*',

	// AI
	ai: '**DeepSeek Conversation** » \`-ai <question>\` / \`/ai\` • *Talk to the DeepSeek conversational AI.*',
	apu: '**APU Balance** » \`-apu [@user]\` / \`/apu\` • *Check APU status, limits, and recharge status.*',
	excuse: '**Excuse Generator** » \`-excuse\` • *Generate a random, funny excuse.*',

	// Music
	play: '**Play Music** » \`-play <search/URL>\` • *Join voice channel and stream music tracks.*',
	stop: '**Stop Music** » \`-stop\` • *Stop audio playback and leave voice channel.*',
	pause: '**Pause Playback** » \`-pause\` • *Pause currently playing audio.*',
	resume: '**Resume Playback** » \`-resume\` • *Resume paused audio tracks.*',
	queue: '**Show Queue** » \`-queue\` • *View current audio queue tracklist.*',
	skip: '**Skip Song** » \`-skip\` • *Vote to skip the current track.*',
	remove: '**Remove Track** » \`-remove <index>\` • *Remove a track from the audio queue.*',
	clearmusic: '**Clear Music Queue** » \`-clearmusic\` • *Clear the entire audio queue.*',
	songinfo: '**Song Metadata** » \`-songinfo\` • *View full details of the currently playing track.*',
	lyrics: '**Song Lyrics** » \`-lyrics [song]\` • *Search and retrieve song lyrics.*',

	// Utility
	help: '**Help Guide** » \`-help\` • *Open this interactive help commands catalog.*',
	ping: '**Latencies** » \`-ping\` • *Measure the bot\'s WebSocket latency.*',
	announce: '**Server Announcement** » \`-announce\` • *Announce messages across channels.*',
	remind: '**Set Reminder** » \`-remind <duration> <message>\` • *Schedule a notification reminder.*',
	afk: '**Away From Keyboard** » \`-afk [status]\` • *Set your AFK status to auto-reply to pings.*',
	server: '**Server Metrics** » \`-server\` • *Display current server metrics and information.*',
	servericon: '**Server Logo** » \`-servericon\` • *Fetch server\'s logo image icon.*',
	user: '**Database Account** » \`-user [@member]\` • *Retrieve database profile and roles for a member.*',
	avatar: '**Avatar Image** » \`-avatar [@member]\` • *Fetch user\'s profile avatar image URL.*',
	rep: '**Reputation Score** » \`-rep <@member>\` • *Upvote and grant reputation points to a user.*',
	rank: '**Chat XP Rank** » \`-rank [@member]\` • *View current XP levels and rank progress.*',
	snipe: '**Retrieve Deleted Message** » \`-snipe\` • *Retrieve the last deleted message in the channel.*',
	support: '**Developer Support** » \`-support\` • *Fetch support server and developer contact details.*',
	invite: '**Invite Link** » \`-invite\` • *Fetch the bot\'s direct authorization invitation link.*',

	// Actions
	action: '**Social Action** » \`-action <type> [@member]\` / \`/action\` • *Perform anime actions (hug, kiss, slap).*',
	angry: '**Angry Expression** » \`-angry <@user>\` • *Express anger at someone.*',
	baka: '**Baka Callout** » \`-baka <@user>\` • *Call someone a baka.*',
	bite: '**Bite Interaction** » \`-bite <@user>\` • *Bite someone.*',
	blush: '**Blush Expression** » \`-blush\` • *Blushes in embarrassment.*',
	bored: '**Bored Expression** » \`-bored\` • *Express boredom.*',
	cheer: '**Cheer On** » \`-cheer <@user>\` • *Cheer someone on.*',
	cry: '**Cry Expression** » \`-cry\` • *Start crying.*',
	cuddle: '**Cuddle Interaction** » \`-cuddle <@user>\` • *Cuddle someone.*',
	dance: '**Dance Expression** » \`-dance\` • *Starts dancing.*',
	facepalm: '**Facepalm Expression** » \`-facepalm\` • *Facepalm.*',
	feed: '**Feed Interaction** » \`-feed <@user>\` • *Feed someone.*',
	handhold: '**Hold Hands** » \`-handhold <@user>\` • *Hold hands with someone.*',
	handshake: '**Handshake Interaction** » \`-handshake <@user>\` • *Shake hands with someone.*',
	happy: '**Happy Expression** » \`-happy\` • *Express happiness.*',
	highfive: '**High-Five Interaction** » \`-highfive <@user>\` • *Give someone a high five.*',
	hug: '**Hug Interaction** » \`-hug <@user>\` • *Hug someone.*',
	husbando: '**Husbando Check** » \`-husbando [@user]\` • *Declare someone your husbando.*',
	kick: '**Kick Interaction** » \`-kick <@user>\` • *Kick someone (action).*',
	kiss: '**Kiss Interaction** » \`-kiss <@user>\` • *Kiss someone.*',
	kitsune: '**Kitsune Imagery** » \`-kitsune\` • *Post a kitsune image.*',
	laugh: '**Laugh Expression** » \`-laugh\` • *Start laughing.*',
	lewd: '**Lewd Reaction** » \`-lewd <@user>\` • *Be lewd to someone (NSFW channels only).*',
	lurk: '**Lurk Expression** » \`-lurk\` • *Lurk in chat.*',
	neko: '**Neko Imagery** » \`-neko\` • *Post a neko image.*',
	nod: '**Nod Expression** » \`-nod\` • *Nod your head.*',
	nom: '**Nom nom Expression** » \`-nom\` • *Start eating.*',
	nope: '**Nope Expression** » \`-nope\` • *Say nope.*',
	pat: '**Pat Interaction** » \`-pat <@user>\` • *Pat someone.*',
	peck: '**Peck Kiss** » \`-peck <@user>\` • *Give someone a quick peck.*',
	pout: '**Pout Expression** » \`-pout\` • *Pout.*',
	punch: '**Punch Interaction** » \`-punch <@user>\` • *Punch someone.*',
	run: '**Run Away** » \`-run\` • *Start running.*',
	shocked: '**Shocked Expression** » \`-shocked\` • *Look shocked.*',
	shoot: '**Shoot Interaction** » \`-shoot <@user>\` • *Shoot someone.*',
	shrug: '**Shrug Expression** » \`-shrug\` • *Shrug your shoulders.*',
	slap: '**Slap Interaction** » \`-slap <@user>\` • *Slap someone.*',
	sleep: '**Sleep Expression** » \`-sleep\` • *Go to sleep.*',
	smug: '**Smug Expression** » \`-smug\` • *Look smug.*',
	stare: '**Stare Interaction** » \`-stare <@user>\` • *Stare at someone.*',
	surprised: '**Surprise Expression** » \`-surprised\` • *Look surprised.*',
	think: '**Thinking Expression** » \`-think\` • *Start thinking.*',
	thumbsup: '**Thumbs Up** » \`-thumbsup\` • *Give a thumbs up.*',
	tickle: '**Tickle Interaction** » \`-tickle <@user>\` • *Tickle someone.*',
	touch: '**Touch Interaction** » \`-touch <@user>\` • *Touch someone.*',
	waifu: '**Waifu Imagery** » \`-waifu\` • *Post a waifu image.*',
	wave: '**Wave Hello** » \`-wave <@user>\` • *Wave at someone.*',
	whoop: '**Whoop cheer** » \`-whoop <@user>\` • *Whoop cheerily.*',
	wink: '**Wink Interaction** » \`-wink <@user>\` • *Wink at someone.*',
	yawn: '**Yawn Expression** » \`-yawn\` • *Yawn.*',
	yay: '**Yay Cheer** » \`-yay\` • *Celebrate with yay.*',
	yeet: '**Yeet Interaction** » \`-yeet <@user>\` • *Yeet someone.*',

	// Developer
	devinfo: '**System Statistics** » \`-devinfo\` • *View technical system details.*',
	eval: '**Eval Script** » \`-eval <code>\` • *Evaluate arbitrary javascript code.*',
	reload: '**Reload Command** » \`-reload <command>\` • *Reload command file.*',
	add: '**Add XP/Baubles** » \`-add <baubles/xp> <@user> <amount>\` • *Grant currency or XP.*',
	take: '**Deduct XP/Baubles** » \`-take <baubles/xp> <@user> <amount>\` • *Deduct currency or XP.*',
	reset: '**Reset DB Document** » \`-reset <economy/xp/all> <@user>\` • *Reset user profile data.*',
	awardachievement: '**Award Badge** » \`-awardachievement <@user> <id>\` • *Grant achievement manually.*',
	devban: '**Global Ban** » \`-devban <ban/unban> <@user> [reason]\` • *Globally restrict user access.*',
	devlogs: '**Console Logs** » \`-devlogs [lines]\` • *View recent bot system error logs.*',
	maintenance: '**Maintenance Mode** » \`-maintenance <on/off>\` • *Toggle global developer maintenance.*',
	taxfund: '**View Tax Vault** » \`-taxfund\` • *View government wealth tax vaults status.*',
	togglecmd: '**Toggle Commands** » \`-togglecmd <command>\` • *Enable/disable commands server-wide.*',
	devpremium: '**Check Premium** » \`-devpremium [list/check] [@user]\` • *Inspect or check active premiums.*',
	devprofile: '**Deep Account Check** » \`-devprofile <@user>\` • *Dump all bot statistics for a user.*',
	setpremium: '**Manage Premium** » \`-setpremium <@user> <tier> [duration]\` • *Modify user premium status.*',
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

	// Moderation - AutoMod & Security
	automod: 'mod_security',
	antispam: 'mod_security',
	censor: 'mod_security',
	mediaonly: 'mod_security',
	securitycheck: 'mod_security',

	// Moderation - Punishments & Warns
	ban: 'mod_punish',
	unban: 'mod_punish',
	fakeban: 'mod_punish',
	mkick: 'mod_punish',
	timeout: 'mod_punish',
	removetimeout: 'mod_punish',
	warn: 'mod_punish',
	warnings: 'mod_punish',
	clearwarn: 'mod_punish',
	clearwarnings: 'mod_punish',

	// Moderation - Staff Tools & Tickets
	purge: 'mod_staff',
	defaultpurge: 'mod_staff',
	lock: 'mod_staff',
	unlock: 'mod_staff',
	lockdown: 'mod_staff',
	temprole: 'mod_staff',
	role: 'mod_staff',
	colorrole: 'mod_staff',
	ticket: 'mod_staff',
	steal: 'mod_staff',

	// Giveaway
	giveaway: 'giveaway',
	giveawayend: 'giveaway',

	// Economy - Balances & Stats
	bauble: 'economy_balance',
	inventory: 'economy_balance',
	passive: 'economy_balance',
	collections: 'economy_balance',
	economy: 'economy_balance',
	gamestats: 'economy_balance',
	winloss: 'economy_balance',
	streak: 'economy_balance',

	// Economy - Work & Activities
	work: 'economy_earn',
	scavenge: 'economy_earn',
	rob: 'economy_earn',
	daily: 'economy_earn',
	weekly: 'economy_earn',
	hourly: 'economy_earn',
	monthly: 'economy_earn',
	checklist: 'economy_earn',
	grab: 'economy_earn',
	crime: 'economy_earn',
	dig: 'economy_earn',
	dumpster: 'economy_earn',
	expedition: 'economy_earn',
	fish: 'economy_earn',
	memehunt: 'economy_earn',
	baublerain: 'economy_earn',

	// Economy - Shop & Trading
	shop: 'economy_shop',
	sell: 'economy_shop',
	use: 'economy_shop',
	give: 'economy_shop',
	gift: 'economy_shop',
	opengift: 'economy_shop',
	items: 'economy_shop',

	// Economy - Leaderboards
	leaderboard: 'economy_rank',
	globalleaderboard: 'economy_rank',

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

	// Marriage
	marry: 'marriage',
	divorce: 'marriage',
	proposals: 'marriage',
	adopt: 'marriage',
	disown: 'marriage',
	family: 'marriage',
	familytree: 'marriage',

	// Minigames
	wordbomb: 'minigames',
	scramble: 'minigames',
	hangman: 'minigames',
	battle: 'minigames',
	animebattle: 'minigames',
	deathbattle: 'minigames',
	gridduel: 'minigames',
	emojidecode: 'minigames',
	guesstheflag: 'minigames',
	geoguesser: 'minigames',
	truthordare: 'minigames',

	// Profile
	profile: 'profile',
	'profile-edit': 'profile',
	'profile-reset': 'profile',
	title: 'profile',
	achievements: 'profile',
	'achievements-list': 'profile',

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
	ai: 'ai',
	apu: 'ai',
	excuse: 'ai',

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
	announce: 'utility',
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

	// Actions - Affectionate
	hug: 'actions_affection',
	kiss: 'actions_affection',
	cuddle: 'actions_affection',
	pat: 'actions_affection',
	peck: 'actions_affection',
	tickle: 'actions_affection',
	touch: 'actions_affection',
	handhold: 'actions_affection',

	// Actions - Friendly
	happy: 'actions_friendly',
	yay: 'actions_friendly',
	laugh: 'actions_friendly',
	wave: 'actions_friendly',
	wink: 'actions_friendly',
	thumbsup: 'actions_friendly',
	highfive: 'actions_friendly',
	dance: 'actions_friendly',
	handshake: 'actions_friendly',
	cheer: 'actions_friendly',
	whoop: 'actions_friendly',

	// Actions - Sad & Tired
	cry: 'actions_sad',
	bored: 'actions_sad',
	pout: 'actions_sad',
	sleep: 'actions_sad',
	yawn: 'actions_sad',
	lurk: 'actions_sad',

	// Actions - Aggressive
	angry: 'actions_aggressive',
	slap: 'actions_aggressive',
	bite: 'actions_aggressive',
	punch: 'actions_aggressive',
	kick: 'actions_aggressive',
	shoot: 'actions_aggressive',
	yeet: 'actions_aggressive',
	run: 'actions_aggressive',

	// Actions - Expressive
	action: 'actions_expressive',
	think: 'actions_expressive',
	shrug: 'actions_expressive',
	smug: 'actions_expressive',
	stare: 'actions_expressive',
	blush: 'actions_expressive',
	baka: 'actions_expressive',
	nom: 'actions_expressive',
	nod: 'actions_expressive',
	nope: 'actions_expressive',
	facepalm: 'actions_expressive',
	feed: 'actions_expressive',
	lewd: 'actions_expressive',
	waifu: 'actions_expressive',
	neko: 'actions_expressive',
	kitsune: 'actions_expressive',
	husbando: 'actions_expressive',
	shocked: 'actions_expressive',
	surprised: 'actions_expressive'
};

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
		const categoryOrder = [
			'admin', 
			'mod_security', 'mod_punish', 'mod_staff', 
			'giveaway', 
			'economy_balance', 'economy_earn', 'economy_shop', 'economy_rank', 
			'casino', 'marriage', 'minigames', 'fun', 'profile', 'music', 
			'actions_affection', 'actions_friendly', 'actions_sad', 'actions_aggressive', 'actions_expressive', 
			'ai', 'utility', 'developer'
		];
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

				for (const name in categoryCmds) {
					const detail = COMMAND_DETAILS[name] || `\`-${name}\` • Description not available.`;
					formattedSections.push(detail);
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
