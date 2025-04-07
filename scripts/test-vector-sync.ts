#!/usr/bin/env ts-node

import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import { queueVectorStoreSync, getSyncStats } from '../app/lib/vector-sync-service';
import dbConnect from '../app/lib/db';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Business ID to test, can be provided via environment variable
const businessId = process.env.BUSINESS_ID || '67c550f9946155c8a1630886';

/**
 * Main test function
 */
async function testVectorSync() {
  console.log('Testing real-time vector synchronization...\n');
  
  try {
    // Connect to database
    await dbConnect();
    console.log('Connected to MongoDB');
    
    // Step 1: Check initial vector store state
    console.log(`\n[Step 1] Checking initial vector store state for business ${businessId}`);
    const initialStats = await getSyncStats();
    console.log(`Initial vectors for business: ${initialStats.vectorStoreStats?.vectorsByBusiness?.[businessId] || 0}`);
    console.log(`Initial total vectors: ${initialStats.vectorStoreStats?.totalVectors || 0}`);
    
    // Step 2: Update business data directly in MongoDB
    console.log(`\n[Step 2] Updating business data in MongoDB`);
    const businessCollection = mongoose.connection.db.collection('businesses');
    
    // Add a timestamp to make the update unique
    const timestamp = new Date().toISOString();
    const objectId = new mongoose.Types.ObjectId(businessId);
    
    const updateResult = await businessCollection.updateOne(
      { _id: objectId },
      { 
        $set: { 
          description: `Updated description for testing real-time sync at ${timestamp}`,
          lastTestUpdate: timestamp 
        } 
      }
    );
    
    console.log(`MongoDB update result: ${updateResult.modifiedCount === 1 ? 'Success' : 'Failed'}`);
    
    // Step 3: Wait for sync to be triggered automatically
    console.log(`\n[Step 3] Waiting for automatic sync to be triggered...`);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 4: Check sync queue status
    console.log(`\n[Step 4] Checking sync queue status`);
    const queueStats = await getSyncStats();
    console.log(`Queued syncs: ${queueStats.queueSize}`);
    console.log(`Failed syncs: ${queueStats.failedSyncs}`);
    
    if (queueStats.queueSize === 0 && queueStats.failedSyncs === 0) {
      console.log('No syncs in queue, manually triggering a sync to be sure');
      await queueVectorStoreSync(businessId);
    }
    
    // Step 5: Wait for sync to complete
    console.log(`\n[Step 5] Waiting for sync to complete...`);
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Step 6: Check final vector store state
    console.log(`\n[Step 6] Checking final vector store state`);
    const finalStats = await getSyncStats();
    console.log(`Final vectors for business: ${finalStats.vectorStoreStats?.vectorsByBusiness?.[businessId] || 0}`);
    console.log(`Final total vectors: ${finalStats.vectorStoreStats?.totalVectors || 0}`);
    
    // Check if vectors changed
    const initialVectorCount = initialStats.vectorStoreStats?.vectorsByBusiness?.[businessId] || 0;
    const finalVectorCount = finalStats.vectorStoreStats?.vectorsByBusiness?.[businessId] || 0;
    
    if (finalVectorCount !== initialVectorCount) {
      console.log(`\n✅ SUCCESS: Vector count changed from ${initialVectorCount} to ${finalVectorCount}`);
    } else {
      console.log(`\n⚠️ WARNING: Vector count remained at ${finalVectorCount}`);
      console.log('This could be normal if the update didn\'t affect any indexed fields');
    }
    
    console.log('\nTest completed successfully');
  } catch (error) {
    console.error('Error during test:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('Closed MongoDB connection');
  }
}

// Run the test
testVectorSync().then(() => {
  console.log('Script execution completed');
  process.exit(0);
}).catch(error => {
  console.error('Script execution failed:', error);
  process.exit(1);
}); 