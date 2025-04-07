import { connectToDatabase } from '../app/lib/db';
import Business from '../app/models/business.model';
import { batchProcessBusinesses } from '../app/lib/embeddings';
import { checkPineconeConnection } from '../app/lib/pinecone';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function initVectorDB() {
  try {
    console.log('Starting vector database initialization...');

    // Check Pinecone connection
    console.log('Checking Pinecone connection...');
    const isPineconeConnected = await checkPineconeConnection();
    if (!isPineconeConnected) {
      throw new Error('Failed to connect to Pinecone');
    }

    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await connectToDatabase();

    // Fetch all businesses
    console.log('Fetching businesses from MongoDB...');
    const businesses = await Business.find({}).lean();
    console.log(`Found ${businesses.length} businesses`);

    if (businesses.length === 0) {
      console.log('No businesses found in the database');
      return;
    }

    // Process businesses in batches
    console.log('Starting batch processing of businesses...');
    await batchProcessBusinesses(businesses);

    console.log('Vector database initialization completed successfully');
  } catch (error) {
    console.error('Error initializing vector database:', error);
    process.exit(1);
  }
}

// Run the initialization
initVectorDB(); 