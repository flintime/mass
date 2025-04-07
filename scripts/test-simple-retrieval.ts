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

// Simple keyword-based retrieval function
function simpleRetrieve(businessId: string, query: string, limit: number = 3) {
  try {
    // Check if business file exists
    const businessFilePath = path.join(VECTOR_STORE_DIR, `${businessId}.json`);
    if (!fs.existsSync(businessFilePath)) {
      console.error(`No vector file found for business ${businessId}`);
      return [];
    }
    
    // Read the file
    const vectors = JSON.parse(fs.readFileSync(businessFilePath, 'utf8'));
    
    // Prepare query for matching
    const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 2);
    
    // Score each vector based on keyword matches
    const scoredVectors = vectors.map((vector: any) => {
      const content = vector.metadata.content.toLowerCase();
      
      // Calculate a simple score based on word matches
      let score = 0;
      for (const word of queryWords) {
        if (content.includes(word)) {
          score += 1;
        }
      }
      
      // Boost score for certain vector types based on query
      if (query.includes('hour') && vector.metadata.type === 'business_hours') {
        score += 3;
      }
      if (query.includes('service') && vector.metadata.type === 'service') {
        score += 3;
      }
      if (query.includes('contact') && vector.metadata.type === 'contact_info') {
        score += 3;
      }
      if (query.includes('payment') && vector.metadata.type === 'payment_methods') {
        score += 3;
      }
      if (query.includes('promotion') && vector.metadata.type === 'promotion') {
        score += 3;
      }
      
      return {
        ...vector,
        score
      };
    });
    
    // Sort by score (descending) and take top results
    scoredVectors.sort((a: any, b: any) => b.score - a.score);
    return scoredVectors.slice(0, limit);
  } catch (error) {
    console.error('Error in simple retrieval:', error);
    return [];
  }
}

// Format retrieved chunks into context
function formatChunksForContext(chunks: any[]): string {
  if (chunks.length === 0) return '';
  
  // Group chunks by type for better organization
  const chunksByType: Record<string, any[]> = {};
  
  chunks.forEach(chunk => {
    const type = chunk.metadata.type;
    if (!chunksByType[type]) {
      chunksByType[type] = [];
    }
    chunksByType[type].push(chunk);
  });
  
  // Format each section
  let formattedContext = '';
  
  // Add business info first if available
  if (chunksByType['basic_info']) {
    formattedContext += `## BUSINESS INFORMATION\n${chunksByType['basic_info'][0].metadata.content}\n\n`;
  }
  
  // Add contact info
  if (chunksByType['contact_info']) {
    formattedContext += `## CONTACT INFORMATION\n${chunksByType['contact_info'][0].metadata.content}\n\n`;
  }
  
  // Add services
  if (chunksByType['service']) {
    formattedContext += `## SERVICES\n${chunksByType['service'].map(doc => doc.metadata.content).join('\n\n')}\n\n`;
  }
  
  // Add business hours
  if (chunksByType['business_hours']) {
    formattedContext += `## BUSINESS HOURS\n${chunksByType['business_hours'][0].metadata.content}\n\n`;
  }
  
  // Add promotions
  if (chunksByType['promotion']) {
    formattedContext += `## PROMOTIONS\n${chunksByType['promotion'].map(doc => doc.metadata.content).join('\n\n')}\n\n`;
  }
  
  // Add FAQs
  if (chunksByType['faq']) {
    formattedContext += `## FREQUENTLY ASKED QUESTIONS\n${chunksByType['faq'].map(doc => doc.metadata.content).join('\n\n')}\n\n`;
  }
  
  // Add payment methods
  if (chunksByType['payment_methods']) {
    formattedContext += `## PAYMENT METHODS\n${chunksByType['payment_methods'][0].metadata.content}\n\n`;
  }
  
  return formattedContext.trim();
}

async function testSimpleRetrieval() {
  try {
    console.log(`Testing simple retrieval for business ${businessId}...\n`);
    
    // Test queries
    const queries = [
      'What services do you offer?',
      'What are your business hours?',
      'How can I contact you?',
      'Do you have any promotions?',
      'What payment methods do you accept?'
    ];
    
    // Run each query
    for (const query of queries) {
      console.log(`\nQuery: "${query}"`);
      const results = simpleRetrieve(businessId, query, 3);
      console.log(`Found ${results.length} results:`);
      
      if (results.length > 0) {
        results.forEach((result: any, index: number) => {
          console.log(`\nResult #${index + 1} (score: ${result.score})`);
          console.log(`Type: ${result.metadata.type}`);
          console.log('Content:', result.metadata.content);
        });
        
        // Format as context
        console.log('\nFormatted context:');
        console.log(formatChunksForContext(results));
      } else {
        console.log('No results found');
      }
    }
    
    console.log('\nTest completed successfully');
  } catch (error) {
    console.error('Error during test:', error);
  }
}

// Run the test
testSimpleRetrieval().then(() => {
  console.log('Script execution completed');
}).catch(error => {
  console.error('Script execution failed:', error);
  process.exit(1);
}); 