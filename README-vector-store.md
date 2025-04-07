# Vector Store Implementation

This document describes the vector store implementation for the FlintimeInc application.

## Overview

The vector store is used to store and retrieve business data for AI-powered features like chat and search. It supports two modes of operation:

1. **Embedding-based retrieval**: Uses OpenAI embeddings to find semantically similar content
2. **Keyword-based fallback**: Uses simple keyword matching when OpenAI API is not available

## Components

### 1. Vector Store Adapter (`app/lib/vector-store.ts`)

The main interface for interacting with the vector store. It provides methods for:

- Storing documents
- Retrieving relevant documents
- Deleting business data
- Getting statistics

The adapter automatically detects when OpenAI API is unavailable and switches to the fallback implementation.

### 2. Local Vector Store (`app/lib/local-vector-store.ts`)

Implements a file-based vector store that stores vectors in JSON files. Each business has its own file in the `data/vector-store` directory.

Features:
- Embedding-based similarity search
- File-based persistence
- In-memory caching for performance

### 3. Fallback Implementation (`app/lib/local-vector-store-fallback.ts`)

Provides a keyword-based retrieval mechanism that works without requiring OpenAI embeddings. It's used automatically when OpenAI API is unavailable.

Features:
- Simple keyword matching
- Type-based boosting (e.g., boosting service results for service-related queries)
- Compatible with the same vector store files

## Data Structure

Each vector in the store contains:
- `id`: A unique identifier for the vector
- `values`: The embedding values (or dummy values for fallback)
- `metadata`: Information about the vector, including:
  - `businessId`: The ID of the business
  - `type`: The type of data (e.g., service, contact_info, etc.)
  - `source`: The source of the data
  - `content`: The actual text content

## Usage

### Storing Documents

```typescript
const result = await vectorStore.storeDocument(document, embedding);
```

### Retrieving Documents

```typescript
const results = await vectorStore.retrieveRelevant(businessId, queryText, limit);
```

### Deleting Business Data

```typescript
const result = await vectorStore.deleteBusinessData(businessId);
```

### Getting Statistics

```typescript
const stats = await vectorStore.getStats();
```

## Test Scripts

Several test scripts are available to verify the vector store functionality:

- `scripts/test-local-vector-query.ts`: Tests the local vector store query functionality
- `scripts/test-vector-file.ts`: Inspects the vector store files directly
- `scripts/test-simple-retrieval.ts`: Tests the simple keyword-based retrieval
- `scripts/test-fallback-retrieval.ts`: Tests the fallback retrieval mechanism
- `scripts/generate-test-vectors.ts`: Generates test vectors for a business

## Fallback Mechanism

The fallback mechanism is triggered when:
1. OpenAI API is unavailable or returns an error
2. The `useFallbackImplementation` flag is set to `true`

Once triggered, all subsequent queries will use the fallback implementation until the application is restarted.

The fallback implementation uses a simple keyword matching algorithm that:
1. Splits the query into words
2. Scores each vector based on how many query words appear in its content
3. Boosts scores for certain vector types based on the query (e.g., boosting business_hours for queries about hours)
4. Returns the top-scoring vectors

## Environment Variables

- `USE_PINECONE_RAG`: Set to `true` to use Pinecone instead of the local vector store (default: `false`)
- `OPENAI_API_KEY`: Required for embedding-based retrieval (optional if using fallback only)

## Directory Structure

```
app/lib/
  ├── vector-store.ts           # Main adapter
  ├── local-vector-store.ts     # Local vector store implementation
  ├── local-vector-store-fallback.ts  # Fallback implementation
  └── pinecone-api.ts           # Pinecone integration (if used)

data/vector-store/
  ├── .gitkeep
  ├── [businessId].json         # Vector data for each business
  └── ...

scripts/
  ├── generate-test-vectors.ts  # Generate test vectors
  ├── test-local-vector-query.ts  # Test vector queries
  ├── test-vector-file.ts       # Inspect vector files
  ├── test-simple-retrieval.ts  # Test keyword retrieval
  └── test-fallback-retrieval.ts  # Test fallback mechanism
``` 