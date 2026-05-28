const mongoose = require('mongoose');

// Replace with your actual MongoDB database URI if it is different
const MONGO_URI = 'mongodb://127.0.0.1:27017/cookquest';

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB.');
    
    // Using strict: false allows us to bypass the strict schema requirements 
    // just for this script to inject the badge.
    const UserSchema = new mongoose.Schema({}, { strict: false, collection: 'users' });
    
    // Safely get or compile the model
    const User = mongoose.models.User || mongoose.model('User', UserSchema);

    // Change this if you want to target a different user!
    const targetUsername = 'eartttpy'; 

    console.log(`Looking for user: ${targetUsername}...`);

    const result = await User.findOneAndUpdate(
      { username: targetUsername },
      { 
        $push: { 
          badges: { 
            name: 'Master Chef', 
            icon: '👨‍🍳',
            earnedAt: new Date()
          } 
        } 
      },
      { new: true } // Returns the updated document
    );

    if (result) {
      console.log(`✅ Successfully added badge to ${targetUsername}!`);
      console.log('Current Badges:', result.badges);
    } else {
      console.log(`❌ User "${targetUsername}" not found. Please check your database.`);
    }

    process.exit(0);
  })
  .catch(err => {
    console.error('Database connection error:', err);
    process.exit(1);
  });