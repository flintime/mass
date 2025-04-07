import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

interface IImageMeta {
  width: number;
  height: number;
}

interface IImage {
  access: string;
  path: string;
  name: string;
  type: string;
  size: number;
  mime: string;
  meta: IImageMeta;
  url: string;
}

interface IPreferences {
  emailNotifications: boolean;
  appointmentReminders: boolean;
  marketingEmails: boolean;
  chatNotifications: boolean;
  soundEnabled: boolean;
}

export interface IBusiness extends Document {
  email: string;
  business_name: string;
  password: string;
  visible: boolean;
  is_active: boolean;
  subscription_status: 'active' | 'inactive' | 'trial' | 'cancelled' | 'past_due';
  subscription_start?: Date;
  subscription_end?: Date;
  stripe_subscription_id?: string;
  stripe_customer_id?: string;
  trialEndsAt?: Date;
  trialEndNotificationSent?: boolean;
  createdAt: Date;
  updatedAt: Date;
  description: string;
  Business_Category: string;
  Business_Subcategories: string[];
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  Website?: string;
  images: { url: string }[];
  business_features?: string[];
  services?: string[];
  rating?: number;
  totalReviews?: number;
  location?: {
    type: string;
    coordinates: [number, number];
  };
  faq_question?: string;
  faq_answer?: string;
}

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

const preferencesSchema = new mongoose.Schema({
  emailNotifications: { type: Boolean, default: true },
  appointmentReminders: { type: Boolean, default: true },
  marketingEmails: { type: Boolean, default: false },
  chatNotifications: { type: Boolean, default: true },
  soundEnabled: { type: Boolean, default: true }
}, { _id: false });

const businessSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  business_name: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  visible: {
    type: Boolean,
    default: false,
  },
  is_active: {
    type: Boolean,
    default: false,
  },
  subscription_status: {
    type: String,
    enum: ['active', 'inactive', 'trial', 'cancelled', 'past_due'],
    default: 'inactive',
  },
  subscription_start: {
    type: Date,
  },
  subscription_end: {
    type: Date,
  },
  stripe_subscription_id: {
    type: String,
  },
  stripe_customer_id: {
    type: String,
  },
  trialEndsAt: {
    type: Date,
  },
  trialEndNotificationSent: {
    type: Boolean,
    default: false,
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
  Business_Subcategories: [{
    type: String,
    trim: true
  }],
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
  phone: {
    type: String,
    required: true,
    trim: true
  },
  Website: {
    type: String,
    trim: true
  },
  images: [{
    url: {
      type: String,
      required: true
    }
  }],
  business_features: [{
    type: String,
    trim: true
  }],
  services: [{
    type: String,
    trim: true
  }],
  rating: {
    type: Number,
    min: 0,
    max: 5
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
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
}, {
  timestamps: true
});

// Add indexes for better query performance
businessSchema.index({ business_name: 'text', description: 'text' });
businessSchema.index({ location: '2dsphere' });

// Add indexes for frequently queried fields
businessSchema.index({ email: 1 });
businessSchema.index({ subscription_status: 1 });
businessSchema.index({ visible: 1 });
businessSchema.index({ stripe_customer_id: 1 });
businessSchema.index({ stripe_subscription_id: 1 });

// Hash password before saving
businessSchema.pre('save', async function(next) {
  const business = this;
  
  if (!business.isModified('password') || !business.password) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    business.password = await bcrypt.hash(business.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Compare password method
businessSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Method to check if a business exists with the given email
businessSchema.statics.emailExists = async function(email: string): Promise<boolean> {
  const business = await this.findOne({ email: email.toLowerCase() });
  return !!business;
};

// Don't return password in queries
businessSchema.set('toJSON', {
  transform: function (doc, ret) {
    delete ret.password;
    return ret;
  },
});

const Business = (mongoose.models.Business as mongoose.Model<IBusiness>) || mongoose.model<IBusiness>(.Business., businessSchema);

export default Business; 