require('dotenv').config();
const mongoose = require('mongoose');
const Family = require('../models/familySchema');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const families = await Family.find({});
  console.log('Families in DB:', JSON.stringify(families, null, 2));
  await mongoose.disconnect();
}

main();
