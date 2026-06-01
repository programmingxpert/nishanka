# Discord Slash Command Option Descriptions Over 25 Characters

**Overview:** Found **53 instances** of `.setDescription()` calls on slash command options that exceed Discord's 25-character limit. This will cause truncation in the Discord client.

---

## Summary by File

| File | Count | Most Critical |
|------|-------|---|
| mines.js | 3 | 77 chars |
| gift.js | 2 | 71 chars |
| battle.js | 3 | 46 chars |
| buckshot.js | 3 | 36 chars |
| shop.js | 3 | 56 chars |
| gamble.js | 3 | 57 chars |
| give.js | 3 | 40 chars |
| coinflip.js | 3 | 60 chars |
| slots.js | 2 | 33 chars |
| streak.js | 2 | 50 chars |
| sell.js | 2 | 48 chars |
| checklist.js | 2 | 50 chars |
| bauble.js | 2 | 41 chars |
| rob.js | 2 | 57 chars |
| passive.js | 1 | 88 chars ⚠️ |
| economy.js | 1 | 67 chars |
| expedition.js | 1 | 66 chars |
| crime.js | 1 | 67 chars |
| memehunt.js | 1 | 64 chars |
| leaderboard.js | 1 | 64 chars |
| dumpster.js | 1 | 60 chars |
| collections.js | 1 | 59 chars |
| work.js | 1 | 57 chars |
| fish.js | 1 | 55 chars |
| items.js | 1 | 53 chars |
| grab.js | 1 | 53 chars |
| scavenge.js | 1 | 53 chars |
| daily.js | 1 | 46 chars |
| globalleaderboard.js | 1 | 46 chars |
| inventory.js | 1 | 42 chars |

---

## Detailed Violations (Sorted by Character Count)

### passive.js
- **Line:** 9
- **Char Count:** 88 ⚠️ **CRITICAL - WORST VIOLATION**
- **Current:** "Toggle Passive Mode. Protects you from robbery/brawls, but prevents you from doing them."
- **Shortened (25):** "Toggle Passive Mode on/off"

### mines.js
- **Line:** 138
- **Char Count:** 77
- **Current:** "Stake baubles in a minesweeper grid! Find diamonds to multiply your winnings."
- **Shortened (25):** "Minesweeper game mode"

- **Line:** 147
- **Char Count:** 44
- **Current:** "Number of hidden mines (1-15, default is 3)."
- **Shortened (25):** "Mine count (1-15)"

- **Line:** 141
- **Char Count:** 31
- **Current:** "The amount of Baubles to stake."
- **Shortened (25):** "Bet amount"

### gift.js
- **Line:** 34
- **Char Count:** 71
- **Current:** "Gift items from your inventory to another member with a custom message."
- **Shortened (25):** "Gift items w/ message"

- **Line:** 50
- **Char Count:** 37
- **Current:** "An optional message for the recipient"
- **Shortened (25):** "Gift message (optional)"

### crime.js
- **Line:** 141
- **Char Count:** 67
- **Current:** "Commit a high-risk crime to steal Glimmering Baubles or rare items!"
- **Shortened (25):** "Commit a crime"

### economy.js
- **Line:** 104
- **Char Count:** 67
- **Current:** "View the live status of the global bot economy and inflation rates."
- **Shortened (25):** "View economy status"

### expedition.js
- **Line:** 21
- **Char Count:** 66
- **Current:** "Send your character on a 1-hour expedition for high-value rewards!"
- **Shortened (25):** "1-hour expedition"

### memehunt.js
- **Line:** 93
- **Char Count:** 64
- **Current:** "Hunt for dank internet memes to earn coins or rare collectibles!"
- **Shortened (25):** "Hunt memes for rewards"

### leaderboard.js
- **Line:** 9
- **Char Count:** 64
- **Current:** "View the Glimmering Bauble leaderboard for users in this server."
- **Shortened (25):** "View server leaderboard"

### dumpster.js
- **Line:** 100
- **Char Count:** 60
- **Current:** "Go dumpster diving for random trash, baubles, or rare items!"
- **Shortened (25):** "Dumpster dive"

### coinflip.js
- **Line:** 10
- **Char Count:** 59
- **Current:** "Flip a coin to gamble your baubles (heads, tails, or draw)."
- **Shortened (25):** "Flip a coin to gamble"

- **Line:** 19
- **Char Count:** 51
- **Current:** "Choose heads, tails, or a sideways draw (optional)."
- **Shortened (25):** "Flip outcome choice"

- **Line:** 13
- **Char Count:** 32
- **Current:** "The amount of Baubles to gamble."
- **Shortened (25):** "Bet amount"

### collections.js
- **Line:** 11
- **Char Count:** 59
- **Current:** "View your items collection progress and completion rewards."
- **Shortened (25):** "View collections"

### work.js
- **Line:** 20
- **Char Count:** 57
- **Current:** "Work a random interactive job to earn Glimmering Baubles!"
- **Shortened (25):** "Do a work job"

### gamble.js
- **Line:** 34
- **Char Count:** 57
- **Current:** "Gamble your Baubles with different risk and reward tiers!"
- **Shortened (25):** "Gamble baubles"

- **Line:** 43
- **Char Count:** 32
- **Current:** "Risk level: low, medium, or high"
- **Shortened (25):** "Difficulty level"

- **Line:** 37
- **Char Count:** 27
- **Current:** "Amount of Baubles to gamble"
- **Shortened (25):** "Bet amount"

### rob.js
- **Line:** 50
- **Char Count:** 57
- **Current:** "Attempt to rob another player using different strategies."
- **Shortened (25):** "Rob another player"

- **Line:** 53
- **Char Count:** 27
- **Current:** "The player you want to rob."
- **Shortened (25):** "Target player"

### dig.js
- **Line:** 93
- **Char Count:** 56
- **Current:** "Dig up buried treasure, prehistoric fossils, or baubles!"
- **Shortened (25):** "Dig for treasure"

### shop.js
- **Line:** 304
- **Char Count:** 56
- **Current:** "Browse and purchase items using your Glimmering Baubles."
- **Shortened (25):** "Buy items"

- **Line:** 307
- **Char Count:** 34
- **Current:** "The ID of the item you want to buy"
- **Shortened (25):** "Item ID to buy"

- **Line:** 311
- **Char Count:** 30
- **Current:** "How many items you want to buy"
- **Shortened (25):** "Quantity to buy"

### fish.js
- **Line:** 96
- **Char Count:** 55
- **Current:** "Cast your fishing line and catch rare items or baubles!"
- **Shortened (25):** "Fish for rewards"

### items.js
- **Line:** 33
- **Char Count:** 53
- **Current:** "View the catalog of available items and what they do."
- **Shortened (25):** "View item catalog"

### grab.js
- **Line:** 16
- **Char Count:** 53
- **Current:** "React with the Glimmering emoji to grab some Baubles!"
- **Shortened (25):** "React to grab baubles"

### scavenge.js
- **Line:** 19
- **Char Count:** 53
- **Current:** "Scavenge for Glimmering Baubles in various locations."
- **Shortened (25):** "Scavenge baubles"

### checklist.js
- **Line:** 122
- **Char Count:** 50
- **Current:** "View your daily tasks checklist and claim rewards!"
- **Shortened (25):** "Daily tasks"

- **Line:** 125
- **Char Count:** 30
- **Current:** "Perform an action (e.g. claim)"
- **Shortened (25):** "Action to perform"

### streak.js
- **Line:** 10
- **Char Count:** 50
- **Current:** "Show streak and win streak information for a user."
- **Shortened (25):** "View user streaks"

- **Line:** 13
- **Char Count:** 31
- **Current:** "The user whose streaks to view."
- **Shortened (25):** "User"

### sell.js
- **Line:** 24
- **Char Count:** 48
- **Current:** "Sell items from your inventory back to the shop."
- **Shortened (25):** "Sell items"

- **Line:** 27
- **Char Count:** 26
- **Current:** "The ID of the item to sell"
- **Shortened (25):** "Item ID"

### battle.js
- **Line:** 74
- **Char Count:** 46
- **Current:** "Challenge someone to a Turn-Based Arena Brawl!"
- **Shortened (25):** "Challenge someone"

- **Line:** 82
- **Char Count:** 36
- **Current:** "How many Baubles to put on the line."
- **Shortened (25):** "Wager amount"

- **Line:** 77
- **Char Count:** 27
- **Current:** "The user you want to fight."
- **Shortened (25):** "Opponent"

### daily.js
- **Line:** 62
- **Char Count:** 46
- **Current:** "Claim your daily reward of Glimmering Baubles!"
- **Shortened (25):** "Claim daily reward"

### globalleaderboard.js
- **Line:** 9
- **Char Count:** 46
- **Current:** "View the global Glimmering Bauble leaderboard."
- **Shortened (25):** "Global leaderboard"

### inventory.js
- **Line:** 11
- **Char Count:** 42
- **Current:** "View your items and active status effects."
- **Shortened (25):** "View inventory"

### bauble.js
- **Line:** 9
- **Char Count:** 41
- **Current:** "Check a user's Glimmering Bauble balance."
- **Shortened (25):** "Check user balance"

- **Line:** 12
- **Char Count:** 32
- **Current:** "The user whose balance to check."
- **Shortened (25):** "User"

### give.js
- **Line:** 9
- **Char Count:** 40
- **Current:** "Give Glimmering Baubles to another user."
- **Shortened (25):** "Give baubles"

- **Line:** 12
- **Char Count:** 28
- **Current:** "The user to give Baubles to."
- **Shortened (25):** "Recipient"

- **Line:** 16
- **Char Count:** 30
- **Current:** "The amount of Baubles to give."
- **Shortened (25):** "Amount"

### buckshot.js
- **Line:** 75
- **Char Count:** 36
- **Current:** "Play Buckshot Showdown with someone!"
- **Shortened (25):** "Play buckshot"

- **Line:** 78
- **Char Count:** 31
- **Current:** "The user you want to challenge."
- **Shortened (25):** "Opponent"

- **Line:** 83
- **Char Count:** 36
- **Current:** "How many Baubles to put on the line."
- **Shortened (25):** "Wager amount"

### slots.js
- **Line:** 13
- **Char Count:** 33
- **Current:** "Spin the Glimmering Bauble slots!"
- **Shortened (25):** "Spin the slots"

- **Line:** 16
- **Char Count:** 29
- **Current:** "The amount of Baubles to bet."
- **Shortened (25):** "Bet amount"

---

## Recommendations

1. **Priority 1 (>60 characters):** Fix passive.js, mines.js (138), gift.js (34), crime.js, economy.js, expedition.js, memehunt.js, leaderboard.js immediately
2. **Priority 2 (40-60 characters):** Fix remaining command descriptions
3. **Priority 3 (26-40 characters):** Fix option descriptions in secondary parameters

Most shortened versions use:
- Simple, direct language
- Common abbreviations (w/ = with, ID = item ID)
- Removed redundant words
- Kept core meaning intact
