/**
 * This script sets up the environment variables for the RAG system.
 * Usage: npm run rag:setup
 */

const fs = require('fs');
const readline = require('readline');
const { spawn } = require('child_process');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log("Setting up environment for RAG system...");

// Check if .env file exists, create if not
if (!fs.existsSync('.env')) {
  console.log("Creating .env file...");
  fs.writeFileSync('.env', '');
}

// Read current .env file
let envContent = fs.readFileSync('.env', 'utf8');

// Function to check if key exists in .env
function hasEnvVar(key) {
  return new RegExp(`^${key}=`, 'm').test(envContent);
}

// Function to update .env file
function updateEnvFile(key, value) {
  if (hasEnvVar(key)) {
    // Replace existing key
    envContent = envContent.replace(
      new RegExp(`^${key}=.*$`, 'm'),
      `${key}=${value}`
    );
  } else {
    // Add new key
    envContent += `\n${key}=${value}`;
  }
  fs.writeFileSync('.env', envContent);
}

// Check and setup OpenAI API key
function setupOpenAIKey() {
  return new Promise((resolve) => {
    if (!hasEnvVar('OPENAI_API_KEY')) {
      rl.question('Enter your OpenAI API key: ', (key) => {
        if (key) {
          updateEnvFile('OPENAI_API_KEY', key);
          console.log('OpenAI API key saved to .env file');
        } else {
          console.warn('No OpenAI API key provided. You will need to set this manually.');
        }
        resolve();
      });
    } else {
      console.log('OpenAI API key already exists in .env file');
      resolve();
    }
  });
}

// Check and setup Pinecone API key
function setupPineconeKey() {
  return new Promise((resolve) => {
    if (!hasEnvVar('PINECONE_API_KEY')) {
      rl.question('Enter your Pinecone API key: ', (key) => {
        if (key) {
          updateEnvFile('PINECONE_API_KEY', key);
          console.log('Pinecone API key saved to .env file');
        } else {
          console.warn('No Pinecone API key provided. You will need to set this manually.');
        }
        resolve();
      });
    } else {
      console.log('Pinecone API key already exists in .env file');
      resolve();
    }
  });
}

// Check and setup Pinecone index
function setupPineconeIndex() {
  return new Promise((resolve) => {
    if (!hasEnvVar('PINECONE_INDEX')) {
      rl.question('Enter your Pinecone index name: ', (index) => {
        if (index) {
          updateEnvFile('PINECONE_INDEX', index);
          console.log('Pinecone index saved to .env file');
        } else {
          console.warn('No Pinecone index provided. You will need to set this manually.');
        }
        resolve();
      });
    } else {
      console.log('Pinecone index already exists in .env file');
      resolve();
    }
  });
}

// Setup USE_PINECONE_RAG flag
function setupUsePineconeRag() {
  return new Promise((resolve) => {
    if (!hasEnvVar('USE_PINECONE_RAG')) {
      rl.question('Do you want to use Pinecone for RAG? (y/n): ', (answer) => {
        const usePinecone = answer.toLowerCase() === 'y';
        updateEnvFile('USE_PINECONE_RAG', usePinecone.toString());
        console.log(`USE_PINECONE_RAG set to ${usePinecone}`);
        resolve();
      });
    } else {
      console.log('USE_PINECONE_RAG already exists in .env file');
      resolve();
    }
  });
}

// Run the setup
async function runSetup() {
  await setupOpenAIKey();
  await setupPineconeKey();
  await setupPineconeIndex();
  await setupUsePineconeRag();
  
  console.log("\nEnvironment setup complete!");
  console.log("\nNext steps:");
  console.log("1. Install dependencies: npm run install:rag");
  console.log("2. Initialize Pinecone for RAG: npm run rag:pinecone:init");
  console.log("3. Restart your server: npm run dev");
  
  rl.close();
}

runSetup(); 