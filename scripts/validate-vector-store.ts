/**
 * Vector Store Validation Script
 * 
 * This script validates the local vector store setup and data,
 * and performs a test search to verify everything is working correctly.
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { initVectorStore, getEmbedding } from '../app/lib/local-vector-store';
import { vectorStore } from '../app/lib/vector-store';

// Load environment variables
dotenv.config();

// Define vector store directory
const VECTOR_STORE_DIR = process.env.VECTOR_STORAGE_DIR || path.join(process.cwd(), 'data', 'vector-store');

// Connect to MongoDB (needed for some operations)
async function connectToMongoDB() {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('[Validation] Connected to MongoDB');
  }
}

// Check if OpenAI API key is set
function checkOpenAIKey() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('[Validation] ERROR: OPENAI_API_KEY is missing from environment variables');
    console.error('[Validation] Vector search with embeddings will not work without a valid API key');
    return false;
  }
  
  console.log('[Validation] OPENAI_API_KEY is set');
  console.log(`[Validation] API Key: ${process.env.OPENAI_API_KEY.substring(0, 5)}...${process.env.OPENAI_API_KEY.substring(process.env.OPENAI_API_KEY.length - 4)}`);
  return true;
}

// Check vector store directory
function checkVectorStoreDirectory() {
  try {
    if (!fs.existsSync(VECTOR_STORE_DIR)) {
      console.error(`[Validation] Vector store directory doesn't exist: ${VECTOR_STORE_DIR}`);
      return false;
    }
    
    console.log(`[Validation] Vector store directory exists: ${VECTOR_STORE_DIR}`);
    
    const files = fs.readdirSync(VECTOR_STORE_DIR);
    const businessFiles = files.filter(file => file.endsWith('.json') && !file.startsWith('.'));
    
    console.log(`[Validation] Found ${businessFiles.length} business vector files`);
    
    if (businessFiles.length === 0) {
      console.error('[Validation] No business vector files found. Run sync script to populate data.');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('[Validation] Error checking vector store directory:', error);
    return false;
  }
}

// Verify OpenAI embeddings
async function testEmbeddings() {
  try {
    console.log('[Validation] Testing OpenAI embeddings...');
    const embedding = await getEmbedding('Test embedding');
    console.log(`[Validation] Successfully generated embedding with ${embedding.length} dimensions`);
    return true;
  } catch (error) {
    console.error('[Validation] Error generating embedding:', error);
    return false;
  }
}

// Test search functionality
async function testSearch() {
  try {
    // Get a business ID from the vector store
    const files = fs.readdirSync(VECTOR_STORE_DIR);
    const businessFiles = files.filter(file => file.endsWith('.json') && !file.startsWith('.'));
    
    if (businessFiles.length === 0) {
      console.error('[Validation] No business files found for testing search');
      return false;
    }
    
    const businessId = businessFiles[0].replace('.json', '');
    console.log(`[Validation] Testing search for business ID: ${businessId}`);
    
    // Perform a test search
    const results = await vectorStore.retrieveRelevant(businessId, 'test query', 3);
    
    console.log(`[Validation] Search returned ${results.length} results`);
    
    if (results.length > 0) {
      console.log('[Validation] Sample result:');
      console.log('- Type:', results[0].metadata.type);
      console.log('- Score:', results[0].metadata.score);
      console.log('- Content (trimmed):', results[0].pageContent.substring(0, 100) + '...');
    }
    
    return true;
  } catch (error) {
    console.error('[Validation] Error testing search:', error);
    return false;
  }
}

// Main validation function
async function validateVectorStore() {
  console.log('=== Vector Store Validation ===');
  console.log('Checking environment and configuration...');
  
  // Check OpenAI API key
  const hasValidApiKey = checkOpenAIKey();
  
  // Check vector store directory
  const hasValidDirectory = checkVectorStoreDirectory();
  
  // Initialize vector store
  console.log('Initializing vector store...');
  await initVectorStore();
  
  // Connect to MongoDB if needed
  await connectToMongoDB();
  
  // Test embeddings if API key is valid
  let embeddingsWork = false;
  if (hasValidApiKey) {
    embeddingsWork = await testEmbeddings();
  }
  
  // Test search
  const searchWorks = await testSearch();
  
  // Summary
  console.log('\n=== Validation Summary ===');
  console.log(`OpenAI API Key: ${hasValidApiKey ? '✅ Valid' : '❌ Invalid or missing'}`);
  console.log(`Vector Store Directory: ${hasValidDirectory ? '✅ Valid' : '❌ Invalid or missing'}`);
  console.log(`OpenAI Embeddings: ${embeddingsWork ? '✅ Working' : '❌ Not working'}`);
  console.log(`Vector Search: ${searchWorks ? '✅ Working' : '❌ Not working'}`);
  
  if (!hasValidApiKey || !hasValidDirectory || !embeddingsWork || !searchWorks) {
    console.log('\n⚠️ Some validations failed. Search may not work correctly.');
    console.log('Please address the issues above to ensure proper search functionality.');
  } else {
    console.log('\n✅ All validations passed! Vector store is properly configured and working.');
  }
}

// Run validation
validateVectorStore()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Validation failed with error:', error);
    process.exit(1);
  }); 