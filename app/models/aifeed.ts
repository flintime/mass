import mongoose, { Schema, Document, Types } from 'mongoose';
import { queueVectorStoreSync } from '../lib/vector-sync-service';

// Define interfaces for nested structures
interface IService {
  name: string;
  description: string;
  price: number;
  duration: number;
}

interface IFAQ {
  question: string;
  answer: string;
}

interface IPromotion {
  name: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  isFirstTimeOnly: boolean;
  validUntil: string;
  isActive: boolean;
}

interface IPaymentMethod {
  type: 'cash' | 'card' | 'online';
  enabled: boolean;
  details: string;
}

interface ICustomResponse {
  trigger: string;
  response: string;
  isActive: boolean;
}

interface IBusinessHours {
  monday?: { open: string; close: string; isOpen: boolean };
  tuesday?: { open: string; close: string; isOpen: boolean };
  wednesday?: { open: string; close: string; isOpen: boolean };
  thursday?: { open: string; close: string; isOpen: boolean };
  friday?: { open: string; close: string; isOpen: boolean };
  saturday?: { open: string; close: string; isOpen: boolean };
  sunday?: { open: string; close: string; isOpen: boolean };
}

export interface IAIFeed extends Document {
  businessId: Types.ObjectId;
  services: IService[];
  promotions: IPromotion[];
  faqs: IFAQ[];
  paymentMethods: IPaymentMethod[];
  customResponses: ICustomResponse[];
  businessHours?: IBusinessHours;
  lastUpdated: Date;
}

const AIFeedSchema: Schema = new Schema(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true },
    services: [
      {
        name: { type: String, required: true },
        description: { type: String },
        price: { type: Number, required: true },
        duration: { type: Number, required: true },
      },
    ],
    promotions: [
      {
        name: { type: String, required: true },
        description: { type: String },
        discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
        discountValue: { type: Number, required: true },
        isFirstTimeOnly: { type: Boolean, default: false },
        validUntil: { type: String },
        isActive: { type: Boolean, default: true },
      },
    ],
    faqs: [
      {
        question: { type: String, required: true },
        answer: { type: String, required: true },
      },
    ],
    paymentMethods: [
      {
        type: { type: String, enum: ['cash', 'card', 'online'], required: true },
        enabled: { type: Boolean, default: true },
        details: { type: String },
      },
    ],
    customResponses: [
      {
        trigger: { type: String, required: true },
        response: { type: String, required: true },
        isActive: { type: Boolean, default: true },
      },
    ],
    businessHours: {
      monday: { open: String, close: String, isOpen: Boolean },
      tuesday: { open: String, close: String, isOpen: Boolean },
      wednesday: { open: String, close: String, isOpen: Boolean },
      thursday: { open: String, close: String, isOpen: Boolean },
      friday: { open: String, close: String, isOpen: Boolean },
      saturday: { open: String, close: String, isOpen: Boolean },
      sunday: { open: String, close: String, isOpen: Boolean },
    },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Create a compound index on businessId to improve query performance
AIFeedSchema.index({ businessId: 1 });

// Add middleware to update vector store when AIFeed data changes
AIFeedSchema.post('save', async function() {
  try {
    const businessId = (this as IAIFeed).businessId.toString();
    console.log(`AIFeed data changed, queueing vector store sync for business ${businessId}`);
    await queueVectorStoreSync(businessId);
  } catch (error) {
    console.error(`Error queueing vector store sync after AIFeed save:`, error);
  }
});

AIFeedSchema.post('findOneAndUpdate', async function(doc) {
  if (doc) {
    try {
      const businessId = (doc as IAIFeed).businessId.toString();
      console.log(`AIFeed data updated, queueing vector store sync for business ${businessId}`);
      await queueVectorStoreSync(businessId);
    } catch (error) {
      console.error(`Error queueing vector store sync after AIFeed update:`, error);
    }
  }
});

// This captures bulk updates
AIFeedSchema.post('updateOne', async function() {
  try {
    // @ts-ignore - this has filter property but TypeScript doesn't know about it
    const filter = this.getFilter();
    if (filter && filter.businessId) {
      const businessId = filter.businessId.toString();
      console.log(`AIFeed data bulk updated, queueing vector store sync for business ${businessId}`);
      await queueVectorStoreSync(businessId);
    }
  } catch (error) {
    console.error('Error queueing vector store sync after AIFeed updateOne:', error);
  }
});

// Check if model already exists (useful for hot reloading in development)
const AIFeedModel = mongoose.models.AIFeed || mongoose.model<IAIFeed>('AIFeed', AIFeedSchema);

export default AIFeedModel; 