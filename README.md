# Flintime

## Digital Ocean Spaces Integration

The application now uses Digital Ocean Spaces for storing review images. This provides:

- Scalable cloud storage for user-uploaded images
- Improved performance with CDN capabilities
- Reduced server load and storage requirements

For detailed documentation, see [Digital Ocean Spaces Integration](./docs/digital-ocean-spaces.md).

### Configuration

To use Digital Ocean Spaces, add the following to your `.env` file:

```
SPACES_ENDPOINT=nyc3.digitaloceanspaces.com
SPACES_KEY=your_spaces_key
SPACES_SECRET=your_spaces_secret
SPACES_BUCKET=your_bucket_name
SPACES_REGION=nyc3
```

Replace the placeholder values with your actual Digital Ocean Spaces credentials.

# Vector Store Configuration

The application uses vector embeddings to store business data for semantic search and retrieval in the AI chat system. You can choose between Pinecone (cloud-based) or a local vector store.

## Local Vector Store

The application includes a local vector store implementation that doesn't require any external services. This is the default option.

### Configuration

To configure the local vector store, add the following to your `.env` file:

```
# Local Vector Store Configuration
USE_PINECONE_RAG=false
VECTOR_STORAGE_DIR=./data/vector-store
```

### Synchronization

Sync your business data to the local vector store:

```bash
# Run the sync script
npx tsx scripts/sync-vector-store.ts

# Or use the API endpoint
curl -X POST http://your-domain/api/admin/sync-vector-store
```

### Backup

Create a backup of your vector store data:

```bash
npx tsx scripts/backup-vector-store.ts
```

## Pinecone Vector Database (Alternative)

Alternatively, you can use Pinecone as a cloud-based vector database instead of the local option.

### Configuration

1. Ensure your `.env` file contains the required Pinecone configuration:
   ```
   PINECONE_API_KEY=your-api-key
   PINECONE_INDEX=your-index-name
   USE_PINECONE_RAG=true
   ```

2. Run the initial sync to populate Pinecone with your business data:
   ```bash
   npx tsx scripts/sync-pinecone.ts
   ```

## Scheduled Synchronization

Set up automatic synchronization using PM2:

```bash
# Install PM2 if not already installed
npm install -g pm2

# Start the scheduled task
pm2 start ecosystem.config.js

# Save the PM2 configuration
pm2 save

# Generate startup command (copy and run the command it outputs)
pm2 startup
```

This will run the vector store synchronization hourly to ensure all business data is up-to-date.

## Manual Synchronization

You can manually trigger a synchronization:

```bash
# For local vector store
npx tsx scripts/sync-vector-store.ts

# For Pinecone
npx tsx scripts/sync-pinecone.ts

# Or use the API endpoint
curl -X POST http://your-domain/api/admin/sync-vector-store
```

You can also sync a specific business:
```bash
curl -X POST http://your-domain/api/admin/sync-vector-store \
  -H "Content-Type: application/json" \
  -d '{"businessId": "your-business-id"}'
```

## Troubleshooting

If you encounter issues with the synchronization:

1. Check the logs:
   ```bash
   cat logs/vector-store-sync.log
   ```

2. Test the vector store:
   ```bash
   npx tsx scripts/test-vector-store.ts
   ```

3. Verify PM2 status:
   ```bash
   pm2 status
   pm2 logs vector-store-sync
   ```

For more detailed information, see the [Pinecone Synchronization Documentation](docs/pinecone-sync.md).

# Vector Store Migration: Pinecone to LocalVectorStore

## Overview

This project has been updated to use a local vector store implementation instead of Pinecone. This change simplifies the architecture and reduces external dependencies.

## Changes Made

1. **Removed Pinecone Dependencies**:
   - Removed `@pinecone-database/pinecone` from package.json
   - Disabled Pinecone-related environment variables
   - Commented out Pinecone sync in ecosystem.config.js

2. **LocalVectorStore Implementation**:
   - Using the existing `app/lib/local-vector-store.ts` for all vector operations
   - Created new scripts for initializing, inspecting, and debugging the local vector store
   - Updated all API routes to use LocalVectorStore instead of Pinecone

3. **Updated Scripts**:
   - `npm run rag:local:init` - Initialize the local vector store
   - `npm run rag:local:inspect` - Inspect the contents of the local vector store
   - `npm run rag:local:debug` - Debug search functionality with the local vector store

## Benefits

- **Simplified Architecture**: No need to manage external vector database
- **Reduced Costs**: No subscription fees for Pinecone
- **Improved Development Experience**: Easier to debug and test locally
- **Faster Development Cycles**: No network latency for vector operations

## How to Use

1. **Initialize the Local Vector Store**:
   ```
   npm run rag:local:init
   ```

2. **Inspect the Local Vector Store**:
   ```
   npm run rag:local:inspect [businessId]
   ```

3. **Debug Search Functionality**:
   ```
   npm run rag:local:debug [businessId] "your search query"
   ```

## Storage Location

The local vector store data is stored in the `data/vector-store` directory at the project root.

## Digital Ocean App Platform Deployment

The application is configured for deployment on Digital Ocean App Platform. The deployment configuration is in the `.do/app.yaml` file.

### Deployment Configuration

- The application uses MongoDB for database storage.
- Vector store operations are disabled by default in the Digital Ocean App Platform environment.
- Required directories are automatically created during deployment.

### Enabling Vector Store Operations

If you want to enable vector store operations (syncing and backup) in the Digital Ocean App Platform environment, set these environment variables:

- `ENABLE_VECTOR_SYNC=true` - To enable vector store sync operations
- `ENABLE_VECTOR_BACKUP=true` - To enable vector store backup operations

### Troubleshooting Deployment

If you encounter deployment issues, check:

1. Make sure all required environment variables are configured in the App Platform dashboard
2. Verify that MongoDB connection string is correct
3. Ensure that the application has proper permissions to create and write to directories
4. Check the application logs in the Digital Ocean dashboard 