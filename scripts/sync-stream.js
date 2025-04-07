require('dotenv').config();
const mongoose = require('mongoose');
const { 
  syncBusinessToPinecone, 
  deleteBusinessFromPinecone, 
  updateBusinessInPinecone 
} = require('../app/lib/pinecone-sync');

// Define the business schema
const businessSchema = new mongoose.Schema({
  business_name: String,
  Business_Category: String,
  Business_Subcategories: [String],
  business_features: [String],
  description: String,
  address: String,
  city: String,
  state: String,
  zip_code: String,
  latitude: Number,
  longitude: Number,
  location: {
    type: { type: String },
    coordinates: [Number]
  }
});

const Business = mongoose.model('Business', businessSchema);

async function handleInsert(business) {
  console.log(`New business inserted: ${business.business_name}`);
  try {
    const result = await syncBusinessToPinecone(business);
    if (result) {
      console.log(`Successfully synced new business: ${business.business_name} to Pinecone`);
    } else {
      console.error(`Failed to sync new business: ${business.business_name} to Pinecone`);
    }
  } catch (error) {
    console.error(`Error syncing new business: ${business.business_name}`, error);
  }
}

async function handleUpdate(business) {
  console.log(`Business updated: ${business.business_name}`);
  try {
    const result = await updateBusinessInPinecone(business);
    if (result) {
      console.log(`Successfully updated business: ${business.business_name} in Pinecone`);
    } else {
      console.error(`Failed to update business: ${business.business_name} in Pinecone`);
    }
  } catch (error) {
    console.error(`Error updating business: ${business.business_name}`, error);
  }
}

async function handleDelete(businessId) {
  console.log(`Business deleted: ${businessId}`);
  try {
    const result = await deleteBusinessFromPinecone(businessId);
    if (result) {
      console.log(`Successfully deleted business: ${businessId} from Pinecone`);
    } else {
      console.error(`Failed to delete business: ${businessId} from Pinecone`);
    }
  } catch (error) {
    console.error(`Error deleting business: ${businessId}`, error);
  }
}

async function startChangeStream() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB successfully');

    const changeStream = Business.watch([], {
      fullDocument: 'updateLookup'
    });

    console.log('Change stream started. Listening for changes...');

    changeStream.on('change', async (change) => {
      try {
        switch (change.operationType) {
          case 'insert':
            await handleInsert(change.fullDocument);
            break;
          case 'update':
            await handleUpdate(change.fullDocument);
            break;
          case 'delete':
            await handleDelete(change.documentKey._id.toString());
            break;
          default:
            console.log(`Unhandled operation type: ${change.operationType}`);
        }
      } catch (error) {
        console.error('Error handling change:', error);
      }
    });

    changeStream.on('error', (error) => {
      console.error('Error in change stream:', error);
      // Attempt to restart the stream
      setTimeout(startChangeStream, 5000);
    });

    // Handle process termination
    process.on('SIGINT', async () => {
      try {
        await changeStream.close();
        await mongoose.disconnect();
        console.log('Change stream closed and disconnected from MongoDB');
        process.exit(0);
      } catch (error) {
        console.error('Error during cleanup:', error);
        process.exit(1);
      }
    });

  } catch (error) {
    console.error('Error starting change stream:', error);
    // Attempt to restart on error
    setTimeout(startChangeStream, 5000);
  }
}

// Start the change stream
startChangeStream(); 