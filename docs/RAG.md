# Retrieval Augmented Generation (RAG) for Flintime Chat

This document provides information on the RAG system implemented for Flintime's chat functionality.

## Overview

The Retrieval Augmented Generation (RAG) system enhances AI responses by retrieving relevant business information from the Feed AI data and using it to generate more accurate, contextual responses to user queries.

## How It Works

1. **Chunking Business Data**: Business information is broken down into semantic chunks (services, FAQs, hours, etc.)
2. **Vector Storage**: These chunks are converted into vector embeddings and stored
3. **Semantic Retrieval**: When a user asks a question, relevant chunks are retrieved based on semantic similarity
4. **Enhanced Generation**: The retrieved content is provided to the AI model as context for generating a response

## Benefits

- **Higher Accuracy**: AI answers based on actual business data rather than general knowledge
- **Token Efficiency**: Only the most relevant business information is included in the context
- **Focused Responses**: More specific, relevant answers to customer queries
- **Reduced Hallucinations**: Less chance of the AI making up information

## Implementation

The RAG system consists of:

1. **Vector Store**: 
   - `app/lib/vector-store.ts` - In-memory implementation
   - `app/lib/rag-pinecone.ts` - Pinecone-based implementation

2. **AI Response Integration**: `app/api/chat/ai-response/route.ts` - Integrates RAG into the chat flow
3. **Auto-Update**: `app/api/business/feed-ai/route.ts` - Updates vector store when Feed AI data changes
4. **Initialization Tools**: 
   - `scripts/initialize-vector-stores.ts` - For in-memory storage
   - `scripts/initialize-pinecone-vectors.ts` - For Pinecone storage

## Storage Options

The system supports two storage options for vector embeddings:

### In-Memory Storage (Default)
- Fast but not persistent
- Resets when server restarts
- Good for development and testing
- No additional infrastructure required

### Pinecone Vector Database
- Persistent storage that survives restarts
- Scalable for large deployments
- Better performance for large datasets
- Requires Pinecone account and API key

## Setup Instructions

1. Set up environment variables:
   ```bash
   npm run rag:setup
   ```
   This will create the `.env` file and prompt you to enter:
   - Your OpenAI API key
   - Your Pinecone API key (if using Pinecone)
   - Your Pinecone index name (if using Pinecone)
   - Whether to use Pinecone for RAG storage

2. Install required dependencies:
   ```bash
   npm run install:rag
   ```

3. Initialize vector stores:
   
   For in-memory storage:
   ```bash
   npm run rag:init
   ```
   
   For Pinecone storage:
   ```bash
   npm run rag:pinecone:init
   ```

4. Test the RAG system:
   ```bash
   npm run rag:test
   ```

5. Restart your development server:
   ```bash
   npm run dev
   ```

## Technical Details

### Vector Embedding

We use OpenAI's `text-embedding-3-small` model to create embeddings of business data chunks. This model provides a good balance of quality and cost efficiency.

### Chunking Strategy

Data is chunked by logical units:
- Each service is a separate chunk
- Each FAQ is a separate chunk
- Business hours form a single chunk
- Business information is its own chunk

This allows for precise retrieval of exactly the information needed for a specific query.

### Caching

The system implements caching mechanisms to improve performance and reduce API costs:
- In-memory implementation: Caches document chunks and embeddings in Node.js process memory
- Pinecone implementation: Uses Pinecone's built-in persistence with a dedicated namespace for RAG data

### Automatic Updates

When a business updates their Feed AI data, the system automatically updates the vector store to ensure the most current information is always available for retrieval.

## Monitoring and Performance

To monitor RAG performance:
- Look for console logs showing retrieved chunks and context lengths
- Check token usage in OpenAI API responses
- Monitor user satisfaction with AI responses

## Troubleshooting

If you encounter issues:
1. Check that all dependencies are installed correctly
2. Verify that the OpenAI API key is set in the `.env` file
3. If using Pinecone, check that the API key and index name are correct
4. Make sure the vector store initialization completed successfully
5. Check for errors in the console logs
6. Ensure OpenAI API keys are valid and have sufficient quota 