module.exports = {
  apps: [
    {
      name: 'vector-store-sync',
      script: 'npx',
      args: 'tsx scripts/sync-vector-store.ts',
      instances: 1,
      autorestart: false,
      watch: false,
      cron_restart: '0 * * * *', // Run every hour
      env: {
        NODE_ENV: 'production',
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: 'logs/vector-store-sync-error.log',
      out_file: 'logs/vector-store-sync-out.log',
      merge_logs: true,
      // Disable by default in DO App Platform
      disabled: process.env.ENABLE_VECTOR_SYNC !== 'true' && process.env.DO_APP_PLATFORM === 'true',
    },
    {
      name: 'vector-store-backup',
      script: 'npx',
      args: 'tsx scripts/backup-vector-store.ts',
      instances: 1,
      autorestart: false,
      watch: false,
      cron_restart: '0 0 * * *', // Run daily at midnight
      env: {
        NODE_ENV: 'production',
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: 'logs/vector-store-backup-error.log',
      out_file: 'logs/vector-store-backup-out.log',
      merge_logs: true,
      // Disable by default in DO App Platform
      disabled: process.env.ENABLE_VECTOR_BACKUP !== 'true' && process.env.DO_APP_PLATFORM === 'true',
    },
    // Pinecone sync has been removed in favor of LocalVectorStore
    // {
    //   name: 'pinecone-sync',
    //   script: 'npx',
    //   args: 'tsx scripts/sync-pinecone.ts',
    //   instances: 1,
    //   autorestart: false,
    //   watch: false,
    //   cron_restart: '0 * * * *', // Run every hour
    //   env: {
    //     NODE_ENV: 'production',
    //     USE_PINECONE_RAG: 'true',
    //   },
    //   log_date_format: 'YYYY-MM-DD HH:mm:ss',
    //   error_file: 'logs/pinecone-sync-error.log',
    //   out_file: 'logs/pinecone-sync-out.log',
    //   merge_logs: true,
    //   disabled: true, // Disabled by default
    // },
  ],
}; 