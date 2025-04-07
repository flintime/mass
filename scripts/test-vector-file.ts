#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Business ID to check
const businessId = process.env.BUSINESS_ID || '67c550f9946155c8a1630886';

// Vector store directory
const VECTOR_STORE_DIR = path.join(process.cwd(), 'data', 'vector-store');

async function inspectVectorStore() {
  try {
    console.log(`Inspecting vector store for business ${businessId}...\n`);
    
    // Check if directory exists
    if (!fs.existsSync(VECTOR_STORE_DIR)) {
      console.error(`Vector store directory not found at ${VECTOR_STORE_DIR}`);
      return;
    }
    
    // Check if business file exists
    const businessFilePath = path.join(VECTOR_STORE_DIR, `${businessId}.json`);
    if (!fs.existsSync(businessFilePath)) {
      console.error(`No vector file found for business ${businessId}`);
      return;
    }
    
    // Read the file
    const vectorData = JSON.parse(fs.readFileSync(businessFilePath, 'utf8'));
    console.log(`Found ${vectorData.length} vectors for business ${businessId}`);
    
    // Group vectors by type
    const vectorsByType: Record<string, any[]> = {};
    
    for (const vector of vectorData) {
      const type = vector.metadata.type;
      if (!vectorsByType[type]) {
        vectorsByType[type] = [];
      }
      vectorsByType[type].push(vector);
    }
    
    // Display summary
    console.log('\nVector types summary:');
    for (const [type, vectors] of Object.entries(vectorsByType)) {
      console.log(`- ${type}: ${vectors.length} vectors`);
    }
    
    // Display vector details
    console.log('\nVector details:');
    for (const [type, vectors] of Object.entries(vectorsByType)) {
      console.log(`\n## ${type.toUpperCase()} VECTORS (${vectors.length}):`);
      
      for (const vector of vectors) {
        console.log(`ID: ${vector.id}`);
        console.log(`Content: ${vector.metadata.content}`);
        console.log('---');
      }
    }
    
    console.log('\nVector store inspection completed');
  } catch (error) {
    console.error('Error inspecting vector store:', error);
  }
}

// Run the inspection
inspectVectorStore().then(() => {
  console.log('Script execution completed');
}).catch(error => {
  console.error('Script execution failed:', error);
  process.exit(1);
}); 