const Family = require('../models/familySchema');

async function syncFamily(userId) {
    let familyData = await Family.findOne({ userId });
    if (!familyData) {
        familyData = new Family({ userId });
        await familyData.save();
    }

    if (familyData.spouseId) {
        const spouseFamily = await Family.findOne({ userId: familyData.spouseId });
        if (spouseFamily) {
            // 1. Merge children arrays
            const allChildren = new Set([...familyData.children, ...spouseFamily.children]);
            if (allChildren.size > familyData.children.length || allChildren.size > spouseFamily.children.length) {
                const sharedChildren = Array.from(allChildren);
                familyData.children = sharedChildren;
                spouseFamily.children = sharedChildren;
                await familyData.save();
                await spouseFamily.save();
            }
            
            // 2. Ensure all children have both parents
            if (familyData.children.length > 0) {
                // Add first spouse to children who are missing them
                await Family.updateMany(
                    { userId: { $in: familyData.children }, parents: { $ne: familyData.userId } },
                    { $push: { parents: familyData.userId } }
                );
                // Add second spouse to children who are missing them
                await Family.updateMany(
                    { userId: { $in: familyData.children }, parents: { $ne: spouseFamily.userId } },
                    { $push: { parents: spouseFamily.userId } }
                );
            }
        }
    }
    
    return familyData;
}

module.exports = { syncFamily };
