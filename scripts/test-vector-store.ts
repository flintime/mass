/**
 * Test Vector Store
 * 
 * This script tests the local vector store with some sample data
 * without requiring a MongoDB connection.
 */

import 'dotenv/config';
import { localVectorStore, getEmbedding, Vector } from '../app/lib/local-vector-store';

async function runTest() {
  try {
    console.log('Testing vector store with sample data...');
    
    // Create sample business data
    const businessId = 'sample-business-123';
    const sampleVectors: Vector[] = [
      {
        id: `rag-${businessId}-basic_info-1`,
        values: new Array(1536).fill(0.1),
        metadata: {
          businessId,
          type: 'basic_info',
          source: 'business_profile',
          content: 'Business Name: Sample Business\nDescription: A sample business for testing\nCategory: Testing'
        }
      },
      {
        id: `rag-${businessId}-contact_info-1`,
        values: new Array(1536).fill(0.2),
        metadata: {
          businessId,
          type: 'contact_info',
          source: 'business_profile',
          content: 'Address: 123 Test St\nPhone: 555-1234\nEmail: sample@example.com\nWebsite: https://example.com'
        }
      },
      {
        id: `rag-${businessId}-service-1`,
        values: new Array(1536).fill(0.3),
        metadata: {
          businessId,
          type: 'service',
          serviceId: 'service-1',
          source: 'services',
          content: 'Service: Sample Service 1\nDescription: A sample service\nPrice: $100\nDuration: 60 minutes'
        }
      },
      {
        id: `rag-${businessId}-service-2`,
        values: new Array(1536).fill(0.4),
        metadata: {
          businessId,
          type: 'service',
          serviceId: 'service-2',
          source: 'services',
          content: 'Service: Sample Service 2\nDescription: Another sample service\nPrice: $200\nDuration: 120 minutes'
        }
      },
      {
        id: `rag-${businessId}-faq-1`,
        values: new Array(1536).fill(0.5),
        metadata: {
          businessId,
          type: 'faq',
          faqId: 'faq-1',
          source: 'faqs',
          content: 'Question: What are your hours?\nAnswer: We are open 9am-5pm Monday through Friday.'
        }
      }
    ];
    
    // Store vectors
    console.log(`Storing ${sampleVectors.length} sample vectors...`);
    const upsertResult = await localVectorStore.upsert(sampleVectors);
    console.log(`Upsert result: ${upsertResult ? 'Success' : 'Failed'}`);
    
    // Get stats
    const stats = await localVectorStore.getStats();
    console.log('\nVector store stats:');
    console.log(JSON.stringify(stats, null, 2));
    
    // Test query
    console.log('\nQuerying for services...');
    const serviceQuery = await localVectorStore.query({
      vector: new Array(1536).fill(0.3), // Similar to service-1
      filter: { businessId, type: 'service' },
      topK: 10,
      includeMetadata: true
    });
    
    console.log(`Found ${serviceQuery.matches.length} service matches`);
    serviceQuery.matches.forEach((match, index) => {
      console.log(`\nMatch ${index + 1} (score: ${match.score.toFixed(4)}):`);
      console.log(match.metadata.content);
    });
    
    // Test query with text
    console.log('\nSimulating a text query...');
    // We'll just use a dummy embedding since we can't call OpenAI in this test
    const queryVector = new Array(1536).fill(0.2);
    
    const textQuery = await localVectorStore.query({
      vector: queryVector,
      filter: { businessId },
      topK: 3,
      includeMetadata: true
    });
    
    console.log(`Found ${textQuery.matches.length} matches for text query`);
    textQuery.matches.forEach((match, index) => {
      console.log(`\nMatch ${index + 1} (score: ${match.score.toFixed(4)}):`);
      console.log(`Type: ${match.metadata.type}`);
      console.log(match.metadata.content);
    });
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Error running test:', error);
  }
}

// Run the test
runTest(); 