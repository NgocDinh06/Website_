const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./src/models/User');

require('dotenv').config();

async function createUser() {
  await mongoose.connect(process.env.MONGO_URL);
  const passwordHash = await bcrypt.hash('123456', 10);
  const user = new User({
    username: 'admin',
    password: passwordHash,
    role: 'admin'
  });
  await user.save();
  console.log('✅ User admin created');
  mongoose.disconnect();
}

createUser();