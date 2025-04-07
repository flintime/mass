import { searchBusinesses } from '../app/lib/embeddings';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testVectorSearch() {
  try {
    console.log('Starting vector search test...');

    // Get search query from command line arguments or use default
    const searchQuery = process.argv[2] || 'hair salon that offers highlights and coloring';
    console.log(`Search query: "${searchQuery}"`);

    // Perform search
    console.log('Executing vector search...');
    const results = await searchBusinesses(searchQuery);

    console.log('Search results:');
    results.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.business_name} (score: ${result.relevance_score.toFixed(2)})`);
      console.log(`   Category: ${result.Business_Category}`);
      console.log(`   Description: ${result.description?.substring(0, 100)}...`);
      if (result.ai_explanation) {
        console.log(`   AI Explanation: ${result.ai_explanation}`);
      }
      if (result.matches_requirements && result.matches_requirements.length > 0) {
        console.log(`   Matched Requirements: ${result.matches_requirements.join(', ')}`);
      }
    });

    console.log(`\nFound ${results.length} results for "${searchQuery}"`);
  } catch (error) {
    console.error('Error testing vector search:', error);
    process.exit(1);
  }
}

// Run the test
testVectorSearch(); 