/**
 * Index All Businesses Script
 * 
 * This script ensures all businesses in MongoDB are properly indexed in the vector store
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { initVectorStore } from '../app/lib/local-vector-store';
import { parseBusinessDataToChunks, vectorStore, getEmbedding } from '../app/lib/vector-store';
import path from 'path';

// Load environment variables
dotenv.config();

// Connect to MongoDB
async function connectToMongoDB() {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to MongoDB');
  }
}

// Index all businesses
async function indexAllBusinesses() {
  try {
    console.log('=== Indexing All Businesses to Vector Store ===');
    
    // Initialize vector store
    console.log('Initializing vector store...');
    await initVectorStore();
    
    // Connect to MongoDB
    await connectToMongoDB();
    
    // Get all businesses from MongoDB
    const businesses = await mongoose.connection.collection('businesses').find({}).toArray();
    console.log(`Found ${businesses.length} businesses in MongoDB`);
    
    // Process businesses in batches to avoid memory issues
    const BATCH_SIZE = 5;
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < businesses.length; i += BATCH_SIZE) {
      const batch = businesses.slice(i, i + BATCH_SIZE);
      console.log(`\nProcessing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(businesses.length / BATCH_SIZE)} (${batch.length} businesses)`);
      
      for (const business of batch) {
        const businessId = business._id.toString();
        console.log(`\nProcessing business ${businessId}: ${business.business_name}`);
        
        try {
          // Parse business data to chunks
          console.log(`Parsing data for business ${businessId}...`);
          const chunks = await parseBusinessDataToChunks(businessId);
          
          if (chunks.length === 0) {
            console.log(`No data chunks found for business ${businessId} - skipping`);
            errorCount++;
            continue;
          }
          
          console.log(`Generated ${chunks.length} chunks for business ${businessId}`);
          
          // Store each chunk in the vector store
          let storedCount = 0;
          for (const chunk of chunks) {
            try {
              // Generate embedding for the chunk
              const embedding = await getEmbedding(chunk.pageContent);
              
              // Store in vector store
              await vectorStore.storeDocument(chunk, embedding);
              storedCount++;
            } catch (chunkError) {
              console.error(`Error processing chunk for business ${businessId}:`, chunkError);
            }
          }
          
          console.log(`Successfully stored ${storedCount}/${chunks.length} chunks for business ${businessId}`);
          successCount++;
        } catch (businessError) {
          console.error(`Error indexing business ${businessId}:`, businessError);
          errorCount++;
        }
      }
      
      // Small delay between batches
      if (i + BATCH_SIZE < businesses.length) {
        console.log('Waiting before processing next batch...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log('\n=== Indexing Summary ===');
    console.log(`Total businesses processed: ${businesses.length}`);
    console.log(`Successfully indexed: ${successCount}`);
    console.log(`Failed to index: ${errorCount}`);
    console.log('Indexing complete!');
  } catch (error) {
    console.error('Error indexing businesses:', error);
  } finally {
    // Disconnect from MongoDB
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    }
  }
}

// Run the indexing
indexAllBusinesses()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Indexing failed with error:', error);
    process.exit(1);
  }); 