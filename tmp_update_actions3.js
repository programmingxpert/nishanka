const fs = require('fs');
const path = require('path');

const interactive = [
  'baka', 'bite', 'cuddle', 'feed', 'handhold', 'handshake', 'highfive', 
  'hug', 'husbando', 'kick', 'kiss', 'kitsune', 'lewd', 'neko', 'nom', 
  'pat', 'peck', 'punch', 'shoot', 'slap', 'thumbsup', 'tickle', 'touch', 
  'waifu', 'yeet'
];

const selfResponses = [
  "Aww, let me do that for you! *But you still need to mention someone else...*",
  "Doing that to yourself? How lonely... Mention someone!",
  "I'm here for you! But seriously, mention another user for this command.",
  "You can't target yourself, silly! Mention a friend!",
  "Hold on there, you need another person for this to work right. Mention them!"
];

const dir = path.join(__dirname, 'commands', 'actions');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));

// We need a helper to safely reply whether it's slash or prefix
const replyCode = `const reply = (msg) => context.reply ? context.reply(msg) : context.message.reply(msg);`;
const randomSelfResponseCode = `const selfResponses = ${JSON.stringify(selfResponses)};
			const randomResponse = selfResponses[Math.floor(Math.random() * selfResponses.length)];`;


for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  const actionName = file.replace('.js', '');

  if (interactive.includes(actionName)) {
    // 1. First, strip the old buggy reply additions
    content = content.replace(/if \(\!user\) return context\.reply\(['"].*?['"]\);\s*/g, '');
    content = content.replace(/if \(user\.id === \(context\.user\?\.id \|\| context\.author\?\.id\)\) return context\.reply\(['"].*?['"]\);\s*/g, '');

    // 2. Inject our helper and randomizer just below `const customMsg = ...`
    const msgRegex = /const customMsg = [^\n;]+;/;
    
    const injection = `$&\n\t\t\t${replyCode}\n\t\t\t${randomSelfResponseCode}
			if (!user) return reply('❗ Please mention a user to ${actionName}.');
			if (user.id === (context.user?.id || context.author?.id)) return reply(randomResponse);`;

    content = content.replace(msgRegex, injection);
    fs.writeFileSync(filePath, content);
  }
}

console.log("Done updating interactive actions!");
