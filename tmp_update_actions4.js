const fs = require('fs');
const path = require('path');

const solo = [
  'angry', 'blush', 'bored', 'cry', 'dance', 'facepalm', 'happy', 'laugh', 
  'lurk', 'nod', 'nope', 'pout', 'run', 'shrug', 'sleep', 'smug', 'stare', 
  'think', 'wave', 'wink', 'yawn'
];

const dir = path.join(__dirname, 'commands', 'actions');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));

const replyCode = `const reply = (msg) => context.reply ? context.reply(msg) : context.message.reply(msg);`;

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  const actionName = file.replace('.js', '');

  if (solo.includes(actionName)) {
    // 1. First, strip the old buggy reply additions if any exist
    content = content.replace(/if \(\!user\) return context\.reply\(['"].*?['"]\);\s*/g, '');
    content = content.replace(/if \(user\.id === \(context\.user\?\.id \|\| context\.author\?\.id\)\) return context\.reply\(['"].*?['"]\);\s*/g, '');

    // 2. Inject our helper just below `const customMsg = ...` to make it available just in case.
    const msgRegex = /const customMsg = [^\n;]+;/;
    
    if(!content.includes('const reply = ')) {
        const injection = `$&\n\t\t\t${replyCode}`;
        content = content.replace(msgRegex, injection);
        fs.writeFileSync(filePath, content);
    }
  }
}

console.log("Done updating solo actions!");
