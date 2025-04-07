import { redis, cacheSearchResults, getCachedSearchResults, trackPopularSearch, getPopularSearches } from '../app/lib/redis';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testRedis() {
  try {
    console.log('Testing Redis connection and caching...');

    // Test basic connection
    await redis.ping();
    console.log('Successfully connected to Redis');

    // Test caching search results
    const testQuery = 'test search query';
    const testResults = [
      {
        id: '1',
        business_name: 'Test Business 1',
        description: 'Test description 1',
        Business_Category: 'Test Category',
        Business_Subcategories: ['Sub 1', 'Sub 2'],
        business_features: ['Feature 1'],
        images: [{ url: 'test.jpg' }],
        address: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zip_code: '12345',
        phone: '123-456-7890',
        email: 'test@test.com'
      }
    ];

    console.log('\nTesting search results caching...');
    await cacheSearchResults(testQuery, testResults);
    console.log('Successfully cached test search results');

    const cachedResults = await getCachedSearchResults(testQuery);
    console.log('Retrieved cached results:', 
      cachedResults ? 'Success' : 'Not found'
    );

    if (JSON.stringify(cachedResults) === JSON.stringify(testResults)) {
      console.log('Cached data matches original data');
    } else {
      console.log('Warning: Cached data does not match original data');
    }

    // Test popular searches tracking
    console.log('\nTesting popular searches tracking...');
    await trackPopularSearch('haircut');
    await trackPopularSearch('plumber');
    await trackPopularSearch('haircut');
    await trackPopularSearch('electrician');
    await trackPopularSearch('haircut');

    const popularSearches = await getPopularSearches(5);
    console.log('Popular searches:', popularSearches);

    console.log('\nAll Redis tests completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error testing Redis:', error);
    process.exit(1);
  }
}

// Run the test
testRedis(); 