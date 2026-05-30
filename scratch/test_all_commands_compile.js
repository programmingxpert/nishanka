const fs = require('fs');
const path = require('path');

function getFilesRecursively(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(getFilesRecursively(fullPath));
        } else if (file.endsWith('.js') && !file.endsWith('.example')) {
            results.push(fullPath);
        }
    });
    return results;
}

console.log('🔍 Locating command files...');
const commandsDir = path.join(__dirname, '..', 'commands');
const files = getFilesRecursively(commandsDir);
console.log(`Found ${files.length} command files to test.`);

let successCount = 0;
let failCount = 0;

files.forEach(file => {
    try {
        const command = require(file);
        successCount++;
    } catch (err) {
        console.error(`❌ Compilation FAILED for: ${path.relative(commandsDir, file)}`);
        console.error(err);
        failCount++;
    }
});

console.log('\n=====================================');
console.log(`✅ Passed compilation: ${successCount}`);
console.log(`❌ Failed compilation: ${failCount}`);
console.log('=====================================');

if (failCount > 0) {
    process.exit(1);
} else {
    console.log('🎉 All files compiled successfully!');
    process.exit(0);
}
