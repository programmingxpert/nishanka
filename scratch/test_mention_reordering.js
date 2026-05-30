const assert = require('assert');

// Mock Collection class analogous to discord.js Collection
class Collection extends Map {
    first() {
        return this.values().next().value;
    }
    some(fn) {
        for (const [key, val] of this) {
            if (fn(val, key)) return true;
        }
        return false;
    }
}

// Test case 1: Reply to user A, mention user B
const msg1 = {
    reference: { messageId: '12345' },
    mentions: {
        repliedUser: { id: 'userA', name: 'User A' },
        users: new Collection([
            ['userA', { id: 'userA', name: 'User A' }],
            ['userB', { id: 'userB', name: 'User B' }]
        ]),
        members: new Collection([
            ['userA', { id: 'userA', nickname: 'User A' }],
            ['userB', { id: 'userB', nickname: 'User B' }]
        ])
    }
};

// Apply logic
function runPrioritization(message) {
    if (message.reference && message.reference.messageId) {
        const repliedUser = message.mentions.repliedUser;
        if (repliedUser) {
            const hasOtherMention = message.mentions.users.some(u => u.id !== repliedUser.id);
            if (hasOtherMention) {
                // Re-order users collection to move repliedUser to the end
                const usersMap = new Map(message.mentions.users);
                message.mentions.users.clear();
                for (const [id, user] of usersMap) {
                    if (id !== repliedUser.id) {
                        message.mentions.users.set(id, user);
                    }
                }
                message.mentions.users.set(repliedUser.id, repliedUser);

                // Re-order members collection if applicable
                if (message.mentions.members && message.mentions.members.size > 0) {
                    const membersMap = new Map(message.mentions.members);
                    const repliedMember = membersMap.get(repliedUser.id);
                    if (repliedMember) {
                        message.mentions.members.clear();
                        for (const [id, member] of membersMap) {
                            if (id !== repliedUser.id) {
                                message.mentions.members.set(id, member);
                            }
                        }
                        message.mentions.members.set(repliedUser.id, repliedMember);
                    }
                }
            }
        }
    }
}

console.log('Running test 1: Reply to userA, mention userB...');
runPrioritization(msg1);

assert.strictEqual(msg1.mentions.users.first().id, 'userB', 'Expected userB to be the first user mention.');
assert.strictEqual(msg1.mentions.members.first().id, 'userB', 'Expected userB member to be the first member mention.');
console.log('✅ Test 1 Passed: userB correctly prioritized!');

// Test case 2: Reply to user A, no other mention
const msg2 = {
    reference: { messageId: '12345' },
    mentions: {
        repliedUser: { id: 'userA', name: 'User A' },
        users: new Collection([
            ['userA', { id: 'userA', name: 'User A' }]
        ]),
        members: new Collection([
            ['userA', { id: 'userA', nickname: 'User A' }]
        ])
    }
};

console.log('Running test 2: Reply to userA, no other mention...');
runPrioritization(msg2);

assert.strictEqual(msg2.mentions.users.first().id, 'userA', 'Expected userA to remain first.');
console.log('✅ Test 2 Passed: Fallback to userA works correctly!');

// Test case 3: Not a reply
const msg3 = {
    reference: null,
    mentions: {
        repliedUser: null,
        users: new Collection([
            ['userB', { id: 'userB', name: 'User B' }]
        ]),
        members: new Collection([
            ['userB', { id: 'userB', nickname: 'User B' }]
        ])
    }
};

console.log('Running test 3: Not a reply...');
runPrioritization(msg3);

assert.strictEqual(msg3.mentions.users.first().id, 'userB', 'Expected userB to be first.');
console.log('✅ Test 3 Passed: Standard mention resolution works correctly!');
