const fs = require('fs');
const path = require('path');
const { ITEMS, RARITIES } = require('../utils/items');

const data = {
  items: ITEMS,
  rarities: RARITIES
};

fs.writeFileSync(
  path.join(__dirname, '../dashboard-v2/src/data/items.json'),
  JSON.stringify(data, null, 2)
);
console.log('Items database synced with backend successfully!');
