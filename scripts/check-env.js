#!/usr/bin/env node

const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

console.log('Checking environment variables for RAG system...');

// Find and load .env file
const envPath = path.resolve(process.cwd(), '.env');
console.log(`Looking for .env file at: ${envPath}`);

if (fs.existsSync(envPath)) {
  console.log('.env file found!');
  
  // Read raw file to check content format
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  // Check if it contains OPENAI_API_KEY
  if (envContent.includes('OPENAI_API_KEY')) {
    console.log('OPENAI_API_KEY entry found in .env file');
    
    // Check format
    const keyMatch = envContent.match(/OPENAI_API_KEY=([^\n]+)/);
    if (keyMatch) {
      const key = keyMatch[1];
      console.log(`API Key format: ${key.substring(0, 5)}...${key.substring(key.length - 4)}`);
    } else {
      console.log('Warning: OPENAI_API_KEY found but format may be incorrect');
    }
  } else {
    console.log('Warning: OPENAI_API_KEY not found in .env file');
  }
  
  // Load environment variables
  const result = dotenv.config({ path: envPath });
  
  if (result.error) {
    console.error('Error loading .env file:', result.error);
  } else {
    console.log('.env file loaded successfully');
  }
  
  // Check if OPENAI_API_KEY is accessible through process.env
  if (process.env.OPENAI_API_KEY) {
    console.log(`OPENAI_API_KEY loaded successfully: ${process.env.OPENAI_API_KEY.substring(0, 5)}...${process.env.OPENAI_API_KEY.substring(process.env.OPENAI_API_KEY.length - 4)}`);
  } else {
    console.log('Warning: OPENAI_API_KEY not available in process.env after loading .env file');
  }
} else {
  console.log('Warning: .env file not found at expected location');
}

// Check env directly
console.log('\nChecking process.env directly:');
console.log(`OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? 'Present' : 'Missing'}`);
console.log(`MONGODB_URI: ${process.env.MONGODB_URI ? 'Present' : 'Missing'}`);

// List all environment variables starting with OPENAI
console.log('\nAll OPENAI-related environment variables:');
Object.keys(process.env)
  .filter(key => key.startsWith('OPENAI'))
  .forEach(key => {
    const value = process.env[key];
    console.log(`${key}: ${value.substring(0, 3)}...${value.substring(value.length - 3)}`);
  });

console.log('\nEnvironment check complete!'); 