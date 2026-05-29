const fs = require('fs');
const path = require('path');

const commandsPath = path.resolve(__dirname, '../commands');
const grouped = {};

(function check(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      check(fullPath);
    } else if (entry.name.endsWith('.js') && !entry.name.endsWith('.example')) {
      try {
        const cmd = require(fullPath);
        const name = cmd.data?.name;
        if (!name) continue;
        const category = cmd.category || 'Uncategorized';
        if (!grouped[category]) grouped[category] = [];
        grouped[category].push(name);
      } catch (err) {
        console.error('Failed to load', entry.name, err.message);
      }
    }
  }
})(commandsPath);

for (const cat in grouped) {
  console.log(`[${cat}]:`, grouped[cat].sort().join(', '));
}
