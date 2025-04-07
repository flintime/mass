import mongoose, { Schema, Document } from 'mongoose';
const { syncBusinessToPinecone, deleteBusinessFromPinecone, updateBusinessInPinecone } = require('@/app/lib/pinecone-sync');

export interface IBusiness extends Document {
  business_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  Website?: string;
  description: string;
  Business_Category: string;
  Business_Subcategories: string[];
  business_features?: string[];
  images: { url: string }[];
  latitude?: number;
  longitude?: number;
  location?: {
    type: string;
    coordinates: number[];
  };
  faq_question?: string;
  faq_answer?: string;
  created_at: Date;
  services: string[];
  isAIEnabled: boolean;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  subscription_status?: 'active' | 'cancelled' | 'past_due' | 'incomplete';
  subscription_start?: Date;
  subscription_end?: Date;
  visible?: boolean;
}

const businessSchema = new Schema<IBusiness>({
  business_name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  state: {
    type: String,
    required: true,
    trim: true
  },
  zip_code: {
    type: String,
    required: true,
    trim: true
  },
  Website: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  Business_Category: {
    type: String,
    required: true,
    trim: true
  },
  Business_Subcategories: {
    type: [String],
    default: [],
    trim: true
  },
  business_features: [{
    type: String,
    trim: true
  }],
  images: [{
    url: {
      type: String,
      required: true
    }
  }],
  latitude: Number,
  longitude: Number,
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    }
  },
  faq_question: String,
  faq_answer: String,
  services: {
    type: [String],
    default: [],
    trim: true
  },
  isAIEnabled: {
    type: Boolean,
    default: true
  },
  stripe_customer_id: String,
  stripe_subscription_id: String,
  subscription_status: {
    type: String,
    enum: ['active', 'cancelled', 'past_due', 'incomplete'],
    default: 'incomplete'
  },
  subscription_start: Date,
  subscription_end: Date,
  visible: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Create indexes
businessSchema.index({ location: '2dsphere' });
// Create text index on relevant fields
businessSchema.index({ 
  business_name: 'text', 
  description: 'text', 
  Business_Category: 'text',
  Business_Subcategories: 'text',
  business_features: 'text'
}, {
  weights: {
    business_name: 10,
    Business_Category: 5,
    Business_Subcategories: 4,
    business_features: 3,
    description: 2
  },
  name: "business_text_search"
});
businessSchema.index({ Business_Category: 1 });
businessSchema.index({ Business_Subcategories: 1 });

// Add middleware for Pinecone sync
businessSchema.post('save', async function(doc: IBusiness) {
  try {
    await syncBusinessToPinecone(doc);
  } catch (error) {
    console.error('Error syncing new business to Pinecone:', error);
  }
});

businessSchema.post('findOneAndUpdate', async function(doc: IBusiness | null) {
  if (doc) {
    try {
      await updateBusinessInPinecone(doc);
    } catch (error) {
      console.error('Error updating business in Pinecone:', error);
    }
  }
});

businessSchema.pre('deleteOne', { document: true, query: false }, async function() {
  try {
    await deleteBusinessFromPinecone(this._id);
  } catch (error) {
    console.error('Error removing business from Pinecone:', error);
  }
});

// Check if the model already exists to prevent OverwriteModelError
export default mongoose.models.Business || mongoose.model<IBusiness>('Business', businessSchema); 