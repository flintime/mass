/**
 * Script to initialize the local vector store
 * This replaces the previous Pinecone initialization
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs/promises';
import { localVectorStore, Vector, getEmbedding } from '../app/lib/local-vector-store';

// Load environment variables
dotenv.config();

// Connect to MongoDB
async function connectToMongoDB() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to MongoDB');
    return true;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    return false;
  }
}

// Initialize local vector store
async function initializeLocalVectorStore() {
  try {
    console.log('Initializing local vector store...');

    // Get businesses from MongoDB
    const db = mongoose.connection.db;
    
    if (!db) {
      console.error('Database connection not established');
      return;
    }
    
    const businessCollection = db.collection('businesses');
    
    // Count businesses
    const businessCount = await businessCollection.countDocuments();
    console.log(`Found ${businessCount} businesses in MongoDB`);
    
    // Get businesses with AI feed data
    const aiFeedCollection = db.collection('aifeeds');
    const businessesWithAIFeed = await aiFeedCollection.distinct('businessId');
    console.log(`Found ${businessesWithAIFeed.length} businesses with AI feed data`);
    
    if (businessesWithAIFeed.length === 0) {
      console.log('No businesses with AI feed data found. Skipping vector store initialization.');
      return;
    }
    
    // Process businesses in batches
    const batchSize = 10;
    let processedCount = 0;
    
    for (let i = 0; i < businessesWithAIFeed.length; i += batchSize) {
      const batch = businessesWithAIFeed.slice(i, i + batchSize);
      console.log(`Processing batch ${i/batchSize + 1} of ${Math.ceil(businessesWithAIFeed.length/batchSize)}`);
      
      // Process each business in the batch
      await Promise.all(batch.map(async (businessId) => {
        try {
          // Import the indexBusinessData function
          const { indexBusinessData } = require('../app/lib/vector-store');
          await indexBusinessData(businessId.toString());
          processedCount++;
        } catch (error) {
          console.error(`Error processing business ${businessId}:`, error);
        }
      }));
      
      console.log(`Processed ${processedCount}/${businessesWithAIFeed.length} businesses`);
    }
    
    // Get stats after initialization
    const stats = await localVectorStore.getStats();
    console.log('Local vector store initialized with the following stats:');
    console.log(JSON.stringify(stats, null, 2));
    
    console.log('Local vector store initialization complete!');
  } catch (error) {
    console.error('Error initializing local vector store:', error);
  }
}

// Main function
async function main() {
  try {
    const connected = await connectToMongoDB();
    if (!connected) {
      console.error('Failed to connect to MongoDB. Exiting...');
      process.exit(1);
    }
    
    await initializeLocalVectorStore();
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error in main function:', error);
    process.exit(1);
  }
}

// Run the main function
main(); 