const fs = require('fs');
const path = require('path');

const interactive = [
  'baka', 'bite', 'cuddle', 'feed', 'handhold', 'handshake', 'highfive', 
  'hug', 'husbando', 'kick', 'kiss', 'kitsune', 'lewd', 'neko', 'nom', 
  'pat', 'peck', 'punch', 'shoot', 'slap', 'thumbsup', 'tickle', 'touch', 
  'waifu', 'yeet'
];

const solo = [
  'angry', 'blush', 'bored', 'cry', 'dance', 'facepalm', 'happy', 'laugh', 
  'lurk', 'nod', 'nope', 'pout', 'run', 'shrug', 'sleep', 'smug', 'stare', 
  'think', 'wave', 'wink', 'yawn'
];

const dir = path.join(__dirname, 'commands', 'actions');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  const actionName = file.replace('.js', '');

  if (interactive.includes(actionName)) {
    // Make sure it has !user check and self check
    const userCheckRegex = /if\s*\(!user\)\s*return\s*context\.reply\(['"].+?['"]\);/g;
    const hasUserCheck = userCheckRegex.test(content);
    
    // Add self check if not present
    if (!content.includes('You cannot')) {
      if (hasUserCheck) {
        content = content.replace(
          userCheckRegex, 
          `$& \n\t\t\tif (user.id === (context.user?.id || context.author?.id)) return context.reply('❗ You cannot ${actionName} yourself! Please mention someone else.');`
        );
      } else {
        // Find customMsg context, put it right after
        const msgRegex = /const customMsg = [^\n;]+;/;
        content = content.replace(
          msgRegex,
          `$&\n\t\t\tif (!user) return context.reply('❗ Please mention a user to ${actionName}.');\n\t\t\tif (user.id === (context.user?.id || context.author?.id)) return context.reply('❗ You cannot ${actionName} yourself! Please mention someone else.');`
        );
      }
    }
    fs.writeFileSync(filePath, content);
  } else if (solo.includes(actionName)) {
    // It's a solo command.
    // Ensure SlashCommandBuilder has addUserOption
    if (!content.includes('.addUserOption(')) {
        content = content.replace(
            /\.setDescription\(['"]([^'"]+)['"]\)/,
            `.setDescription('$1')\n\t\t.addUserOption(option =>\n\t\t\toption.setName('user')\n\t\t\t\t.setDescription('Optional user to target'))`
        );
    }

    // Ensure const user is defined
    if (!content.includes('const user = ')) {
        content = content.replace(
            /(const customMsg = [^\n;]+;)/,
            `const user = context.options?.getUser?.('user') || context.mentions?.users.first();\n\t\t$1`
        );
    }

    // Ensure targetUser logic is correct (user || context.user || context.author)
    content = content.replace(/targetUser:\s*(context\.user\s*\|\|\s*context\.author|context\.author\s*\|\|\s*context\.user|context\.(user|author))/g, "targetUser: user || context.user || context.author");

    fs.writeFileSync(filePath, content);
  }
}

console.log("Done updating actions command files!");
