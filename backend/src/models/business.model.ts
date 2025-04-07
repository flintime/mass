import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IPreferences {
  emailNotifications: boolean;
  appointmentReminders: boolean;
  marketingEmails: boolean;
  autoConfirm: boolean;
  displayInSearch: boolean;
}

export interface IImage {
  url: string;
}

export interface IBusiness extends mongoose.Document {
  business_name: string;
  unique_id: string;
  email: string;
  password: string;
  phone: number;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  Website?: string;
  description: string;
  Business_Category: string;
  Business_Subcategories: string[];
  business_features?: string[];
  services: string[];
  images: IImage[];
  latitude?: number;
  longitude?: number;
  location?: {
    type: string;
    coordinates: number[];
  };
  faq_question?: string;
  faq_answer?: string;
  faqs?: Array<{
    question: string;
    answer: string;
  }>;
  preferences?: IPreferences;
  consentRecords?: {
    termsAndConditions: { accepted: boolean; timestamp: Date; };
    aiAcknowledgment: { accepted: boolean; timestamp: Date; };
  };
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  created_at: Date;
  years_in_business?: string;
  subscription_status?: string;
  subscription_start?: number;
  subscription_end?: number;
  stripe_subscription_id?: string;
  stripe_customer_id?: string;
  visible?: boolean;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const businessSchema = new mongoose.Schema({
  business_name: {
    type: String,
    required: true,
    trim: true
  },
  unique_id: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v: string) {
        return /^[a-z0-9_.]{3,30}$/.test(v);
      },
      message: 'Unique ID must be 3-30 characters and can contain only letters, numbers, dots, and underscores'
    }
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  phone: {
    type: Number,
    required: true
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
    validate: {
      validator: function(v: string) {
        return /^\d{5}$/.test(v);
      },
      message: 'ZIP code must be exactly 5 digits'
    }
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
  services: [{
    type: String,
    trim: true,
    default: []
  }],
  images: [{
    url: {
      type: String,
      trim: true
    }
  }],
  years_in_business: {
    type: String,
    trim: true
  },
  latitude: {
    type: Number
  },
  longitude: {
    type: Number
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: function(v: number[]) {
          return Array.isArray(v) && v.length === 2 &&
                 typeof v[0] === 'number' && typeof v[1] === 'number' &&
                 !isNaN(v[0]) && !isNaN(v[1]);
        },
        message: 'Location coordinates must be an array of two numbers [longitude, latitude]'
      }
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
  faqs: [{
    question: {
      type: String,
      trim: true
    },
    answer: {
      type: String,
      trim: true
    }
  }],
  preferences: {
    type: {
      emailNotifications: { type: Boolean, default: true },
      appointmentReminders: { type: Boolean, default: true },
      marketingEmails: { type: Boolean, default: false },
      autoConfirm: { type: Boolean, default: false },
      displayInSearch: { type: Boolean, default: true }
    },
    default: {}
  },
  consentRecords: {
    type: {
      termsAndConditions: {
        accepted: {
          type: Boolean,
          required: true
        },
        timestamp: {
          type: Date,
          default: Date.now
        }
      },
      aiAcknowledgment: {
        accepted: {
          type: Boolean,
          required: true
        },
        timestamp: {
          type: Date,
          default: Date.now
        }
      }
    },
    default: {
      termsAndConditions: {
        accepted: false,
        timestamp: null
      },
      aiAcknowledgment: {
        accepted: false,
        timestamp: null
      }
    }
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  created_at: {
    type: Date,
    default: Date.now
  },
  subscription_status: {
    type: String,
    enum: ['active', 'inactive', 'trial', 'cancelled', 'past_due'],
    default: 'inactive'
  },
  subscription_start: {
    type: Number,
    default: null
  },
  subscription_end: {
    type: Number,
    default: null
  },
  stripe_subscription_id: {
    type: String,
    sparse: true,
    index: true
  },
  stripe_customer_id: {
    type: String,
    sparse: true,
    index: true
  },
  visible: {
    type: Boolean,
    default: false,
    index: true
  }
});

// Add a 2dsphere index for geospatial queries
businessSchema.index({ location: '2dsphere' });

// Add index for subscription status for faster queries
businessSchema.index({ subscription_status: 1 });

// Hash password before saving
businessSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    console.error('Error hashing password:', error);
    next(error);
  }
});

// Method to compare password
businessSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    console.error('Error comparing passwords:', error);
    return false;
  }
};

// Add services to the response when converting to JSON
businessSchema.set('toJSON', {
  transform: function(doc, ret) {
    ret.services = ret.services || [];
    return ret;
  }
});

export const Business = mongoose.model<IBusiness>('Business', businessSchema);
export default Business; 