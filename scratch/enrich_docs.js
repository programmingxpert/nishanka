const fs = require('fs');
const path = require('path');

const docsPath = 'C:\\Projects\\Projects\\Projects\\nishanka\\dashboard-v2\\src\\data\\docs';

const updateJson = (file, callback) => {
    const fullPath = path.join(docsPath, file);
    if (!fs.existsSync(fullPath)) return;
    const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    const updated = callback(data);
    fs.writeFileSync(fullPath, JSON.stringify(updated, null, 2));
};

// Admin Commands
updateJson('admin.json', (cmds) => {
    return cmds.map(c => {
        if (c.name === 'setwelcome' || c.name === 'setleave') {
            c.dashboardConfigurable = true;
            c.description += "\n\nYou can use placeholders in your message like {user.name}, {user.mention}, {server.name}, {server.memberCount}.";
        }
        if (c.name === 'autorole') {
            c.dashboardConfigurable = true;
            c.description += "\n\nAssigns a role automatically when a user joins the server.";
        }
        if (c.name === 'setlogs') {
            c.dashboardConfigurable = true;
            c.description += "\n\nSets up a channel to log deleted messages, kicks, and bans.";
        }
        if (c.name === 'setprefix') {
            c.dashboardConfigurable = true;
            c.description += "\n\nChanges the default prefix for this server.";
        }
        return c;
    });
});

// Economy Commands
updateJson('economy.json', (cmds) => {
    return cmds.map(c => {
        if (c.name === 'balance' || c.name === 'bal') {
            c.dashboardConfigurable = true;
            c.description += "\n\nYou can view your balance directly from the Web Dashboard without using commands.";
        }
        if (c.name === 'leaderboard' || c.name === 'lb') {
            c.dashboardConfigurable = true;
            c.description += "\n\nYou can view the full rich leaderboard from the Web Dashboard.";
        }
        return c;
    });
});

console.log('Documentation updated with rich details!');
