import { generateOfflineEmbeddings } from '../app/lib/offline-embeddings';
import { redis } from '../app/lib/redis';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  try {
    console.log('Starting offline embeddings generation process...');

    // Generate embeddings for common patterns
    await generateOfflineEmbeddings();

    console.log('Offline embeddings generation completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error generating offline embeddings:', error);
    process.exit(1);
  } finally {
    // Close Redis connection
    await redis.quit();
  }
}

// Run the script
main(); 