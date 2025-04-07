/**
 * Script to inspect the local vector store
 * Provides stats and information about stored vectors
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { localVectorStore } from '../app/lib/local-vector-store';

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

// Inspect the local vector store
async function inspectLocalVectorStore(businessId?: string) {
  try {
    console.log('Inspecting local vector store...');
    
    // Get overall stats
    const stats = await localVectorStore.getStats();
    console.log('Local vector store stats:');
    console.log(JSON.stringify(stats, null, 2));
    
    if (businessId) {
      // Get business details
      const business = await getBusinessDetails(businessId);
      console.log(`\nBusiness details for ${businessId}:`);
      console.log(`Name: ${business?.business_name || 'Unknown'}`);
      
      // Query vectors for the specific business
      const queryEmbedding = new Array(1536).fill(0); // Dummy embedding for retrieval
      const results = await localVectorStore.query({
        vector: queryEmbedding,
        filter: { businessId },
        topK: 100, // Get a significant amount of vectors
        includeMetadata: true
      });
      
      if (!results || !results.matches || results.matches.length === 0) {
        console.log(`\nNo vectors found for business ${businessId}`);
        return;
      }
      
      console.log(`\nFound ${results.matches.length} vectors for business ${businessId}`);
      
      // Group by type
      const typeGroups: Record<string, number> = {};
      
      for (const match of results.matches) {
        const type = match.metadata.type || 'unknown';
        typeGroups[type] = (typeGroups[type] || 0) + 1;
      }
      
      console.log('\nVector types:');
      for (const [type, count] of Object.entries(typeGroups)) {
        console.log(`- ${type}: ${count} vectors`);
      }
      
      // Show sample vectors
      console.log('\nSample vectors:');
      const sampleVectors = results.matches.slice(0, 5);
      
      for (const vector of sampleVectors) {
        console.log(`\nVector ID: ${vector.id}`);
        console.log(`Type: ${vector.metadata.type}`);
        console.log(`Source: ${vector.metadata.source}`);
        console.log(`Score: ${vector.score}`);
        console.log(`Content: ${vector.metadata.content?.substring(0, 100)}...`);
      }
    }
    
    console.log('\nInspection complete!');
  } catch (error) {
    console.error('Error inspecting local vector store:', error);
  }
}

// Main function
async function main() {
  try {
    // Get businessId from command line arguments
    const businessId = process.argv[2];
    
    const connected = await connectToMongoDB();
    if (!connected) {
      console.error('Failed to connect to MongoDB. Exiting...');
      process.exit(1);
    }
    
    await inspectLocalVectorStore(businessId);
    
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