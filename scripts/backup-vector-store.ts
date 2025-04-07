/**
 * Vector Store Backup Script
 * 
 * This script creates a backup of the local vector store data.
 * It can be scheduled to run periodically using cron.
 */

import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';
import { createGzip } from 'zlib';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream';
import { promisify } from 'util';

// Load environment variables
config({ path: path.resolve(process.cwd(), '.env') });
config({ path: path.resolve(process.cwd(), '.env.local') });

// Define directories
const SOURCE_DIR = process.env.VECTOR_STORAGE_DIR || path.join(process.cwd(), 'data', 'vector-store');
const BACKUP_DIR = path.join(process.cwd(), 'backups', 'vector-store');

// Create timestamp for backup name
const timestamp = new Date().toISOString().replace(/:/g, '-');
const BACKUP_FILE = path.join(BACKUP_DIR, `vector-store-${timestamp}.tar.gz`);

// Promisify pipeline
const pipe = promisify(pipeline);

// Function to compress a file
async function compressFile(source: string, destination: string) {
  const sourceStream = createReadStream(source);
  const destinationStream = createWriteStream(destination);
  const gzip = createGzip();
  
  await pipe(sourceStream, gzip, destinationStream);
  console.log(`Compressed ${source} to ${destination}`);
}

// Function to compress a directory
async function compressDirectory(sourceDir: string, destFile: string) {
  const { exec } = require('child_process');
  const util = require('util');
  const execAsync = util.promisify(exec);
  
  await execAsync(`tar -czf ${destFile} -C ${path.dirname(sourceDir)} ${path.basename(sourceDir)}`);
  console.log(`Compressed directory ${sourceDir} to ${destFile}`);
}

// Main function
async function runBackup() {
  try {
    console.log(`Starting vector store backup at ${new Date().toISOString()}`);
    
    // Ensure the source directory exists
    if (!fs.existsSync(SOURCE_DIR)) {
      console.error(`Source directory ${SOURCE_DIR} does not exist. Nothing to backup.`);
      process.exit(1);
    }
    
    // Create backup directory if it doesn't exist
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
      console.log(`Created backup directory at ${BACKUP_DIR}`);
    }
    
    // Compress the directory
    await compressDirectory(SOURCE_DIR, BACKUP_FILE);
    
    // Get the size of the backup file
    const stats = fs.statSync(BACKUP_FILE);
    const fileSizeInBytes = stats.size;
    const fileSizeInMegabytes = fileSizeInBytes / (1024 * 1024);
    console.log(`Backup file size: ${fileSizeInMegabytes.toFixed(2)} MB`);
    
    // Cleanup old backups (keep last 5)
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.startsWith('vector-store-') && file.endsWith('.tar.gz'))
      .map(file => path.join(BACKUP_DIR, file))
      .sort((a, b) => fs.statSync(b).mtime.getTime() - fs.statSync(a).mtime.getTime());
    
    if (files.length > 5) {
      const filesToDelete = files.slice(5);
      
      for (const file of filesToDelete) {
        fs.unlinkSync(file);
        console.log(`Deleted old backup: ${file}`);
      }
    }
    
    console.log(`Vector store backup completed successfully. Saved to ${BACKUP_FILE}`);
    process.exit(0);
  } catch (error) {
    console.error('Error during backup:', error);
    process.exit(1);
  }
}

// Run the backup
runBackup(); 