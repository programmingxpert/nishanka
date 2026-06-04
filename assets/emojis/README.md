# Nishanka Emoji Assets

This folder stores custom emoji assets for the Nishanka Discord bot.

The art direction is based on `nishanka.png` and `nishanka_nobg.png`: chibi/anime, midnight navy outlines, powder-blue bodies, hot pink glow, violet accents, soft glossy highlights, and recurring star motifs.

## Folders

- `source/`: raw generated chroma-key images
- `png/`: 128x128 transparent PNGs ready for Discord upload

## Naming

Use Discord-safe lowercase names with the `nk_` prefix:

- `nk_bauble`
- `nk_success`
- `nk_item_coffee`
- `nk_ach_mines_9`

## Runtime Mapping

Committed code uses semantic keys such as `currency.bauble`, `item.coffee`, and `ui.error`.

After uploading emojis to Discord, create `assets/emojis/discord-emojis.local.json` with entries like:

```json
{
  "currency.bauble": "<:nk_bauble:123456789012345678>",
  "item.coffee": "<:nk_item_coffee:123456789012345679>"
}
```

That local file is ignored by git. Environment overrides also work with names like `NISHANKA_EMOJI_CURRENCY_BAUBLE`.

## Generated Pilot Pack

- `png/currency-bauble.png`
- `png/currency-premium-gem.png`
- `png/ui-success.png`
- `png/ui-error.png`
- `png/ui-warning.png`
- `png/item-coffee.png`
- `png/item-rubber-duck.png`
- `png/game-mines-bomb.png`
