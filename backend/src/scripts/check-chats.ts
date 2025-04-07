import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function checkChats() {
  try {
    // Connect to MongoDB
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI not found in environment variables');
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get all collections
    const collections = await mongoose.connection.db.collections();
    console.log('\nCollections in database:');
    for (const collection of collections) {
      console.log(collection.collectionName);
    }

    // Check chatrooms collection
    const chatrooms = await mongoose.connection.db.collection('chatrooms').find({}).toArray();
    console.log('\nChat rooms in database:', JSON.stringify(chatrooms, null, 2));

    // Check messages collection (if it exists separately)
    try {
      const messages = await mongoose.connection.db.collection('messages').find({}).toArray();
      console.log('\nMessages in database:', JSON.stringify(messages, null, 2));
    } catch (error) {
      console.log('No separate messages collection found');
    }

    // Check chats collection (in case it's using the old name)
    try {
      const chats = await mongoose.connection.db.collection('chats').find({}).toArray();
      console.log('\nChats in database:', JSON.stringify(chats, null, 2));
    } catch (error) {
      console.log('No chats collection found');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkChats(); 