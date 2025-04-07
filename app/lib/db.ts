import mongoose from 'mongoose';
import { config } from 'dotenv';
import path from 'path';

// Load from both .env and .env.local
config({ path: path.resolve(process.cwd(), '.env') });
config({ path: path.resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

// Log the first 10 characters of the URI (hiding sensitive info)
const uriStart = MONGODB_URI.substring(0, 10) + '...';
console.log(`MongoDB URI configured: ${uriStart}`);

interface GlobalMongoose {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  isConnecting: boolean;
  lastError: Error | null;
  connectionAttempts: number;
}

declare global {
  var mongoose: GlobalMongoose;
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { 
    conn: null, 
    promise: null, 
    isConnecting: false, 
    lastError: null,
    connectionAttempts: 0
  };
}

// Set mongoose options at the module level
// This avoids the "buffering timed out after 10000ms" error
mongoose.set('bufferCommands', false); // Disable command buffering
mongoose.set('autoCreate', false); // Don't create indexes automatically
mongoose.set('strictQuery', true); // Strict mode for queries

async function dbConnect(retryAttempt = 0, maxRetries = 5): Promise<typeof mongoose> {
  // If already connected, return existing connection
  if (cached.conn && mongoose.connection.readyState === 1) {
    console.log('Using existing active database connection');
    return cached.conn;
  }

  // Reset connection if it's in a failed state
  if (mongoose.connection.readyState === 0 && cached.conn) {
    console.log('Previous connection is closed, creating new connection');
    cached.conn = null;
    cached.promise = null;
  }

  // If already connecting, wait for that promise
  if (cached.isConnecting && cached.promise) {
    try {
      console.log('Already connecting to database, waiting for connection...');
      cached.conn = await cached.promise;
      console.log('Successfully connected via existing promise');
      return cached.conn;
    } catch (error) {
      console.error('Error from existing connection promise:', error);
      cached.promise = null;
      cached.isConnecting = false;
    }
  }

  // Set connecting flag
  cached.isConnecting = true;
  cached.connectionAttempts++;
  
  console.log(`Creating new database connection (attempt ${retryAttempt + 1}/${maxRetries + 1}, total: ${cached.connectionAttempts})...`);
  
  // Connection options with increased timeouts
  const opts = {
    bufferCommands: false, // Don't buffer commands - fail fast
    bufferTimeoutMS: 30000, // Increase buffer timeout to 30 seconds (just in case)
    serverSelectionTimeoutMS: 120000, // 2 minutes
    socketTimeoutMS: 120000, // 2 minutes
    connectTimeoutMS: 120000, // 2 minutes
    maxPoolSize: 20, // Increase from 10 to 20
    minPoolSize: 5, // Increase from 2 to 5
    maxIdleTimeMS: 60000, // 1 minute
    autoCreate: false, // Don't automatically create indexes
    autoIndex: false, // Don't automatically create indexes
  };

  try {
    console.log('Connecting to MongoDB with options:', JSON.stringify(opts, null, 2));
    
    // First check the mongoose state and attempt to clear any stale connections
    if (mongoose.connection.readyState !== 0) {
      console.log(`Closing existing mongoose connection (state: ${mongoose.connection.readyState})`);
      await mongoose.connection.close();
    }
    
    // Wrap connect in a promise with its own timeout
    cached.promise = new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('MongoDB connection timeout after 120 seconds'));
      }, 120000);

      try {
        const conn = await mongoose.connect(MONGODB_URI!, opts);
        clearTimeout(timeoutId);
        console.log('MongoDB connected successfully');
        resolve(conn);
      } catch (err) {
        clearTimeout(timeoutId);
        reject(err);
      }
    });

    cached.conn = await cached.promise;
    cached.isConnecting = false;
    cached.lastError = null;
    
    // Test the connection with a simple query to ensure it's working
    console.log('Testing MongoDB connection with a ping...');
    if (mongoose.connection.db) {
      const admin = mongoose.connection.db.admin();
      const pingResult = await admin.ping();
      console.log('MongoDB ping result:', pingResult);
    } else {
      console.warn('Cannot ping database: connection.db is undefined');
    }
    
    return cached.conn;
  } catch (error: any) {
    cached.isConnecting = false;
    cached.lastError = error;
    
    console.error(`MongoDB connection attempt ${retryAttempt + 1} failed:`, {
      error: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack?.split('\n').slice(0, 3).join('\n')
    });

    // Check for specific errors
    if (error.name === 'MongoServerSelectionError') {
      console.error('MongoDB server selection failed. Server may be down or unreachable.');
    } else if (error.name === 'MongoNetworkError') {
      console.error('MongoDB network error. Check your network connection and MongoDB URI.');
    }

    // Reset the promise
    cached.promise = null;

    // Retry logic with exponential backoff
    if (retryAttempt < maxRetries) {
      const backoffMs = Math.min(Math.pow(2, retryAttempt) * 1000, 30000); // Max 30 second backoff
      console.log(`Retrying database connection in ${backoffMs}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, backoffMs));
      return dbConnect(retryAttempt + 1, maxRetries);
    }

    console.error(`All ${maxRetries + 1} database connection attempts failed. Last error:`, error.message);
    throw new Error(`MongoDB connection failed after ${maxRetries + 1} attempts: ${error.message}`);
  }
}

// Enhanced connection event listeners with more details
mongoose.connection.on('connected', () => {
  console.log(`MongoDB connected successfully to ${MONGODB_URI?.substring(0, 10)}...`);
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', {
    message: err.message,
    code: (err as any).code,
    name: err.name
  });
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
  // Reset connection objects when disconnected
  if (cached) {
    cached.conn = null;
    cached.isConnecting = false;
  }
});

mongoose.connection.on('reconnected', () => {
  console.log('MongoDB reconnected successfully');
});

// Handle app termination
process.on('SIGINT', async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
    console.log('MongoDB connection closed due to app termination');
  }
  process.exit(0);
});

// Also handle nodemon restarts
process.once('SIGUSR2', async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
    console.log('MongoDB connection closed due to nodemon restart');
  }
  process.kill(process.pid, 'SIGUSR2');
});

export default dbConnect; 