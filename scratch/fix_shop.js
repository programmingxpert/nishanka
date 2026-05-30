const fs = require('fs');

let c = fs.readFileSync('commands/economy/shop.js', 'utf8');

c = c.replace(/case 'cosmetics':[\s\S]*?return \{ embeds: \[getCosmeticsPageEmbed\(baubles, globalMultiplier\)\], components: getCosmeticsComponents\(globalMultiplier\) \};[\s\S]*?case 'help':/g, 
`case 'cosmetics':
                        return { embeds: [getCosmeticsPageEmbed(baubles, globalMultiplier)], components: getCosmeticsComponents(globalMultiplier) };
                    case 'family':
                        return { embeds: [getFamilyPageEmbed(baubles, globalMultiplier)], components: getFamilyComponents(globalMultiplier) };
                    case 'help':`);

c = c.replace(/else if \(btnId === 'shop_btn_cosmetics'\) currentPage = 'cosmetics';\s*else if \(btnId === 'shop_btn_help'\) currentPage = 'help';/g, 
`else if (btnId === 'shop_btn_cosmetics') currentPage = 'cosmetics';
                    else if (btnId === 'shop_btn_family') currentPage = 'family';
                    else if (btnId === 'shop_btn_help') currentPage = 'help';`);

fs.writeFileSync('commands/economy/shop.js', c);
console.log('Fixed shop.js');
