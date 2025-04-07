import mongoose, { Document, Model } from 'mongoose';
import { generateEmbedding, upsertToPinecone, deleteFromPinecone } from '../lib/pinecone-client';

// TypeScript Interfaces
interface IImageMeta {
  width: number;
  height: number;
}

interface IImage {
  access: string;
  path: string; // Will store base64 data URL
  name: string;
  type: string;
  size: number;
  mime: string;
  meta: IImageMeta;
  url: string; // Will store base64 data URL
}

export interface IBusiness extends Document {
  _id: mongoose.Types.ObjectId;
  business_name: string;
  email: string;
  password: string;
  phone: number;
  address: string;
  city: string;
  state: string;
  zip_code: number;
  Website?: string;
  description: string;
  Business_Category: string;
  Business_Subcategories: string[];
  business_features?: string[];
  services?: string[];
  location?: {
    type: string;
    coordinates: number[];
  };
  faq_question?: string;
  faq_answer?: string;
  images?: IImage[];
  createdAt: Date;
  updatedAt: Date;
  unique_id: string;
  subscription?: {
    status: 'active' | 'past_due' | 'canceled' | 'trialing';
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    current_period_end: number | null;
    canceled_at?: number | null;
  };
  is_active: boolean;
}

// Mongoose Schemas
const imageMetaSchema = new mongoose.Schema<IImageMeta>({
  width: { type: Number, required: true },
  height: { type: Number, required: true }
}, { _id: false });

const imageSchema = new mongoose.Schema<IImage>({
  access: { type: String, required: true },
  path: { 
    type: String, 
    required: true,
    maxlength: [5 * 1024 * 1024, 'Image size too large'] // Limit to ~5MB base64 string
  },
  name: { type: String, required: true },
  type: { type: String, required: true },
  size: { type: Number, required: true },
  mime: { type: String, required: true },
  meta: { type: imageMetaSchema, required: true },
  url: { 
    type: String, 
    required: true,
    maxlength: [5 * 1024 * 1024, 'Image size too large'] // Limit to ~5MB base64 string
  }
}, { _id: false });

const businessSchema = new mongoose.Schema<IBusiness>({
  business_name: { 
    type: String, 
    required: [true, 'Business name is required'],
    trim: true
  },
  unique_id: {
    type: String,
    required: [true, 'Unique ID is required'],
    unique: true,
    trim: true,
    default: function() {
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 10);
      return `business-${timestamp}-${randomString}`;
    }
  },
  email: { 
    type: String, 
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: { 
    type: String, 
    required: [true, 'Password is required']
  },
  phone: { 
    type: Number, 
    required: [true, 'Phone number is required']
  },
  address: { 
    type: String, 
    required: [true, 'Address is required'],
    trim: true
  },
  city: { 
    type: String, 
    required: [true, 'City is required'],
    trim: true
  },
  state: { 
    type: String, 
    required: [true, 'State is required'],
    trim: true,
    uppercase: true,
    minlength: 2,
    maxlength: 2
  },
  zip_code: { 
    type: Number, 
    required: [true, 'ZIP code is required'],
    min: 0,
    max: 99999
  },
  Website: { 
    type: String,
    trim: true
  },
  description: { 
    type: String, 
    required: [true, 'Business description is required'],
    trim: true,
    minlength: [10, 'Description must be at least 10 characters long']
  },
  Business_Category: { 
    type: String, 
    required: [true, 'Business category is required'],
    trim: true
  },
  Business_Subcategories: { 
    type: [String], 
    default: [],
    trim: true
  },
  business_features: { 
    type: [String],
    default: []
  },
  services: { 
    type: [String],
    default: []
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: false
    },
    coordinates: {
      type: [Number],
      required: false
    }
  },
  faq_question: { 
    type: String,
    trim: true
  },
  faq_answer: { 
    type: String,
    trim: true
  },
  images: { 
    type: [imageSchema],
    default: []
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
  subscription: {
    status: {
      type: String,
      enum: ['active', 'past_due', 'canceled', 'trialing'],
      default: 'canceled'
    },
    stripe_customer_id: {
      type: String,
      default: null
    },
    stripe_subscription_id: {
      type: String,
      default: null
    },
    current_period_end: {
      type: Number,
      default: null
    },
    canceled_at: {
      type: Number,
      default: null
    }
  },
  is_active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for better query performance
businessSchema.index({ Business_Category: 1 });
businessSchema.index({ createdAt: -1 });

// Pre-save middleware to handle password hashing if needed
businessSchema.pre('save', function(next) {
  // You can add password hashing logic here if needed
  next();
});

// Method to check if a business exists with the given email
businessSchema.statics.emailExists = async function(email: string): Promise<boolean> {
  const business = await this.findOne({ email: email.toLowerCase() });
  return !!business;
};

// Add middleware for Pinecone sync
businessSchema.post('save', async function(doc: IBusiness) {
  try {
    const businessText = `
      Business Name: ${doc.business_name}
      Category: ${doc.Business_Category}
      Description: ${doc.description}
      Subcategories: ${doc.Business_Subcategories?.join(', ')}
      Features: ${doc.business_features?.join(', ')}
      Services: ${doc.services?.join(', ')}
      Location: ${doc.address}, ${doc.city}, ${doc.state} ${doc.zip_code}
    `.trim();

    const embedding = await generateEmbedding(businessText);
    const metadata = {
      name: doc.business_name,
      category: doc.Business_Category,
      subcategories: doc.Business_Subcategories || [],
      features: doc.business_features || [],
      services: doc.services || [],
      address: doc.address,
      city: doc.city,
      state: doc.state,
      zip_code: doc.zip_code,
      phone: doc.phone,
      email: doc.email,
      website: doc.Website || '',
      coordinates: doc.location?.coordinates?.join(',') || ''
    };

    await upsertToPinecone(doc._id.toString(), embedding, metadata);
  } catch (error) {
    console.error('Error syncing business to Pinecone:', error);
  }
});

businessSchema.post('findOneAndUpdate', async function(doc: IBusiness | null) {
  if (doc) {
    try {
      const businessText = `
        Business Name: ${doc.business_name}
        Category: ${doc.Business_Category}
        Description: ${doc.description}
        Subcategories: ${doc.Business_Subcategories?.join(', ')}
        Features: ${doc.business_features?.join(', ')}
        Services: ${doc.services?.join(', ')}
        Location: ${doc.address}, ${doc.city}, ${doc.state} ${doc.zip_code}
      `.trim();

      const embedding = await generateEmbedding(businessText);
      const metadata = {
        name: doc.business_name,
        category: doc.Business_Category,
        subcategories: doc.Business_Subcategories || [],
        features: doc.business_features || [],
        services: doc.services || [],
        address: doc.address,
        city: doc.city,
        state: doc.state,
        zip_code: doc.zip_code,
        phone: doc.phone,
        email: doc.email,
        website: doc.Website || '',
        coordinates: doc.location?.coordinates?.join(',') || ''
      };

      await upsertToPinecone(doc._id.toString(), embedding, metadata);
    } catch (error) {
      console.error('Error updating business in Pinecone:', error);
    }
  }
});

businessSchema.pre('deleteOne', { document: true, query: false }, async function() {
  try {
    await deleteFromPinecone(this._id.toString());
  } catch (error) {
    console.error('Error removing business from Pinecone:', error);
  }
});

// Add support for Pinecone synchronization if enabled
if (process.env.USE_PINECONE_RAG === 'true') {
  try {
    // Import dynamically to avoid issues when this module is used on the client side
    import('../app/models/business-hooks').then(({ addPineconeSyncHooks }) => {
      console.log('Applying Pinecone hooks to Business model...');
      addPineconeSyncHooks(businessSchema);
      console.log('Successfully applied Pinecone hooks to Business model');
    }).catch(err => {
      console.error('Error applying Pinecone hooks to Business model:', err);
    });
  } catch (error) {
    console.error('Error importing Pinecone hooks for Business model:', error);
  }
}

// Export the model and return type
export const Business: Model<IBusiness> = mongoose.models.Business || mongoose.model<IBusiness>('Business', businessSchema); 