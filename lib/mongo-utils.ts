import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';

/**
 * Tests a MongoDB connection string directly without using Mongoose
 * @param uri MongoDB connection string
 * @returns Object with test results
 */
export async function testMongoConnection(uri: string) {
  if (!uri) {
    return {
      success: false,
      error: 'No MongoDB URI provided'
    };
  }

  const startTime = Date.now();
  let client: MongoClient | null = null;

  try {
    // Try connecting with the MongoDB driver directly
    client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 30000, // 30 seconds
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });

    // Attempt connection
    await client.connect();
    
    // Try a simple command to verify
    const adminDb = client.db('admin');
    const result = await adminDb.command({ ping: 1 });
    
    const endTime = Date.now();
    
    return {
      success: true,
      connectionTimeMs: endTime - startTime,
      result: result,
      message: 'MongoDB connection successful'
    };
  } catch (error: any) {
    // Detailed error information
    const errorInfo = {
      message: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack?.split('\n')[0]
    };
    
    let diagnostics = 'Unknown error';
    
    // Analyze specific error messages
    if (error.message.includes('authentication failed')) {
      diagnostics = 'Authentication failed. Check your username and password in the connection string.';
    } else if (error.message.includes('ENOTFOUND')) {
      diagnostics = 'Host not found. Check your hostname and DNS settings.';
    } else if (error.message.includes('ETIMEDOUT')) {
      diagnostics = 'Connection timed out. Check network connectivity and firewall settings.';
    } else if (error.message.includes('server selection timeout')) {
      diagnostics = 'Server selection timeout. The MongoDB server might be down or unreachable.';
    } else if (error.message.includes('SSL')) {
      diagnostics = 'SSL/TLS connection issue. Check your TLS/SSL configuration.';
    }
    
    return {
      success: false,
      error: errorInfo,
      diagnostics,
      message: 'MongoDB connection failed'
    };
  } finally {
    // Clean up the connection
    if (client) {
      try {
        await client.close();
      } catch (closeError) {
        console.error('Error closing MongoDB connection:', closeError);
      }
    }
  }
}

/**
 * Returns a human-readable description of the Mongoose connection state
 */
export function getMongooseConnectionState() {
  const state = mongoose.connection.readyState;
  const stateMap: Record<number, string> = {
    0: 'Disconnected',
    1: 'Connected',
    2: 'Connecting',
    3: 'Disconnecting',
    99: 'Uninitialized'
  };
  return {
    readyState: state,
    status: stateMap[state] || 'Unknown',
    host: mongoose.connection.host || 'Not connected',
    name: mongoose.connection.name || 'None',
    models: Object.keys(mongoose.models)
  };
}

// Type for global mongoose cache to avoid TypeScript errors
type GlobalMongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  isConnecting?: boolean;
  lastError?: Error | null;
  connectionAttempts?: number;
};

/**
 * Closes and resets the Mongoose connection
 * Useful for recovering from authentication errors
 */
export async function resetMongooseConnection() {
  try {
    // Only try to close if there's an active connection
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log('Mongoose connection closed successfully');
    }
    
    // Reset global cached values if they exist
    const globalMongoose = (global as any).mongoose as GlobalMongooseCache | undefined;
    if (globalMongoose) {
      globalMongoose.conn = null;
      globalMongoose.promise = null;
      if (globalMongoose.isConnecting !== undefined) {
        globalMongoose.isConnecting = false;
      }
    }
    
    // Clear all models
    Object.keys(mongoose.models).forEach(model => {
      delete mongoose.models[model];
    });
    
    return { success: true, message: 'Mongoose connection reset successfully' };
  } catch (error: any) {
    return { 
      success: false, 
      message: 'Failed to reset Mongoose connection', 
      error: error.message 
    };
  }
} 