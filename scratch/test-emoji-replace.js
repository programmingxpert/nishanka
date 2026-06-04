const { emoji: getCustomEmoji } = require('../utils/customEmojis');

const emojiMapping = {
    '🪙': 'currency.bauble',
    '❌': 'ui.error',
    '✅': 'ui.success',
    '⚠️': 'ui.warning',
    '☕': 'item.coffee',
    '💎': 'currency.premium_gem',
    '💣': 'game.mines_bomb',
    '🦆': 'item.rubber_duck'
};

const text = "You won 100 🪙! ✅ Great job. ❌ No errors. ⚠️ Pay attention. ☕ Enjoy your coffee. 💎 Premium! 💣 Bomb! 🦆 Rubber duck.";
let str = text;
for (const [standardEmoji, key] of Object.entries(emojiMapping)) {
    const customEmoji = getCustomEmoji(key);
    console.log(`Key: ${key}, CustomEmoji: ${customEmoji}, Standard: ${standardEmoji}`);
    if (customEmoji && customEmoji !== standardEmoji) {
        const regex = new RegExp(standardEmoji, 'g');
        str = str.replace(regex, customEmoji);
    }
}

console.log("Original text:", text);
console.log("Replaced text:", str);
