/**
 * Test Local Vector Store
 * 
 * This script tests the local vector store implementation by:
 * 1. Creating and storing some test vectors
 * 2. Querying the vectors with different filters
 * 3. Deleting specific vectors and verifying results
 */

require('dotenv').config();

// Set a timeout to ensure async operations have time to complete
const TIMEOUT = 30000;
setTimeout(() => {
  console.log('Script timed out');
  process.exit(1);
}, TIMEOUT);

async function runTest() {
  try {
    console.log('Testing local vector store...');
    
    // Import our local vector store module
    const { localVectorStore, getEmbedding } = require('../app/lib/local-vector-store');
    
    // Create some test data
    const businessId = 'test-business-1';
    const testVectors = [
      {
        id: `rag-${businessId}-basic_info-1`,
        values: new Array(1536).fill(0.1),
        metadata: {
          businessId,
          type: 'basic_info',
          source: 'business_profile',
          content: 'Test Business Name: Test Business\nDescription: A test business\nCategory: Testing'
        }
      },
      {
        id: `rag-${businessId}-service-1`,
        values: new Array(1536).fill(0.2),
        metadata: {
          businessId,
          type: 'service',
          serviceId: '1',
          source: 'services',
          content: 'Service: Test Service 1\nDescription: A test service\nPrice: $100\nDuration: 60 minutes'
        }
      },
      {
        id: `rag-${businessId}-service-2`,
        values: new Array(1536).fill(0.3),
        metadata: {
          businessId,
          type: 'service',
          serviceId: '2',
          source: 'services',
          content: 'Service: Test Service 2\nDescription: Another test service\nPrice: $200\nDuration: 120 minutes'
        }
      }
    ];
    
    console.log(`\n1. STORING ${testVectors.length} TEST VECTORS`);
    const upsertResult = await localVectorStore.upsert(testVectors);
    console.log(`Upsert result: ${upsertResult ? 'Success' : 'Failed'}`);
    
    // Get store stats
    const stats = await localVectorStore.getStats();
    console.log('\nVector store stats:');
    console.log(JSON.stringify(stats, null, 2));
    
    // Test querying by all vectors for the business
    console.log('\n2. QUERYING ALL VECTORS FOR THE BUSINESS');
    const allQuery = await localVectorStore.query({
      vector: new Array(1536).fill(0.1),
      filter: { businessId },
      topK: 10,
      includeMetadata: true
    });
    
    console.log(`Found ${allQuery.matches.length} matches`);
    console.log('Vector types found:');
    const types = allQuery.matches.map(match => match.metadata.type);
    console.log(types);
    
    // Test querying only services
    console.log('\n3. QUERYING ONLY SERVICES');
    const serviceQuery = await localVectorStore.query({
      vector: new Array(1536).fill(0.1),
      filter: { businessId, type: 'service' },
      topK: 10,
      includeMetadata: true
    });
    
    console.log(`Found ${serviceQuery.matches.length} service matches`);
    console.log('Services found:');
    serviceQuery.matches.forEach(match => {
      console.log(`- ${match.metadata.content.split('\n')[0]}`);
    });
    
    // Test deleting one vector
    console.log('\n4. DELETING ONE VECTOR');
    const deleteOneResult = await localVectorStore.deleteOne(`rag-${businessId}-service-1`);
    console.log(`Delete one result: ${deleteOneResult ? 'Success' : 'Failed'}`);
    
    // Check that the vector was deleted
    const afterDeleteQuery = await localVectorStore.query({
      vector: new Array(1536).fill(0.1),
      filter: { businessId },
      topK: 10,
      includeMetadata: true
    });
    
    console.log(`After delete - Found ${afterDeleteQuery.matches.length} matches`);
    console.log('Vector IDs:');
    console.log(afterDeleteQuery.matches.map(match => match.id));
    
    // Test deleting all vectors for the business
    console.log('\n5. DELETING ALL VECTORS FOR THE BUSINESS');
    const deleteManyResult = await localVectorStore.deleteMany({ businessId });
    console.log(`Delete many result: ${deleteManyResult} vectors deleted`);
    
    // Check that all vectors were deleted
    const afterDeleteAllQuery = await localVectorStore.query({
      vector: new Array(1536).fill(0.1),
      filter: { businessId },
      topK: 10,
      includeMetadata: true
    });
    
    console.log(`After delete all - Found ${afterDeleteAllQuery.matches.length} matches`);
    
    // Final stats
    const finalStats = await localVectorStore.getStats();
    console.log('\nFinal vector store stats:');
    console.log(JSON.stringify(finalStats, null, 2));
    
    console.log('\nTest completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error running test:', error);
    process.exit(1);
  }
}

// Run the test
runTest(); 