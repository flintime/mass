#!/usr/bin/env ts-node

import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import { retrieveRelevantChunks, formatChunksForContext } from '../app/lib/vector-store';
import readline from 'readline';

// Load environment variables properly
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Verify that essential environment variables are present
if (!process.env.OPENAI_API_KEY) {
  console.error("ERROR: OPENAI_API_KEY is missing from environment variables!");
  console.error("Please run 'npm run rag:setup' to set up your OpenAI API key");
  process.exit(1);
}

console.log('RAG Test Environment:');
console.log(`Using API Key: ${process.env.OPENAI_API_KEY.substring(0, 5)}...${process.env.OPENAI_API_KEY.substring(process.env.OPENAI_API_KEY.length - 4)}`);

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function connectToDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to MongoDB successfully.');
    
    // Check if the connection has a db property
    if (!mongoose.connection.db) {
      console.error('Database connection established but db property is undefined.');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
}

async function retrieveBusiness() {
  try {
    // Ensure we have a database connection
    if (!mongoose.connection.db) {
      throw new Error('Database connection not established');
    }
    
    // Get first business for testing
    const business = await mongoose.connection.db
      .collection('businesses')
      .findOne({});
    
    if (!business) {
      console.error('No businesses found in the database.');
      process.exit(1);
    }
    
    return business;
  } catch (error) {
    console.error('Error retrieving business:', error);
    process.exit(1);
  }
}

async function testRAG(businessId: string) {
  console.log(`\nTesting RAG for business ID: ${businessId}`);
  console.log('Enter a query to test retrieval, or type "exit" to quit.\n');
  
  // Prompt user for a query
  function promptUser() {
    rl.question('Query: ', async (query) => {
      if (query.toLowerCase() === 'exit') {
        console.log('Exiting...');
        await mongoose.disconnect();
        process.exit(0);
      }
      
      try {
        console.log(`\nRetrieving chunks for query: "${query}"`);
        const startTime = Date.now();
        const chunks = await retrieveRelevantChunks(businessId, query, 5);
        const endTime = Date.now();
        
        console.log(`\nRetrieved ${chunks.length} chunks in ${endTime - startTime}ms.`);
        
        if (chunks.length === 0) {
          console.log('No relevant chunks found.');
        } else {
          console.log('\n--- RETRIEVED CHUNKS ---');
          chunks.forEach((chunk, index) => {
            console.log(`\n[Chunk ${index + 1}] (${chunk.metadata.type})`);
            console.log(chunk.pageContent);
          });
          
          console.log('\n--- FORMATTED CONTEXT ---');
          const formattedContext = formatChunksForContext(chunks);
          console.log(formattedContext);
        }
      } catch (error) {
        console.error('Error during retrieval:', error);
      }
      
      console.log('\n----------------------------------------\n');
      promptUser(); // Prompt again for next query
    });
  }
  
  promptUser();
}

async function main() {
  try {
    await connectToDatabase();
    const business = await retrieveBusiness();
    await testRAG(business._id.toString());
  } catch (error) {
    console.error('Error in main execution:', error);
    process.exit(1);
  }
}

main(); 