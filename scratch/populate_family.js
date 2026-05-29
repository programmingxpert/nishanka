require('dotenv').config();
const mongoose = require('mongoose');
const Family = require('../models/familySchema');

const subjectId = '805007574193405952';
const spouseId = '1260315478145110017';
const parents = ['1100749202293796865', '1090686141398782073'];
const children = ['1099969005156040805'];
const siblingId = '1491314289385017404';

async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  // 1. Update subject user's family
  await Family.findOneAndUpdate(
    { userId: subjectId },
    {
      spouseId,
      parents,
      children
    },
    { upsert: true, new: true }
  );

  // 2. Update sibling user's family so they share parents and show up as siblings
  await Family.findOneAndUpdate(
    { userId: siblingId },
    {
      parents
    },
    { upsert: true, new: true }
  );

  console.log('Successfully populated test family tree relations!');
  await mongoose.disconnect();
}

main();
