/**
 * Business model hooks for Pinecone synchronization
 * This file adds the necessary hooks to the business model to keep Pinecone in sync
 */

import mongoose from 'mongoose';
import { syncBusinessToPinecone, deleteBusinessFromPinecone, updateBusinessInPinecone } from '../lib/pinecone-sync';

/**
 * Add Pinecone synchronization hooks to a mongoose schema
 * 
 * @param schema The mongoose schema to add hooks to
 */
export function addPineconeSyncHooks(schema: mongoose.Schema) {
  // After saving a business, sync it to Pinecone
  schema.post('save', async function(doc: any) {
    try {
      const businessId = doc._id.toString();
      await syncBusinessToPinecone(businessId);
    } catch (error) {
      console.error('Error syncing new business to Pinecone:', error);
    }
  });

  // After updating a business, sync the changes to Pinecone
  schema.post('findOneAndUpdate', async function(doc: any) {
    if (doc) {
      try {
        const businessId = doc._id.toString();
        await updateBusinessInPinecone(businessId);
      } catch (error) {
        console.error('Error updating business in Pinecone:', error);
      }
    }
  });

  // Define interface for document with _id
  interface DocumentWithId {
    _id: {
      toString(): string;
    };
  }

  // Before deleting a business, remove it from Pinecone
  schema.pre('deleteOne', { document: true, query: false }, async function() {
    try {
      // Cast this to DocumentWithId type to safely access _id
      const doc = this as unknown as DocumentWithId;
      if (doc && doc._id) {
        const businessId = doc._id.toString();
        await deleteBusinessFromPinecone(businessId);
      } else {
        console.error('Document does not have an _id property');
      }
    } catch (error) {
      console.error('Error removing business from Pinecone:', error);
    }
  });
}

/**
 * Add hooks to sync AI feed data to Pinecone
 * 
 * @param schema The AI feed schema to add hooks to
 */
export function addAIFeedSyncHooks(schema: mongoose.Schema) {
  // After saving or updating AI feed data, sync the business to Pinecone
  schema.post('save', async function(doc: any) {
    try {
      const businessId = doc.businessId.toString();
      await syncBusinessToPinecone(businessId);
    } catch (error) {
      console.error('Error syncing AI feed data to Pinecone:', error);
    }
  });

  schema.post('findOneAndUpdate', async function(doc: any) {
    if (doc) {
      try {
        const businessId = doc.businessId.toString();
        await updateBusinessInPinecone(businessId);
      } catch (error) {
        console.error('Error updating AI feed data in Pinecone:', error);
      }
    }
  });
} 