# Nishanka Emoji Customization Plan

Generated on 2026-06-04.

## Why Start Here

The repo currently has about 3,300 emoji occurrences across 237 scanned source files, with 377 unique emoji-like symbols. The biggest clusters are:

- `commands/economy`: 1,247 occurrences
- `commands/minigames`: 554 occurrences
- `commands/fun`: 348 occurrences
- `commands/moderation`: 274 occurrences
- `commands/utility`: 207 occurrences
- `commands/admin`: 157 occurrences
- `commands/actions`: 122 occurrences
- `utils`: 111 occurrences

Start with the assets that appear most often and define the bot identity. Do not start by replacing every error/status emoji by hand. The efficient route is to make a custom emoji registry, generate/upload the pack, then swap command groups in phases.

Discord now supports application-owned emojis. These can be managed by API or the Developer Portal, and an app can own up to 2000 emojis that only that app can use. Discord's current emoji resource docs also say app emojis do not require `USE_EXTERNAL_EMOJIS`, and app emoji uploads use a 128x128 image with a 256 KiB max file size. Source: https://docs.discord.com/developers/resources/emoji

## Naming Style

Use Discord-safe lowercase names with the `nk_` prefix.

Examples:

- `nk_bauble`
- `nk_success`
- `nk_warning`
- `nk_daily`
- `nk_item_coffee`
- `nk_ach_mines_9`
- `nk_game_wordbomb`

## Visual Style

Use one consistent Nishanka pack style based on `nishanka.png` and `nishanka_nobg.png`:

- Cute chibi/anime sticker icon
- Thick midnight navy outline
- High contrast at 32x32
- Transparent background
- Powder-blue primary forms
- Hot pink glow/highlights
- Violet purple accents
- Soft white glossy shine
- Star motifs where useful
- Rarity tinting only where useful
- No text inside emoji images
- No tiny detail that disappears at Discord size

## Phase 1: Core Bot Language

These are used everywhere and make the bot feel custom immediately.

| Key | Current | Suggested asset |
| --- | --- | --- |
| `nk_bauble` | `🪙` | Glimmering Bauble currency |
| `nk_success` | `✅` | Success check seal |
| `nk_error` | `❌` | Error cross seal |
| `nk_warning` | `⚠️` | Warning triangle |
| `nk_cooldown` | `⏳` | Hourglass/cooldown |
| `nk_timer` | `⏰` | Timer clock |
| `nk_sparkle` | `✨` | Nishanka sparkle |
| `nk_premium` | `💎` | Premium gem |
| `nk_gift` | `🎁` | Gift box |
| `nk_user` | `👤` | User silhouette |
| `nk_settings` | `⚙️` | Settings cog |
| `nk_shield` | `🛡️` | Protection shield |
| `nk_lock` | `🔒` | Locked state |
| `nk_unlock` | `🔓` | Unlocked state |
| `nk_enabled` | `🟢` | Enabled status |
| `nk_disabled` | `🔴` | Disabled status |
| `nk_trash` | `🗑️` | Delete/trash |
| `nk_edit` | `✏️` | Edited message |
| `nk_level_up` | `🆙` | Level up |
| `nk_bot` | `🤖` | Bot/AI |

## Phase 2: Economy Commands

This phase gives the bot its premium identity because economy commands are the heaviest emoji users.

| Key | Current | Suggested asset |
| --- | --- | --- |
| `nk_balance` | `💰` | Coin pouch |
| `nk_wallet` | `👛` | Wallet |
| `nk_bank` | `🏦` | Bank/tax fund |
| `nk_streak` | `🔥` | Daily streak flame |
| `nk_daily` | `✦` | Daily claim star |
| `nk_hourly` | `⏱️` | Hourly claim stopwatch |
| `nk_weekly` | `📅` | Weekly/monthly calendar |
| `nk_work` | `💼` | Work briefcase |
| `nk_shop` | `🛍️` | Shop bag |
| `nk_inventory` | `🎒` | Inventory bag |
| `nk_rob` | `🥷` | Robbery mask |
| `nk_coinflip` | `🪙` | Coinflip coin |
| `nk_slots` | `🎰` | Slots machine |
| `nk_mines_bomb` | `💣` | Mines bomb |
| `nk_mines_gem` | `💎` | Mines safe gem |
| `nk_fish` | `🎣` | Fishing rod |
| `nk_dig` | `⛏️` | Digging pickaxe |
| `nk_dumpster` | `🗑️` | Dumpster/scavenge |
| `nk_expedition` | `🧭` | Expedition compass |

## Phase 3: Items

There are 42 item assets in `utils/items.js`. These should be generated as individual Discord emoji files because they appear in shops, inventory, item drops, item usage, and collections.

### Boosters

- `nk_item_coffee`: `☕` Depresso Espresso
- `nk_item_clover`: `🍀` Mutant Four-Leaf Clover
- `nk_item_shield`: `🛡️` Cardboard Aegis Shield
- `nk_item_mystery_box`: `📦` Disappointment Box
- `nk_item_padlock`: `🔒` Toddler-Proof Safe Padlock

### Cosmetics

- `nk_item_tag`: `🏷️` Dumb Custom Tag
- `nk_item_paintbrush`: `🎨` Blinding Paintbrush
- `nk_item_nugget`: `💎` Shiny Golden Nugget
- `nk_item_crown`: `👑` Paper Burger Crown

### Family

- `nk_item_ring_silver`: `💍` Ring of Average Commitment
- `nk_item_ring_gold`: `💍` Ring of Serious Commitment
- `nk_item_ring_diamond`: `💎` Ring of Financial Irresponsibility
- `nk_item_adoption_papers`: `📄` Legal Kidnapping Papers

### Dumpster

- `nk_item_broken_keyboard`: `⌨️` Rage-Smashed Keyboard
- `nk_item_rotten_banana`: `🍌` Stinky Rotten Banana
- `nk_item_rabbits_feet`: `🐰` Lucky Rabbit Foot

### Fishing

- `nk_item_fish`: `🐟` Wiggling Wet Fish
- `nk_item_golden_fish`: `🐠` Radioactive Golden Fish
- `nk_item_treasure_chest`: `🏴‍☠️` Barnacle-Covered Chest
- `nk_item_ancient_artifact`: `🏺` Cursed Urn

### Digging

- `nk_item_fossil_shell`: `🐚` Prehistoric Shell
- `nk_item_ancient_bone`: `🦴` Mammoth Femur
- `nk_item_t_rex_skull`: `🦖` Screaming T-Rex Skull

### Meme Hunt

- `nk_item_common_meme`: `🐸` Stale Pepe Meme
- `nk_item_dead_meme`: `💀` 2011 Rage Comic
- `nk_item_ancient_meme`: `📜` Dancing Baby GIF
- `nk_item_legendary_meme`: `👑` The Ultimate Rickroll

### Duck Collection

- `nk_item_rubber_duck`: `🦆` Debugging Rubber Duck
- `nk_item_golden_duck`: `🟡` Golden Duck
- `nk_item_pirate_duck`: `🏴‍☠️` Pirate Duck
- `nk_item_space_duck`: `🚀` Space Duck
- `nk_item_divine_duck`: `✨` Divine Duck

### Computer Collection

- `nk_item_broken_laptop`: `💻` E-Waste Laptop
- `nk_item_gaming_pc`: `🖥️` Mining Rig
- `nk_item_quantum_computer`: `🔮` Quantum Computer
- `nk_item_alien_computer`: `👽` Extraterrestrial Terminal

### Mythic

- `nk_item_dragon_egg`: `🥚` Dragon Egg
- `nk_item_void_star`: `⭐` Void Star

### Unique

- `nk_item_the_one_ring`: `💍` The One Ring
- `nk_item_excalibur`: `⚔️` Excalibur
- `nk_item_holy_grail`: `🏆` Holy Grail
- `nk_item_mona_lisa`: `🖼️` Original Mona Lisa

## Phase 4: Achievements

There are 13 achievement icons in `utils/achievements.js`.

- `nk_ach_mines_9`: Minesweeper Novice
- `nk_ach_mines_10`: Minesweeper Apprentice
- `nk_ach_mines_11`: Minesweeper Adept
- `nk_ach_mines_12`: Minesweeper Expert
- `nk_ach_mines_13`: Minesweeper Master
- `nk_ach_mines_14`: Minesweeper Grandmaster
- `nk_ach_mines_15`: Minesweeper God
- `nk_ach_streak_7`: Dedicated Week
- `nk_ach_streak_30`: Monthly Regular
- `nk_ach_streak_100`: Unstoppable Dedication
- `nk_ach_slots_win_50`: Slots Enthusiast
- `nk_ach_gamble_win_100`: High Roller
- `nk_ach_premium_supporter`: Premium Supporter

## Phase 5: Mini-Game Sprites

These are more game-like and can be done after the core economy is custom.

- Mines: bomb, gem, cashout, cancelled
- Word Bomb: lobby bomb, lives bomb, explosion, accepted word, eliminated
- Hangman: lobby, lives, wrong guess, solved word, game over
- Scramble: race flag, standings, final results
- Deathbattle/Battle: attack, shield, stun/confusion, magic, loot crate
- Buckshot: live shell, blank shell, magnifier, drink, cigar, saw, handcuffs, inverter
- Emojidecode and flag games: keep native Unicode where the game mechanic depends on the actual emoji/flag, or add a separate decorative Nishanka icon without replacing the puzzle symbols

## Phase 6: Actions And Fun

Action commands are simple because most already pass an `emoji` value into `sendAnimeAction`. Replace those last with a small expression/action pack:

- hug, kiss, pat, slap, punch, dance, cry, laugh, blush, angry, wave, wink, sleep, think, stare, run, cheer, highfive

## Functional Emoji To Handle Carefully

Some emojis are part of interaction logic and not just decoration:

- Giveaway entry reaction: `🎉`
- Reaction pagination: `⬅️`, `➡️`
- Hangman replay reaction: `🔁`
- Grab game target reaction
- Button emojis in mines, wordbomb, hangman, truth-or-dare, rob, work, expedition, fish, dig, dumpster, memehunt

For these, replace only after testing. Custom emoji reactions require the uploaded emoji ID, and existing logic that checks `reaction.emoji.name` may need to check `reaction.emoji.id`.

## Current Generated Pilot Assets

All current PNGs are 128x128 transparent files under `assets/emojis/png/` and are small enough for Discord upload.

- `currency-bauble.png`: Nishanka Glimmering Bauble
- `currency-premium-gem.png`: Premium gem
- `ui-success.png`: Success check
- `ui-error.png`: Error cross
- `ui-warning.png`: Warning badge
- `item-coffee.png`: Depresso Espresso
- `item-rubber-duck.png`: Rubber Duck
- `game-mines-bomb.png`: Mines bomb

## Implementation Order

1. Generate and approve the Phase 1 core pack.
2. Upload as Discord application emojis with `npm run emoji:upload`.
3. Keep generated IDs in `assets/emojis/discord-emojis.local.json`.
4. Use the central emoji helper with keys like `emoji('currency.bauble')`.
5. Replace centralized data first: `utils/items.js`, `utils/achievements.js`, help category icons, guild currency symbol defaults.
5. Replace economy command embeds.
6. Replace buttons and reactions after testing each flow.
7. Replace mini-game sprites.
8. Replace action/fun command labels.
