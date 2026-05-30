const Family = require('../models/familySchema');

async function syncFamily(userId, depth = 0) {
    if (depth > 5) return null; // Prevent infinite loops

    let familyData = await Family.findOne({ userId });
    if (!familyData) {
        familyData = new Family({ userId });
        await familyData.save();
    }

    let changed = false;

    // 1. Sync spouse
    if (familyData.spouseId) {
        const spouseFamily = await Family.findOne({ userId: familyData.spouseId });
        if (spouseFamily) {
            const allChildren = new Set([...familyData.children, ...spouseFamily.children]);
            
            if (allChildren.size > familyData.children.length || allChildren.size > spouseFamily.children.length) {
                const sharedChildren = Array.from(allChildren);
                
                await Family.updateOne({ userId: familyData.userId }, { $set: { children: sharedChildren } });
                await Family.updateOne({ userId: spouseFamily.userId }, { $set: { children: sharedChildren } });
                
                familyData.children = sharedChildren;
                spouseFamily.children = sharedChildren;
                changed = true;
            }
            
            if (familyData.children.length > 0) {
                await Family.updateMany(
                    { userId: { $in: familyData.children }, parents: { $ne: familyData.userId } },
                    { $push: { parents: familyData.userId } }
                );
                await Family.updateMany(
                    { userId: { $in: familyData.children }, parents: { $ne: spouseFamily.userId } },
                    { $push: { parents: spouseFamily.userId } }
                );
            }
        }
    }

    // 2. Sync parents
    if (familyData.parents && familyData.parents.length > 0) {
        for (const parentId of familyData.parents) {
            await syncFamily(parentId, depth + 1);
        }
    }

    // Refresh after recursive syncs if needed
    if (familyData.parents && familyData.parents.length > 0) {
        familyData = await Family.findOne({ userId });
    }

    return familyData;
}

module.exports = { syncFamily };
