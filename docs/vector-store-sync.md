# Real-Time Vector Store Synchronization

This document describes the real-time synchronization system between MongoDB and the vector store. This system ensures that changes made in the business profiles and Feed AI interface are immediately reflected in AI responses.

## Architecture Overview

The synchronization system consists of these key components:

1. **Mongoose Middleware**: Hooks that detect changes to business and AI feed data
2. **Vector Sync Service**: Queue system that manages sync operations with error handling and retries
3. **Admin Monitoring**: UI and API for monitoring and managing sync operations
4. **Local Vector Store**: File-based storage that maintains vector embeddings

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   MongoDB       │     │  Vector Sync    │     │  Vector Store   │
│  (Business &    │────▶│    Service      │────▶│   (Local or     │
│   AI Feed Data) │     │  (Queue System) │     │    Pinecone)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         ▲                      │                        │
         │                      │                        │
         │                      ▼                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Profile &     │     │  Admin Vector   │     │   AI Chat &     │
│  Feed AI Pages  │     │  Sync Manager   │     │  Search Pages   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## How It Works

### 1. Change Detection

When business or AI feed data is updated through the application:

- Mongoose middleware in `app/models/business.ts` and `app/models/aifeed.ts` detect changes
- These middleware hooks trigger the sync process by calling `queueVectorStoreSync(businessId)`

### 2. Queue Management

The Vector Sync Service (`app/lib/vector-sync-service.ts`) handles:

- Queuing sync requests to prevent overlapping operations
- Processing the queue in the background
- Error handling with retry logic
- Tracking sync statistics

### 3. Vector Store Update

The actual vector store update:

- Reads the latest business data from MongoDB
- Converts it to vector embeddings using OpenAI's embedding API
- Stores the vectors in the local vector store (or Pinecone if configured)

### 4. Fallback Mechanism

If the OpenAI API is unavailable:

- Embedding generation fails gracefully
- A keyword-based retrieval system takes over
- The application continues to function without embeddings

## Configuration

The system uses these environment variables:

- `USE_PINECONE_RAG`: Set to `true` to use Pinecone instead of local storage (default: `false`)
- `OPENAI_API_KEY`: Required for embedding generation

## Admin Management

Administrators can monitor and manage the sync process:

1. **Vector Sync Manager**: UI component at `app/components/admin/VectorSyncManager.tsx`
2. **Admin API**: Endpoints at `app/api/admin/vector-sync/route.ts`

Features include:

- Viewing sync queue and statistics
- Manually triggering syncs for specific businesses
- Retrying failed syncs

## Testing

To test the real-time synchronization:

```bash
# Run the test script
npx tsx scripts/test-vector-sync.ts

# Optionally specify a business ID
BUSINESS_ID=your_business_id npx tsx scripts/test-vector-sync.ts
```

## Troubleshooting

### Common Issues

1. **Sync Queue Growing**: If the sync queue keeps growing, check:
   - MongoDB connection issues
   - OpenAI API rate limits
   - Server resource constraints

2. **Failed Syncs**: If syncs fail repeatedly:
   - Check the error logs
   - Verify OpenAI API key is valid
   - Ensure business IDs exist in MongoDB

3. **Vector Store Not Updated**: If changes don't appear in search/chat:
   - Verify middleware is correctly installed
   - Check if vector store files exist in `data/vector-store/`
   - Look for MongoDB schema validation errors

### Manual Sync

If automatic sync isn't working, manually trigger a sync:

1. Using the Admin UI
2. Via API: `POST /api/admin/vector-sync` with `{ "businessId": "your_id" }`
3. Using the command line: `BUSINESS_ID=your_id npx tsx scripts/sync-vector-store.ts`

## Unified Vector Storage

The system now uses a single vector storage implementation for both search and chat functionality:

### Before the Update

- **Chat/RAG System**: Used local vector storage when `USE_PINECONE_RAG=false`
- **Search System**: Directly used Pinecone regardless of the `USE_PINECONE_RAG` setting

This inconsistency meant that:
1. Business data needed to be synchronized to two different storage systems
2. Search results could differ from chat context retrieval for the same query
3. If Pinecone was unavailable, search would fail even if chat was still functioning

### After the Update

Both search and chat now use the same vector storage system:

1. **Unified Adapter**: The `vectorStore` adapter in `app/lib/vector-store.ts` now handles both:
   - Individual business context retrieval for chat
   - Cross-business search for the search functionality

2. **Consistent Embedding Model**: Both systems use the `text-embedding-3-small` model

3. **Shared Fallback Mechanism**: If OpenAI embedding generation fails, both systems fall back to the same keyword-based retrieval

4. **Single Source of Truth**: Business data is synchronized to a single location

### Implementation Details

The following files were updated:

1. `app/lib/embeddings.ts`:
   - Now uses the `getEmbedding` function from `vector-store.ts`
   - Uses the vectorStore adapter for search operations

2. `app/api/search/route.ts`:
   - Removed direct Pinecone references
   - Uses the updated `searchBusinesses` function

3. `app/lib/vector-store.ts`:
   - Added a new `searchAcrossBusinesses` function for global search
   - This function searches through all business vector files

### Benefits

- **Consistency**: Search results match chat context retrieval
- **Reliability**: If local vector storage works for chat, it also works for search
- **Simplicity**: A single synchronization process keeps everything up to date
- **Performance**: Local vector storage is faster than API calls to Pinecone

### How to Test

1. Make a change to a business profile
2. Wait for the automatic synchronization (or trigger it manually)
3. Verify both:
   - Search results include the updated information
   - Chat responses include the updated information

### Troubleshooting

If search functionality is working but returning outdated results:

1. Verify the vector synchronization service is running (`npm run vector:sync:status`)
2. Check vector store logs for error messages
3. Manually trigger a sync for the specific business (`npm run vector:sync -- --business <BUSINESS_ID>`) 