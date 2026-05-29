require('dotenv').config();
const mongoose = require('mongoose');
const Family = require('../models/familySchema');

const subjectId = '805007574193405952';
const siblingId = '1491314289385017404';

async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  // Reset subject user family document fields to empty defaults
  await Family.findOneAndUpdate(
    { userId: subjectId },
    {
      spouseId: null,
      parents: [],
      children: [],
      pendingSpouseProposal: null,
      pendingAdoptionProposals: []
    }
  );

  // Reset sibling family document fields
  await Family.findOneAndUpdate(
    { userId: siblingId },
    {
      parents: []
    }
  );

  console.log('Successfully cleared all test family relations!');
  await mongoose.disconnect();
}

main();
