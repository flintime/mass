#!/usr/bin/env ts-node
/**
 * Script to test MongoDB connectivity.
 * Run with: npx ts-node scripts/test-mongo-connection.ts
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';
import { testMongoConnection } from '../lib/mongo-utils';
import { promisify } from 'util';
import dns from 'dns';

const dnsLookup = promisify(dns.lookup);

// Helper to extract hostname from MongoDB URI
function extractHostname(uri: string): string | null {
  try {
    const sanitizedUri = uri
      .replace('mongodb://', 'http://')
      .replace('mongodb+srv://', 'http://');
    
    const url = new URL(sanitizedUri);
    return url.hostname;
  } catch (error) {
    console.error('Failed to extract hostname from URI:', error);
    return null;
  }
}

// Helper to test DNS resolution
async function testDns(hostname: string) {
  try {
    console.log(`🔍 Testing DNS resolution for ${hostname}...`);
    const result = await dnsLookup(hostname);
    console.log(`✅ DNS resolution successful: ${hostname} -> ${result.address}`);
    return { success: true, address: result.address };
  } catch (error: any) {
    console.error(`❌ DNS resolution failed for ${hostname}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Helper to test raw TCP connection
async function testTcpConnection(hostname: string, port: number) {
  const net = require('net');
  return new Promise((resolve) => {
    console.log(`🔌 Testing TCP connection to ${hostname}:${port}...`);
    const socket = new net.Socket();
    
    // Set a timeout (5 seconds)
    socket.setTimeout(5000);
    
    socket.on('connect', () => {
      console.log(`✅ TCP connection successful to ${hostname}:${port}`);
      socket.destroy();
      resolve({ success: true });
    });
    
    socket.on('timeout', () => {
      console.error(`❌ TCP connection timeout to ${hostname}:${port}`);
      socket.destroy();
      resolve({ success: false, error: 'Connection timeout' });
    });
    
    socket.on('error', (error: any) => {
      console.error(`❌ TCP connection failed to ${hostname}:${port}: ${error.message}`);
      resolve({ success: false, error: error.message });
    });
    
    socket.connect(port, hostname);
  });
}

async function main() {
  console.log('🔄 MongoDB Connection Test');
  console.log('=========================');
  
  // Check if MONGODB_URI is defined
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI environment variable is not defined');
    process.exit(1);
  }
  
  console.log(`📝 Using MongoDB URI: ${uri.substring(0, 12)}...${uri.substring(uri.length - 12)}`);
  
  // Extract hostname and port for network tests
  const hostname = extractHostname(uri);
  const isAtlasConnection = uri.includes('mongodb+srv://') || hostname?.includes('mongodb.net');
  const port = isAtlasConnection ? 27017 : 27017; // Default MongoDB port
  
  // Step 1: Test DNS resolution
  if (hostname) {
    await testDns(hostname);
    
    // Step 2: Test TCP connection
    await testTcpConnection(hostname, port);
  }
  
  // Step 3: Test MongoDB direct connection
  console.log('\n🧪 Testing MongoDB direct connection...');
  try {
    const startTime = Date.now();
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000
    });
    
    await client.connect();
    const endTime = Date.now();
    
    console.log(`✅ MongoDB direct connection successful (${endTime - startTime}ms)`);
    
    // Try a simple command
    const adminDb = client.db('admin');
    await adminDb.command({ ping: 1 });
    console.log('✅ MongoDB server ping successful');
    
    await client.close();
  } catch (error: any) {
    console.error('❌ MongoDB direct connection failed:', error.message);
    if (error.name === 'MongoServerSelectionError') {
      console.error('   This could indicate network issues or incorrect server address');
    } else if (error.message.includes('authentication failed')) {
      console.error('   This indicates incorrect username or password in connection string');
    }
  }
  
  // Step 4: Test Mongoose connection
  console.log('\n🧪 Testing Mongoose connection...');
  try {
    const startTime = Date.now();
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000
    });
    const endTime = Date.now();
    
    console.log(`✅ Mongoose connection successful (${endTime - startTime}ms)`);
    console.log(`✅ Connected to database: ${mongoose.connection.name}`);
    
    await mongoose.connection.close();
    console.log('✅ Mongoose connection closed successfully');
  } catch (error: any) {
    console.error('❌ Mongoose connection failed:', error.message);
  }
  
  // Step 5: Use the utility function for a consolidated test
  console.log('\n🧪 Running consolidated MongoDB test...');
  const testResult = await testMongoConnection(uri);
  if (testResult.success) {
    console.log(`✅ Consolidated test successful (${testResult.connectionTimeMs}ms)`);
  } else {
    console.error('❌ Consolidated test failed:');
    console.error(`   Reason: ${testResult.diagnostics}`);
    if (typeof testResult.error === 'object' && testResult.error && 'message' in testResult.error) {
      console.error(`   Error: ${testResult.error.message}`);
    } else if (typeof testResult.error === 'string') {
      console.error(`   Error: ${testResult.error}`);
    }
  }
  
  console.log('\n📋 Connection Test Complete');
}

// Execute the main function
main().catch(error => {
  console.error('Unhandled error in main execution:', error);
  process.exit(1);
}); 