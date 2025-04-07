/**
 * This script finds businesses that have Feed AI content.
 */

// Important: Load dotenv before any other imports
import * as dotenv from 'dotenv';
// Load environment variables from .env file
dotenv.config({ path: '.env' });

// Import needed modules
import mongoose from 'mongoose';

// Mongoose connection check
async function connectToMongoDB() {
  if (mongoose.connection.readyState === 1) {
    console.log('MongoDB already connected');
    return mongoose.connection;
  }

  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/flintimeai';
  console.log(`Connecting to MongoDB at: ${MONGODB_URI}`);
  
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connected successfully');
    return mongoose.connection;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

/**
 * Find businesses with Feed AI content
 */
async function findBusinessesWithFeedAI() {
  try {
    // Connect to MongoDB
    const db = await connectToMongoDB();
    
    // Find all AI feed records
    console.log('Finding AI feeds with content...');
    const aiFeeds = await db.collection('aifeeds').find({
      $or: [
        { 'services.0': { $exists: true } },
        { 'faqs.0': { $exists: true } },
        { 'promotions.0': { $exists: true } },
        { 'customResponses.0': { $exists: true } }
      ]
    }).toArray();
    
    console.log(`Found ${aiFeeds.length} businesses with Feed AI content`);
    
    // Check each AI feed record
    for (const feed of aiFeeds) {
      const businessId = feed.businessId.toString();
      
      // Get business details
      const business = await db.collection('businesses').findOne({
        _id: new mongoose.Types.ObjectId(businessId)
      });
      
      if (business) {
        console.log('\n-----------------------------------');
        console.log(`Business ID: ${businessId}`);
        console.log(`Name: ${business.business_name}`);
        console.log(`Category: ${business.Business_Category || 'N/A'}`);
        
        // Content summary
        console.log('Feed AI Content:');
        console.log(`- Services: ${feed.services?.length || 0}`);
        console.log(`- FAQs: ${feed.faqs?.length || 0}`);
        console.log(`- Promotions: ${feed.promotions?.length || 0}`);
        console.log(`- Custom Responses: ${feed.customResponses?.length || 0}`);
        
        // Sample content
        if (feed.services?.length > 0) {
          console.log('\nSample service:');
          console.log(`- Name: ${feed.services[0].name}`);
          console.log(`- Price: ${feed.services[0].price}`);
        }
        
        // Command to debug
        console.log(`\nTo debug this business, run: npm run rag:debug ${businessId}`);
      }
    }
    
    if (aiFeeds.length === 0) {
      console.log('\nNo businesses with Feed AI content found.');
      console.log('You need to add services, FAQs, promotions, or custom responses to at least one business.');
    }
    
  } catch (error) {
    console.error('Error finding businesses with Feed AI:', error);
  } finally {
    // Close mongoose connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('MongoDB connection closed');
    }
  }
}

// Main function
async function main() {
  try {
    await findBusinessesWithFeedAI();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the main function
main(); 