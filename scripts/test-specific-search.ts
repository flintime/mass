/**
 * Test Specific Search Script
 * 
 * This script tests searching for a specific term in the vector store
 */

import dotenv from 'dotenv';
import { initVectorStore, getEmbedding } from '../app/lib/local-vector-store';
import { vectorStore } from '../app/lib/vector-store';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

// Define vector store directory
const VECTOR_STORE_DIR = process.env.VECTOR_STORAGE_DIR || path.join(process.cwd(), 'data', 'vector-store');

async function testSpecificSearch() {
  console.log('=== Testing Specific Search ===');
  
  // Initialize vector store
  console.log('Initializing vector store...');
  await initVectorStore();
  
  // List all available business IDs
  const files = fs.readdirSync(VECTOR_STORE_DIR);
  const businessFiles = files.filter(file => file.endsWith('.json') && !file.startsWith('.'));
  
  console.log(`Found ${businessFiles.length} business vector files`);
  
  // Get embedding for search term
  const searchTerm = 'flintime';
  console.log(`\nGenerating embedding for search term: "${searchTerm}"`);
  
  try {
    const queryEmbedding = await getEmbedding(searchTerm);
    console.log(`Generated embedding with ${queryEmbedding.length} dimensions`);
    
    // Search each business individually
    console.log('\nSearching each business individually:');
    
    for (const file of businessFiles) {
      const businessId = file.replace('.json', '');
      console.log(`\n--- Business ID: ${businessId} ---`);
      
      // Load the vector file directly to see content
      const vectorData = JSON.parse(fs.readFileSync(path.join(VECTOR_STORE_DIR, file), 'utf-8'));
      console.log(`Vector file has ${vectorData.length} vectors`);
      
      // Print some metadata about the vectors
      console.log('Vector types:');
      const types = new Set(vectorData.map((v: any) => v.metadata.type));
      console.log([...types]);
      
      // Search this business
      console.log(`\nSearching with term: "${searchTerm}"`);
      const results = await vectorStore.retrieveRelevant(businessId, searchTerm, 5);
      
      console.log(`Search returned ${results.length} results for business ${businessId}`);
      
      if (results.length > 0) {
        console.log('\nTop result:');
        console.log('- Type:', results[0].metadata.type);
        console.log('- Score:', results[0].metadata.score);
        console.log('- Content (preview):', results[0].pageContent.substring(0, 100) + '...');
      }
    }
    
    console.log('\n=== Search Test Complete ===');
  } catch (error) {
    console.error('Error testing search:', error);
  }
}

// Run the test
testSpecificSearch()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Test failed with error:', error);
    process.exit(1);
  }); 