import mongoose, { Schema, Document } from 'mongoose';
import { queueVectorStoreSync } from '../lib/vector-sync-service';

export interface IBusiness extends Document {
  business_name: string;
  description?: string;
  Business_Category?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  subscription_status?: 'active' | 'inactive' | 'cancelled';
  subscription_start?: Date;
  subscription_end?: Date;
  visible?: boolean;
  // Add other business fields as needed
}

const BusinessSchema: Schema = new Schema(
  {
    business_name: { type: String, required: true },
    description: { type: String },
    Business_Category: { type: String },
    address: { type: String },
    phone: { type: String },
    email: { type: String },
    website: { type: String },
    stripe_customer_id: { type: String },
    stripe_subscription_id: { type: String },
    subscription_status: { type: String, enum: ['active', 'inactive', 'cancelled'] },
    subscription_start: { type: Date },
    subscription_end: { type: Date },
    visible: { type: Boolean },
    // Add other business fields as needed
  },
  { timestamps: true }
);

// Add middleware to update vector store when business data changes
BusinessSchema.post('save', async function(this: IBusiness) {
  try {
    console.log(`Business data changed, queueing vector store sync for business ${this._id}`);
    await queueVectorStoreSync(this._id.toString());
  } catch (error) {
    console.error(`Error queueing vector store sync for business ${this._id}:`, error);
    // Don't throw the error to avoid blocking the save operation
  }
});

BusinessSchema.post('findOneAndUpdate', async function(doc: IBusiness | null) {
  if (doc) {
    try {
      console.log(`Business data updated, queueing vector store sync for business ${doc._id}`);
      await queueVectorStoreSync(doc._id.toString());
    } catch (error) {
      console.error(`Error queueing vector store sync for business ${doc._id}:`, error);
    }
  }
});

// This ensures we catch bulk updates too
BusinessSchema.post('updateOne', async function() {
  try {
    // @ts-ignore - this has filter property but TypeScript doesn't know about it
    const filter = this.getFilter();
    if (filter && filter._id) {
      const businessId = filter._id.toString();
      console.log(`Business data bulk updated, queueing vector store sync for business ${businessId}`);
      await queueVectorStoreSync(businessId);
    }
  } catch (error) {
    console.error('Error queueing vector store sync after updateOne:', error);
  }
});

// Similarly for updateMany
BusinessSchema.post('updateMany', async function() {
  try {
    // For updateMany, we would need to fetch all affected IDs
    // This could be expensive, so consider if you really need real-time updates for mass updates
    console.log('Business data bulk updated with updateMany, consider running full sync');
    // Potentially trigger a background job to sync all affected businesses
  } catch (error) {
    console.error('Error after updateMany:', error);
  }
});

// Check if model already exists (useful for hot reloading in development)
const BusinessModel = mongoose.models.Business || mongoose.model<IBusiness>('Business', BusinessSchema);

export default BusinessModel; 