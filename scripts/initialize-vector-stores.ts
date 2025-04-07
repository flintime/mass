#!/usr/bin/env ts-node

import dotenv from 'dotenv';
import path from 'path';
import { initializeAllBusinessVectorStores } from '../app/lib/vector-store';

// Load environment variables properly
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Verify that essential environment variables are present
if (!process.env.OPENAI_API_KEY) {
  console.error("ERROR: OPENAI_API_KEY is missing from environment variables!");
  console.error("Please run 'npm run rag:setup' to set up your OpenAI API key");
  process.exit(1);
}

console.log('Starting vector store initialization...');
console.log(`Using API Key: ${process.env.OPENAI_API_KEY.substring(0, 5)}...${process.env.OPENAI_API_KEY.substring(process.env.OPENAI_API_KEY.length - 4)}`);

async function main() {
  try {
    console.log('Initializing vector stores for all businesses...');
    await initializeAllBusinessVectorStores();
    console.log('Vector store initialization completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error during vector store initialization:', error);
    process.exit(1);
  }
}

main(); 