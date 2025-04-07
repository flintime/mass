/**
 * Script to debug the local vector store with a test query
 * This helps test search functionality against specific businesses
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { localVectorStore, getEmbedding } from '../app/lib/local-vector-store';

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

// Get business details from MongoDB
async function getBusinessDetails(businessId: string) {
  try {
    const db = mongoose.connection.db;
    
    if (!db) {
      console.error('Database connection not established');
      return null;
    }
    
    const business = await db.collection('businesses').findOne({ _id: new mongoose.Types.ObjectId(businessId) });
    return business;
  } catch (error) {
    console.error(`Error fetching business ${businessId}:`, error);
    return null;
  }
}

// Debug search against local vector store
async function debugSearch(businessId: string, searchQuery: string) {
  try {
    // Get business details
    const business = await getBusinessDetails(businessId);
    
    if (!business) {
      console.error(`Business with ID ${businessId} not found`);
      return;
    }
    
    console.log(`\nBusiness details for ${businessId}:`);
    console.log(`Name: ${business.business_name || 'Unknown'}`);
    console.log(`Category: ${business.Business_Category || 'Unknown'}`);
    
    // Get embeddings for the search query
    console.log(`\nGenerating embedding for query: "${searchQuery}"`);
    const queryEmbedding = await getEmbedding(searchQuery);
    console.log(`Generated embedding with ${queryEmbedding.length} dimensions`);
    
    // Search the vector store
    console.log(`\nSearching local vector store for business ${businessId} with query "${searchQuery}"...`);
    
    const results = await localVectorStore.query({
      vector: queryEmbedding,
      filter: { businessId },
      topK: 5,
      includeMetadata: true
    });
    
    if (!results || !results.matches || results.matches.length === 0) {
      console.log(`\nNo vectors found for business ${businessId} matching query "${searchQuery}"`);
      return;
    }
    
    console.log(`\nFound ${results.matches.length} matching vectors:`);
    
    // Display search results
    for (let i = 0; i < results.matches.length; i++) {
      const match = results.matches[i];
      console.log(`\n--- Match ${i+1} ---`);
      console.log(`ID: ${match.id}`);
      console.log(`Score: ${match.score.toFixed(4)}`);
      console.log(`Type: ${match.metadata.type}`);
      console.log(`Source: ${match.metadata.source}`);
      console.log(`Content: ${match.metadata.content}`);
    }
    
    console.log('\nSearch complete!');
  } catch (error) {
    console.error('Error during search:', error);
  }
}

// Main function
async function main() {
  try {
    // Get businessId and searchQuery from command line arguments
    const businessId = process.argv[2];
    const searchQuery = process.argv[3] || 'default search query';
    
    if (!businessId) {
      console.error('Please provide a business ID as the first argument');
      console.log('Usage: npm run rag:local:debug BUSINESS_ID "your search query"');
      process.exit(1);
    }
    
    const connected = await connectToMongoDB();
    if (!connected) {
      console.error('Failed to connect to MongoDB. Exiting...');
      process.exit(1);
    }
    
    await debugSearch(businessId, searchQuery);
    
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