#!/usr/bin/env ts-node

import dotenv from 'dotenv';
import path from 'path';
import { vectorStore } from '../app/lib/vector-store';

// Load environment variables from both .env and .env.local files
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Environment check
console.log('Environment check:');
console.log('- OPENAI_API_KEY:', !!process.env.OPENAI_API_KEY);
console.log('- USE_PINECONE_RAG:', process.env.USE_PINECONE_RAG);

// Test business ID
const businessId = process.env.BUSINESS_ID || '67c550f9946155c8a1630886';

async function testVectorQuery() {
  try {
    console.log(`\nTesting local vector store query for business ${businessId}...\n`);
    
    // Get stats from the vector store
    const stats = await vectorStore.getStats();
    console.log('Vector store stats:', stats);
    
    // Test queries
    const queries = [
      'What services do you offer?',
      'What are your business hours?',
      'How can I contact you?',
      'Do you have any promotions?',
      'What payment methods do you accept?'
    ];
    
    // Run each query
    for (const query of queries) {
      console.log(`\nQuery: "${query}"`);
      const results = await vectorStore.retrieveRelevant(businessId, query, 3);
      console.log(`Found ${results.length} results:`);
      
      if (results.length > 0) {
        results.forEach((result, index) => {
          console.log(`\nResult #${index + 1} (score: ${result.metadata.score.toFixed(4)})`);
          console.log(`Type: ${result.metadata.type}`);
          console.log('Content:', result.pageContent);
        });
      } else {
        console.log('No results found');
      }
    }
    
    console.log('\nTest completed successfully');
  } catch (error) {
    console.error('Error during test:', error);
  }
}

// Run the test
testVectorQuery().then(() => {
  console.log('Script execution completed');
}).catch(error => {
  console.error('Script execution failed:', error);
  process.exit(1);
}); 