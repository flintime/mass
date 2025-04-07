import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env');
}

interface GlobalMongoose {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: GlobalMongoose;
}

if (!global.mongoose) {
  global.mongoose = {
    conn: null,
    promise: null
  };
}

/**
 * Connect to MongoDB with retry mechanism
 * @param retryAttempt Current retry attempt number
 * @param maxRetries Maximum number of retries
 * @returns Mongoose connection
 */
async function dbConnect(retryAttempt = 0, maxRetries = 3): Promise<typeof mongoose> {
  // If we already have a connection, use it
  if (global.mongoose.conn) {
    console.log('Using existing database connection');
    return global.mongoose.conn;
  }

  // Try to use an existing connecting promise
  if (global.mongoose.promise) {
    try {
      console.log('Waiting for existing database connection promise...');
      global.mongoose.conn = await global.mongoose.promise;
      console.log('Database connection established via existing promise');
      return global.mongoose.conn;
    } catch (e) {
      console.error('Error connecting to database:', e);
      global.mongoose.promise = null;
      // Don't throw yet, we'll retry below
    }
  }

  // Connection options with increased timeouts
  const opts = {
    bufferCommands: false,
    serverSelectionTimeoutMS: 30000, // Increase timeout to 30 seconds
    socketTimeoutMS: 45000, // Increase socket timeout to 45 seconds
    connectTimeoutMS: 30000, // Increase connection timeout to 30 seconds
    maxPoolSize: 10, // Limit the number of connections in the pool
    maxIdleTimeMS: 30000, // Close idle connections after 30 seconds
  };

  try {
    console.log(`Creating new database connection (attempt ${retryAttempt + 1}/${maxRetries + 1})...`);
    global.mongoose.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
      console.log('Connected to MongoDB successfully');
      return mongoose;
    });

    global.mongoose.conn = await global.mongoose.promise;
    console.log('Database connection established');
    return global.mongoose.conn;
  } catch (e: any) {
    console.error(`Database connection attempt ${retryAttempt + 1} failed:`, e);
    global.mongoose.promise = null;

    // Retry logic with exponential backoff
    if (retryAttempt < maxRetries) {
      const backoffMs = Math.min(Math.pow(2, retryAttempt) * 1000, 10000); // Max 10 second backoff
      console.log(`Retrying database connection in ${backoffMs}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, backoffMs));
      return dbConnect(retryAttempt + 1, maxRetries);
    }

    console.error('All database connection attempts failed');
    throw e;
  }
}

export default dbConnect; 